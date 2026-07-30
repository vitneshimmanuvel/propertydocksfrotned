/* -------------------------------------------------------------
 * AEROSTAGE Vectorizer & CAD Contour-Tracing Engine
 * Implements client-side binary thresholding, Moore-Neighbor contour tracing,
 * Ramer-Douglas-Peucker simplification, and Ray-Casting containment checks.
 * ------------------------------------------------------------- */

class VectorizerEngine {
    constructor() {
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    }

    // Main entrance point: takes image file, triggers canvas binarization,
    // contour tracing, polygon simplification, and pair-matches OCR text labels.
    async vectorize(imageSrc, options = {}) {
        const defaults = {
            threshold: 130,      // Line thickness/darkness threshold (0-255)
            dilation: 2,         // Morphological line dilation/widening thickness (1-5px)
            simplify: 5.0,       // RDP tolerance factor (high = fewer vertices)
            minArea: 50,         // Ignore tiny speckle noise
            maxArea: 8000,       // Ignore total background bounds/frames
            gridSize: 6,         // Sampling density (lower = higher quality, slower)
            ocrWords: []         // List of [{ text, x, y }] extracted by OCR
        };
        const config = { ...defaults, ...options };

        // 1. Load image onto canvas
        const img = await this.loadImage(imageSrc);
        const origWidth = img.width;
        const origHeight = img.height;

        // Scale canvas bounds to balance performance & accuracy (max width 2000 for better contour detection)
        const scale = Math.min(2000 / origWidth, 1.0);
        const canvasW = Math.round(origWidth * scale);
        const canvasH = Math.round(origHeight * scale);
        this.canvas.width = canvasW;
        this.canvas.height = canvasH;
        this.ctx.drawImage(img, 0, 0, canvasW, canvasH);

        // Helper to determine average luminance inside an OCR bounding box
        const getBBoxLuminance = (w) => {
            if (!w.bbox) return 255;
            const x0 = Math.max(0, Math.round(w.bbox.x0 * scale));
            const y0 = Math.max(0, Math.round(w.bbox.y0 * scale));
            const wBox = Math.max(1, Math.round((w.bbox.x1 - w.bbox.x0) * scale));
            const hBox = Math.max(1, Math.round((w.bbox.y1 - w.bbox.y0) * scale));
            
            try {
                const imgData = this.ctx.getImageData(x0, y0, wBox, hBox);
                const data = imgData.data;
                let sum = 0;
                for (let i = 0; i < data.length; i += 4) {
                    sum += 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
                }
                return sum / (wBox * hBox);
            } catch (e) {
                return 255;
            }
        };

        // Draw solid background-colored rectangles over all OCR-detected text bounding boxes
        // to prevent text from creating gaps/holes in plots or floating plots in roadways
        if (config.ocrWords && config.ocrWords.length > 0) {
            config.ocrWords.forEach(w => {
                if (w.bbox) {
                    const lum = getBBoxLuminance(w);
                    // If the box is dark (e.g. road band), fill it with black.
                    // If the box is light (e.g. plot area), fill it with white.
                    this.ctx.fillStyle = lum < 120 ? "#000000" : "#ffffff";
                    
                    const pad = 4; // slight padding to ensure we completely cover the text edges
                    const x0 = Math.max(0, Math.round(w.bbox.x0 * scale) - pad);
                    const y0 = Math.max(0, Math.round(w.bbox.y0 * scale) - pad);
                    const wBox = Math.round((w.bbox.x1 - w.bbox.x0) * scale) + 2 * pad;
                    const hBox = Math.round((w.bbox.y1 - w.bbox.y0) * scale) + 2 * pad;
                    this.ctx.fillRect(x0, y0, wBox, hBox);
                }
            });
        }

        // 2. Perform Grayscale & Binarization
        const imgData = this.ctx.getImageData(0, 0, canvasW, canvasH);
        const binaryGrid = this.binarize(imgData, config.threshold, config.dilation);

        // 3. Dynamic minimum area filter based on SVG coordinate space
        //    Filters out tiny noise regions (text chars, line gaps) while keeping real plots
        const svgArea = config.bgWidth * config.bgHeight;
        const dynamicMinArea = Math.max(config.minArea, svgArea * 0.00008);

        // 4. Pre-filter OCR words to only plot-number-like text
        //    and transform coordinates from ORIGINAL image pixel space → SVG space
        //    CRITICAL FIX: OCR returns coords in original image resolution,
        //    NOT in scaled canvas resolution. We must divide by origWidth/origHeight.
        const hasOcr = config.ocrWords && config.ocrWords.length > 0;
        const plotOcrWords = [];
        if (hasOcr) {
            config.ocrWords.forEach(w => {
                const text = w.text.trim();
                // Broadened regex: matches "Plot 1", "P-1", "lot.2", "No.3", "PL-4", "23", "123A" etc.
                const match = text.match(/^(?:plot|lot|no|p|l|pl)?[-.:\s]*(\d{1,4}[A-Za-z]?)$/i);
                if (match) {
                    plotOcrWords.push({
                        text: `PLOT ${match[1]}`,
                        svgX: config.bgX + (w.x / origWidth) * config.bgWidth,
                        svgY: config.bgY + (w.y / origHeight) * config.bgHeight,
                        confidence: w.confidence || 50
                    });
                }
            });
            
            // Fallback: also match bare standalone numbers (1-4 digits) that didn't match above
            // These are common in CAD layouts where plot numbers have no prefix
            config.ocrWords.forEach(w => {
                const text = w.text.trim();
                if (/^\d{1,4}[A-Za-z]?$/.test(text)) {
                    const svgX = config.bgX + (w.x / origWidth) * config.bgWidth;
                    const svgY = config.bgY + (w.y / origHeight) * config.bgHeight;
                    // Avoid duplicates: check if this coordinate is already registered
                    const isDuplicate = plotOcrWords.some(existing => 
                        Math.abs(existing.svgX - svgX) < 10 && Math.abs(existing.svgY - svgY) < 10
                    );
                    if (!isDuplicate) {
                        plotOcrWords.push({
                            text: `PLOT ${text}`,
                            svgX: svgX,
                            svgY: svgY,
                            confidence: w.confidence || 50
                        });
                    }
                }
            });
        }

        console.log(`[Vectorizer] OCR filter: ${config.ocrWords?.length || 0} total words → ${plotOcrWords.length} plot-number candidates`);

        // 5. Detect Bounded Regions (White parcel spaces inside black border lines)
        const regions = this.detectRegions(binaryGrid, config);
        // Sort regions by pixel count descending so larger plots are matched to OCR first
        regions.sort((a, b) => b.length - a.length);
        console.log(`[Vectorizer] Region detection: ${regions.length} bounded regions found`);

        // 6. Trace Boundaries, Simplify, & Match with OCR
        const plots = [];
        const matchedOcrIndices = new Set();

        regions.forEach((region, index) => {
            // Trace boundary pixels using Moore-Neighbor
            const boundary = this.traceContour(region, binaryGrid.width, binaryGrid.height);
            if (boundary.length < 4) return;

            // Scale coordinates from canvas space → SVG space
            const scaledBoundary = boundary.map(pt => {
                const u = pt[0] / canvasW;
                const v = pt[1] / canvasH;
                return [
                    Math.round(config.bgX + u * config.bgWidth),
                    Math.round(config.bgY + v * config.bgHeight)
                ];
            });

            // Simplify polygons using Ramer-Douglas-Peucker (RDP)
            const simplifiedPoints = this.simplifyRDP(scaledBoundary, config.simplify);
            if (simplifiedPoints.length < 3) return;

            // Calculate metrics and filter by area
            const area = this.calculateArea(simplifiedPoints);
            if (area < dynamicMinArea || area > config.maxArea) return;

            const centroid = this.calculateCentroid(simplifiedPoints);

            // 7. Match OCR Text: find plot number words inside this polygon
            let matchedText = null;
            let matchedIdx = -1;
            let bestDist = Infinity;

            // Primary strategy: Point-in-Polygon test with correctly mapped SVG coords
            for (let i = 0; i < plotOcrWords.length; i++) {
                if (matchedOcrIndices.has(i)) continue; // Skip already-claimed words
                const ocr = plotOcrWords[i];
                if (this.isPointInPolygon([ocr.svgX, ocr.svgY], simplifiedPoints)) {
                    const dist = Math.hypot(ocr.svgX - centroid.x, ocr.svgY - centroid.y);
                    if (dist < bestDist) {
                        matchedText = ocr.text;
                        matchedIdx = i;
                        bestDist = dist;
                    }
                }
            }

            // Fallback strategy: Proximity match (nearest unused OCR word within 5% of map diagonal)
            // Increased from 3% to 5% to handle OCR coordinate drift from preprocessing
            if (!matchedText) {
                const maxDist = Math.hypot(config.bgWidth, config.bgHeight) * 0.05;
                for (let i = 0; i < plotOcrWords.length; i++) {
                    if (matchedOcrIndices.has(i)) continue; // Skip already-claimed words
                    const ocr = plotOcrWords[i];
                    const dist = Math.hypot(ocr.svgX - centroid.x, ocr.svgY - centroid.y);
                    if (dist < maxDist && dist < bestDist) {
                        matchedText = ocr.text;
                        matchedIdx = i;
                        bestDist = dist;
                    }
                }
            }

            if (matchedIdx >= 0) {
                matchedOcrIndices.add(matchedIdx);
            }

            plots.push({
                id: matchedText || `PLOT-${index + 1}`,
                status: "available",
                area: area,
                price: 300,
                owner: null,
                notes: matchedText
                    ? `OCR-matched plot boundary. Recalibrated coordinates.`
                    : `Automatically traced CAD contour. Recalibrated coordinates.`,
                points: simplifiedPoints,
                labelOffset: { x: 0, y: 0 },
                _ocrMatched: !!matchedText,
                centroid: centroid // Keep centroid temporarily for frame-enclosure checks
            });
        });

        console.log(`[Vectorizer] Traced ${plots.length} raw regions.`);

        // 7.5. Filter out outer boundary frames and legend/title blocks
        const filteredTracedPlots = [];
        const discardedPolygons = [];

        plots.forEach((pA, idxA) => {
            // Check if pA encloses multiple other plots (indicates it is an outer frame)
            let containsCount = 0;
            for (let idxB = 0; idxB < plots.length; idxB++) {
                if (idxA === idxB) continue;
                const pB = plots[idxB];
                if (this.isPointInPolygon([pB.centroid.x, pB.centroid.y], pA.points)) {
                    containsCount++;
                }
            }

            if (containsCount > 1) {
                console.log(`[Vectorizer] Ignoring outer frame/envelope "${pA.id}" (contains ${containsCount} other plot centroids)`);
                discardedPolygons.push(pA.points);
                return;
            }

            // Check if pA contains any typical legend/title block keywords in OCR text
            let isLegend = false;
            const legendKeywords = [
                'legend', 'scale', 'north', 'index', 'key plan', 'developer', 'title', 
                'location', 'site plan', 'master plan', 'layout plan', 'sign', 
                'signature', 'date', 'zone', 'notes', 'remarks'
            ];
            
            if (config.ocrWords && config.ocrWords.length > 0) {
                for (const word of config.ocrWords) {
                    const text = word.text.toLowerCase().trim();
                    if (legendKeywords.some(keyword => text.includes(keyword))) {
                        const svgX = config.bgX + (word.x / origWidth) * config.bgWidth;
                        const svgY = config.bgY + (word.y / origHeight) * config.bgHeight;
                        if (this.isPointInPolygon([svgX, svgY], pA.points)) {
                            isLegend = true;
                            console.log(`[Vectorizer] Ignoring legend/title block "${pA.id}" containing word "${word.text}"`);
                            break;
                        }
                    }
                }
            }

            if (isLegend) {
                discardedPolygons.push(pA.points);
                return;
            }

            filteredTracedPlots.push(pA);
        });

        console.log(`[Vectorizer] Filtered down to ${filteredTracedPlots.length} valid regions. OCR-matched: ${filteredTracedPlots.filter(p => p._ocrMatched).length}`);

        // 8. Keep all surviving traced plots to ensure no real parcel boundaries are missing.
        let finalPlots = filteredTracedPlots;

        // 9. Create approximate regions for OCR words that didn't match any detected boundary
        //    Ensure we do NOT approximate boundaries for numbers inside discarded frames/legends.
        if (plotOcrWords.length > 0) {
            // Calculate average plot size for approximation
            const avgPlotSize = finalPlots.length > 0
                ? Math.sqrt(
                    finalPlots.reduce((sum, p) => sum + this.calculateArea(p.points), 0) / finalPlots.length
                  ) / 0.234  // reverse the area calibration coefficient
                : Math.sqrt(svgArea / Math.max(plotOcrWords.length, 1)) * 0.35;
            const halfSize = Math.min(avgPlotSize * 0.45, 60);

            for (let i = 0; i < plotOcrWords.length; i++) {
                if (!matchedOcrIndices.has(i)) {
                    const ocr = plotOcrWords[i];
                    
                    // Skip if the OCR word falls inside any discarded outer frame or legend box
                    let insideDiscarded = false;
                    for (const poly of discardedPolygons) {
                        if (this.isPointInPolygon([ocr.svgX, ocr.svgY], poly)) {
                            insideDiscarded = true;
                            break;
                        }
                    }
                    if (insideDiscarded) {
                        console.log(`[Vectorizer] Skipping OCR approximation for "${ocr.text}" because it falls inside an ignored frame or legend box.`);
                        continue;
                    }

                    // Only create if this plot number isn't already in results
                    if (!finalPlots.some(p => p.id === ocr.text)) {
                        finalPlots.push({
                            id: ocr.text,
                            status: "available",
                            area: halfSize * halfSize * 4 * 0.055,
                            price: 300,
                            owner: null,
                            notes: "Plot detected via OCR. Boundary approximated.",
                            points: [
                                [Math.round(ocr.svgX - halfSize), Math.round(ocr.svgY - halfSize)],
                                [Math.round(ocr.svgX + halfSize), Math.round(ocr.svgY - halfSize)],
                                [Math.round(ocr.svgX + halfSize), Math.round(ocr.svgY + halfSize)],
                                [Math.round(ocr.svgX - halfSize), Math.round(ocr.svgY + halfSize)]
                            ],
                            labelOffset: { x: 0, y: 0 },
                            _ocrMatched: true
                        });
                    }
                }
            }
        }

        // Clean up internal flags and temporary centroid property
        finalPlots.forEach(p => {
            delete p._ocrMatched;
            delete p.centroid;
        });

        // 10. Resolve duplicate Plot IDs by appending incremental suffixes
        const usedIds = new Set();
        finalPlots.forEach(plot => {
            let baseId = plot.id;
            let counter = 1;
            while (usedIds.has(plot.id)) {
                plot.id = `${baseId}-${counter}`;
                counter++;
            }
            usedIds.add(plot.id);
        });

        // Sort plots by numeric value for clean sidebar display
        finalPlots.sort((a, b) => {
            const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
            return numA - numB;
        });

        console.log(`[Vectorizer] Final output: ${finalPlots.length} plots`);
        return finalPlots;
    }

    // Loads image file cleanly
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(new Error("Failed to load reference image asset"));
            img.src = src;
        });
    }

    // Grayscale & binary threshold pixel array (Smart adaptation: auto-detects dark/light backgrounds!)
    binarize(imgData, threshold, dilationPx = 2) {
        const w = imgData.width;
        const h = imgData.height;
        const data = imgData.data;
        let grid = new Uint8Array(w * h);

        // 1. Calculate average luminance to detect if background is dark or light
        let sumGray = 0;
        const numPixels = w * h;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const gray = Math.max(r, g, b);
            sumGray += gray;
        }
        const avgLuminance = sumGray / numPixels;
        const isInverted = avgLuminance < 120; // Auto-detect: Dark background if average < 120

        console.log(`Binarizer processed. Average luminance: ${avgLuminance.toFixed(1)} (Auto-detected: ${isInverted ? 'Dark Background / Light Lines' : 'Light Background / Dark Lines'})`);

        // 2. Perform thresholding
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const gray = Math.max(r, g, b);
            
            const pixelIndex = i / 4;
            
            if (isInverted) {
                // Dark background: dark pixels are plots (1), light pixels are boundary lines (0)
                grid[pixelIndex] = gray < threshold ? 1 : 0;
            } else {
                // Light background: light pixels are plots (1), dark pixels are boundary lines (0)
                grid[pixelIndex] = gray >= threshold ? 1 : 0;
            }
        }

        // 3. Morphological Widen (Dilation): Thicken boundary lines iteratively using 8-way connectivity
        // This seals diagonal and thin horizontal/vertical line gaps completely.
        for (let d = 0; d < dilationPx; d++) {
            const tempGrid = new Uint8Array(w * h);
            tempGrid.set(grid);

            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    const idx = y * w + x;
                    if (grid[idx] === 0) { // If it is a boundary line pixel
                        tempGrid[idx - 1] = 0; // left
                        tempGrid[idx + 1] = 0; // right
                        tempGrid[idx - w] = 0; // top
                        tempGrid[idx + w] = 0; // bottom
                        
                        // Diagonal dilation to seal diagonal gaps!
                        tempGrid[idx - w - 1] = 0; // top-left
                        tempGrid[idx - w + 1] = 0; // top-right
                        tempGrid[idx + w - 1] = 0; // bottom-left
                        tempGrid[idx + w + 1] = 0; // bottom-right
                    }
                }
            }
            grid = tempGrid;
        }

        return { data: grid, width: w, height: h, isInverted: isInverted };
    }

    // Bounded region detection using downsampled scanning & flood-filling
    detectRegions(binaryGrid, config) {
        const w = binaryGrid.width;
        const h = binaryGrid.height;
        const data = binaryGrid.data;
        const visited = new Uint8Array(w * h);
        const regions = [];

        const step = config.gridSize; // Scanning grid interval
        
        for (let y = step; y < h - step; y += step) {
            for (let x = step; x < w - step; x += step) {
                const idx = y * w + x;
                
                // If it is white space, unvisited, and not a black grid border
                if (data[idx] === 1 && visited[idx] === 0) {
                    const region = this.floodFill(x, y, binaryGrid, visited);
                    if (region.length > 50) { // Discard tiny noise
                        // Verify region is enclosed (doesn't bleed to outer layout boundaries)
                        let touchesBorder = false;
                        for (let i = 0; i < region.length; i++) {
                            const rx = region[i][0];
                            const ry = region[i][1];
                            if (rx <= 2 || rx >= w - 3 || ry <= 2 || ry >= h - 3) {
                                touchesBorder = true;
                                break;
                            }
                        }
                        if (!touchesBorder) {
                            regions.push(region);
                        }
                    }
                }
            }
        }
        return regions;
    }

    // Standard BFS queue-based floodfill
    floodFill(startX, startY, grid, visited) {
        const w = grid.width;
        const h = grid.height;
        const data = grid.data;
        
        const queue = [[startX, startY]];
        const region = [];
        
        const startIdx = startY * w + startX;
        visited[startIdx] = 1;

        const dx = [0, 0, 1, -1];
        const dy = [1, -1, 0, 0];

        while (queue.length > 0) {
            const curr = queue.shift();
            const cx = curr[0];
            const cy = curr[1];
            region.push(curr);

            for (let i = 0; i < 4; i++) {
                const nx = cx + dx[i];
                const ny = cy + dy[i];
                
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const nidx = ny * w + nx;
                    if (data[nidx] === 1 && visited[nidx] === 0) {
                        visited[nidx] = 1;
                        queue.push([nx, ny]);
                    }
                }
            }
        }
        return region;
    }

    // Moore-Neighbor boundary tracer to walk around the perimeter of a floodfilled region
    traceContour(region, width, height) {
        // Convert region array back to a binary map overlay for direct traversal
        const map = new Uint8Array(width * height);
        region.forEach(pt => {
            map[pt[1] * width + pt[0]] = 1;
        });

        // 1. Find starting point (topmost-leftmost pixel of region)
        let startPt = null;
        for (let i = 0; i < region.length; i++) {
            if (!startPt || region[i][1] < startPt[1] || (region[i][1] === startPt[1] && region[i][0] < startPt[0])) {
                startPt = region[i];
            }
        }

        if (!startPt) return [];

        const boundary = [];
        let cx = startPt[0];
        let cy = startPt[1];
        
        // Moore neighborhood standard directions (clockwise starting top-left)
        const dx = [-1, 0, 1, 1, 1, 0, -1, -1];
        const dy = [-1, -1, -1, 0, 1, 1, 1, 0];

        let startDir = 7; // Direction we entered from
        let count = 0;

        do {
            boundary.push([cx, cy]);
            let foundNext = false;
            
            // Loop clockwise to search for next neighbor
            for (let i = 0; i < 8; i++) {
                const dir = (startDir + i) % 8;
                const nx = cx + dx[dir];
                const ny = cy + dy[dir];

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    if (map[ny * width + nx] === 1) {
                        cx = nx;
                        cy = ny;
                        // Set backtrack entry direction (opposite of dir + 1 clockwise)
                        startDir = (dir + 5) % 8;
                        foundNext = true;
                        break;
                    }
                }
            }

            if (!foundNext) break;
            count++;
            
            // Safety limit to prevent infinite loops in weird loops
            if (count > region.length * 2) break;
            
        } while ((cx !== startPt[0] || cy !== startPt[1]) && boundary.length < 5000);

        return boundary;
    }

    // Ramer-Douglas-Peucker (RDP) path simplification algorithm
    simplifyRDP(points, epsilon) {
        if (points.length < 3) return points;

        let dmax = 0;
        let index = 0;
        const end = points.length - 1;

        // Line equation distance check
        for (let i = 1; i < end; i++) {
            const d = this.perpendicularDistance(points[i], points[0], points[end]);
            if (d > dmax) {
                index = i;
                dmax = d;
            }
        }

        if (dmax > epsilon) {
            // Recursive splits
            const results1 = this.simplifyRDP(points.slice(0, index + 1), epsilon);
            const results2 = this.simplifyRDP(points.slice(index), epsilon);
            return results1.slice(0, results1.length - 1).concat(results2);
        } else {
            return [points[0], points[end]];
        }
    }

    perpendicularDistance(pt, lineStart, lineEnd) {
        const x = pt[0];
        const y = pt[1];
        const x1 = lineStart[0];
        const y1 = lineStart[1];
        const x2 = lineEnd[0];
        const y2 = lineEnd[1];

        const numerator = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
        const denominator = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    // Ray-Casting Point-in-Polygon Algorithm
    isPointInPolygon(point, polygon) {
        const x = point[0];
        const y = point[1];
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];

            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    }

    calculateArea(points) {
        let area = 0;
        const numPoints = points.length;
        for (let i = 0; i < numPoints; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % numPoints];
            area += (p1[0] * p2[1]) - (p2[0] * p1[1]);
        }
        return Math.abs(area) * 0.055; // calibrated area multiplier
    }

    calculateCentroid(points) {
        let area = 0, cx = 0, cy = 0;
        const numPoints = points.length;
        for (let i = 0; i < numPoints; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % numPoints];
            const factor = (p1[0] * p2[1] - p2[0] * p1[1]);
            area += factor;
            cx += (p1[0] + p2[0]) * factor;
            cy += (p1[1] + p2[1]) * factor;
        }
        area = area / 2.0;
        if (area === 0) return { x: points[0][0], y: points[0][1] };
        return { x: Math.round(cx / (6.0 * area)), y: Math.round(cy / (6.0 * area)) };
    }
}

// Bind globally
export default VectorizerEngine;
