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
            maxArea: 1000000,    // Ignore total background bounds
            gridSize: 6,         // Sampling density (lower = higher quality, slower)
            ocrWords: []         // List of [{ text, x, y }] extracted by OCR
        };
        const config = { ...defaults, ...options };

        // 1. Load image onto canvas
        const img = await this.loadImage(imageSrc);
        
        // Scale canvas bounds to balance performance & accuracy (max width 1200)
        const scale = Math.min(1200 / img.width, 1.0);
        this.canvas.width = img.width * scale;
        this.canvas.height = img.height * scale;
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

        // 2. Perform Grayscale & Binarization
        const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const binaryGrid = this.binarize(imgData, config.threshold, config.dilation);

        // 3. Detect Bounded Regions (White parcel spaces inside black border lines)
        const regions = this.detectRegions(binaryGrid, config);

        // 4. Trace Boundaries & Simplify using RDP
        const plots = [];
        regions.forEach((region, index) => {
            // Trace boundary pixels using Moore-Neighbor
            const boundary = this.traceContour(region, binaryGrid.width, binaryGrid.height);
            if (boundary.length < 4) return;

            // Scale coordinates back to align exactly with background image in SVG viewBox!
            const scaledBoundary = boundary.map(pt => {
                const u = pt[0] / (img.width * scale);
                const v = pt[1] / (img.height * scale);
                
                const svgX = config.bgX + u * config.bgWidth;
                const svgY = config.bgY + v * config.bgHeight;
                
                return [Math.round(svgX), Math.round(svgY)];
            });

            // Simplify polygons using Ramer-Douglas-Peucker (RDP)
            const simplifiedPoints = this.simplifyRDP(scaledBoundary, config.simplify);
            if (simplifiedPoints.length < 3) return;

            // Calculate metrics (area & centroid)
            const area = this.calculateArea(simplifiedPoints);
            if (area < config.minArea || area > config.maxArea) return;
            const centroid = this.calculateCentroid(simplifiedPoints);

            // 5. Match OCR Text strings located inside this polygon
            let matchedText = `PLOT-${index + 1}`;
            let matchedOwner = null;
            
            if (config.ocrWords && config.ocrWords.length > 0) {
                // Find OCR words inside this polygon shape
                const wordsInside = config.ocrWords.filter(word => {
                    // Translate word pixel coords to the exact same SVG coordinates scale
                    const u = word.x / (img.width * scale);
                    const v = word.y / (img.height * scale);
                    
                    const wx = config.bgX + u * config.bgWidth;
                    const wy = config.bgY + v * config.bgHeight;
                    
                    return this.isPointInPolygon([wx, wy], simplifiedPoints);
                });

                if (wordsInside.length > 0) {
                    // Sort words left-to-right, top-to-bottom to assemble contiguous text lines
                    wordsInside.sort((a, b) => a.y - b.y || a.x - b.x);
                    
                    // Filter and join valid strings (like numbers and slashes e.g. "234/P")
                    const validText = wordsInside.map(w => w.text).join(" ").trim();
                    if (validText && validText.length >= 2) {
                        matchedText = validText;
                    }
                }
            }

            plots.push({
                id: matchedText,
                status: "available",
                area: area,
                price: 300,
                owner: matchedOwner,
                notes: `Automatically traced CAD contour. Recalibrated coordinates.`,
                points: simplifiedPoints,
                labelOffset: { x: 0, y: 0 }
            });
        });

        // Resolve any duplicates in Plot IDs by appending incremental values
        const usedIds = new Set();
        plots.forEach(plot => {
            let baseId = plot.id;
            let counter = 1;
            while (usedIds.has(plot.id)) {
                plot.id = `${baseId}-${counter}`;
                counter++;
            }
            usedIds.add(plot.id);
        });

        return plots;
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
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
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
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
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
window.VectorizerEngine = VectorizerEngine;
