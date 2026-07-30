/* -------------------------------------------------------------
 * Map Visualizer & Boundary CAD Rendering Engine
 * Handles rendering the interactive SVGs, pan/zoom interactions,
 * and mouse-dragging vector boundary updates.
 * ------------------------------------------------------------- */

class MapRenderer {
    constructor(svgElement, mapData, onPlotSelected, onPlotUpdated) {
        this.svg = svgElement;
        this.data = mapData;
        this.onPlotSelected = onPlotSelected;
        this.onPlotUpdated = onPlotUpdated;

        // Viewport transformations state
        this.zoom = 0.85;
        this.panX = 100;
        this.panY = 60;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        
        // Active selections and edit states
        this.selectedPlotId = null;
        this.editMode = false; // Vertex editing mode
        this.activeHandle = null; // Vertex circle index being dragged
        
        // Layer toggle parameters
        this.layers = {
            labels: true,
            roads: true,
            grids: true,
            statusColors: true
        };

        // Initialize WebGL/2D SVG canvas structures
        this.initDOM();
        this.initEvents();
        this.render();
    }

    initDOM() {
        // Clear default SVG content
        this.svg.innerHTML = "";
        
        // Create Defs for standard gradients, hatches, and pattern grids
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        
        // 1. Sleek Cad Grid System (Major & Minor)
        const gridPattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
        gridPattern.setAttribute("id", "cad-grid");
        gridPattern.setAttribute("width", "100");
        gridPattern.setAttribute("height", "100");
        gridPattern.setAttribute("patternUnits", "userSpaceOnUse");
        
        // Sub-grid lines (Minor every 20px)
        for (let i = 20; i < 100; i += 20) {
            const lineH = document.createElementNS("http://www.w3.org/2000/svg", "line");
            lineH.setAttribute("x1", "0");
            lineH.setAttribute("y1", i);
            lineH.setAttribute("x2", "100");
            lineH.setAttribute("y2", i);
            lineH.setAttribute("stroke", "var(--grid-minor)");
            lineH.setAttribute("stroke-width", "0.5");
            gridPattern.appendChild(lineH);

            const lineV = document.createElementNS("http://www.w3.org/2000/svg", "line");
            lineV.setAttribute("x1", i);
            lineV.setAttribute("y1", "0");
            lineV.setAttribute("x2", i);
            lineV.setAttribute("y2", "100");
            lineV.setAttribute("stroke", "var(--grid-minor)");
            lineV.setAttribute("stroke-width", "0.5");
            gridPattern.appendChild(lineV);
        }

        // Major lines (Every 100px)
        const majorH = document.createElementNS("http://www.w3.org/2000/svg", "line");
        majorH.setAttribute("x1", "0");
        majorH.setAttribute("y1", "0");
        majorH.setAttribute("x2", "100");
        majorH.setAttribute("y2", "0");
        majorH.setAttribute("stroke", "var(--grid-major)");
        majorH.setAttribute("stroke-width", "1.5");
        gridPattern.appendChild(majorH);

        const majorV = document.createElementNS("http://www.w3.org/2000/svg", "line");
        majorV.setAttribute("x1", "0");
        majorV.setAttribute("y1", "0");
        majorV.setAttribute("x2", "0");
        majorV.setAttribute("y2", "100");
        majorV.setAttribute("stroke", "var(--grid-major)");
        majorV.setAttribute("stroke-width", "1.5");
        gridPattern.appendChild(majorV);
        
        defs.appendChild(gridPattern);

        // 2. CAD Diagonal Hatch Pattern (For Buildings)
        const hatchPattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
        hatchPattern.setAttribute("id", "diagonal-hatch");
        hatchPattern.setAttribute("width", "15");
        hatchPattern.setAttribute("height", "15");
        hatchPattern.setAttribute("patternUnits", "userSpaceOnUse");
        hatchPattern.setAttribute("patternTransform", "rotate(45)");
        
        const hatchLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        hatchLine.setAttribute("x1", "0");
        hatchLine.setAttribute("y1", "0");
        hatchLine.setAttribute("x2", "0");
        hatchLine.setAttribute("y2", "15");
        hatchLine.setAttribute("stroke", "rgba(255, 255, 255, 0.2)");
        hatchLine.setAttribute("stroke-width", "2.5");
        hatchPattern.appendChild(hatchLine);
        defs.appendChild(hatchPattern);

        // 3. Cad Glow Filters
        const glowFilter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
        glowFilter.setAttribute("id", "selection-glow");
        glowFilter.setAttribute("x", "-20%");
        glowFilter.setAttribute("y", "-20%");
        glowFilter.setAttribute("width", "140%");
        glowFilter.setAttribute("height", "140%");
        
        const blur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
        blur.setAttribute("stdDeviation", "6");
        blur.setAttribute("result", "blur");
        glowFilter.appendChild(blur);

        const merge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
        const node1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
        node1.setAttribute("in", "blur");
        const node2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
        node2.setAttribute("in", "SourceGraphic");
        merge.appendChild(node1);
        merge.appendChild(node2);
        glowFilter.appendChild(merge);
        defs.appendChild(glowFilter);

        this.svg.appendChild(defs);

        // Grid Background Container
        this.gridBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.gridBg.setAttribute("width", "100%");
        this.gridBg.setAttribute("height", "100%");
        this.gridBg.setAttribute("fill", "url(#cad-grid)");
        this.svg.appendChild(this.gridBg);

        // Main Viewport transformation group
        this.viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.viewport.setAttribute("id", "viewport-group");
        this.svg.appendChild(this.viewport);

        // Separate layer sub-groups for strict visual depth
        this.roadsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.plotsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.decorationsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.labelsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.handlesLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");

        this.viewport.appendChild(this.roadsLayer);
        this.viewport.appendChild(this.plotsLayer);
        this.viewport.appendChild(this.decorationsLayer);
        this.viewport.appendChild(this.labelsLayer);
        this.viewport.appendChild(this.handlesLayer);
        
        // Floating high-precision custom tooltip
        this.tooltip = document.getElementById("canvas-tooltip");
    }

    initEvents() {
        // Mouse interaction for Panning
        this.svg.addEventListener("mousedown", (e) => {
            // If dragging handle or active selected input, ignore panning
            if (e.target.classList.contains("vertex-handle")) return;
            
            this.isPanning = true;
            this.panStartX = e.clientX - this.panX;
            this.panStartY = e.clientY - this.panY;
            this.svg.style.cursor = "grabbing";
        });

        window.addEventListener("mousemove", (e) => {
            if (this.isPanning) {
                this.panX = e.clientX - this.panStartX;
                this.panY = e.clientY - this.panStartY;
                this.updateTransform();
            } else if (this.activeHandle !== null && this.selectedPlotId) {
                // Dragging a boundary handle vertex
                this.handleVertexDrag(e);
            }
        });

        window.addEventListener("mouseup", () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.svg.style.cursor = "grab";
            }
            if (this.activeHandle !== null) {
                this.activeHandle = null;
                // Recalculate global metrics on finalize
                if (this.onPlotUpdated && this.selectedPlotId) {
                    const plot = this.data.plots.find(p => p.id === this.selectedPlotId);
                    this.onPlotUpdated(plot);
                }
            }
        });

        // Mousewheel Zoom centered on mouse cursor position
        this.svg.addEventListener("wheel", (e) => {
            e.preventDefault();
            const zoomIntensity = 0.08;
            
            // Get mouse position relative to SVG bounding box
            const rect = this.svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Convert current mouse position to viewport coordinates
            const wheelX = (mouseX - this.panX) / this.zoom;
            const wheelY = (mouseY - this.panY) / this.zoom;

            // Compute next zoom scale
            const zoomFactor = e.deltaY < 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);
            const nextZoom = Math.min(Math.max(this.zoom * zoomFactor, 0.15), 5.0);

            // Re-pan so the point under the mouse cursor remains static
            this.panX = mouseX - wheelX * nextZoom;
            this.panY = mouseY - wheelY * nextZoom;
            this.zoom = nextZoom;

            this.updateTransform();
        }, { passive: false });

        // Tooltip tracking mouseover
        this.svg.addEventListener("mousemove", (e) => {
            const plotEl = e.target.closest(".plot-polygon");
            if (plotEl && !this.editMode) {
                const plotId = plotEl.dataset.id;
                const plot = this.data.plots.find(p => p.id === plotId);
                
                if (plot && this.tooltip) {
                    this.tooltip.classList.add("visible");
                    this.tooltip.style.left = `${e.clientX + 16}px`;
                    this.tooltip.style.top = `${e.clientY + 16}px`;
                    
                    const priceFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(plot.price);
                    const totalVal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(plot.area * plot.price);
                    
                    this.tooltip.innerHTML = `
                        <div class="tooltip-title">${plot.id}</div>
                        <div>Area: <strong>${plot.area.toFixed(2)} SQ.MT.</strong></div>
                        <div>Value: <strong>${totalVal}</strong> ($${plot.price}/m²)</div>
                        <div>Status: <span class="status-indicator status-${plot.status}">${plot.status}</span></div>
                        ${plot.owner ? `<div>Owner: <em>${plot.owner}</em></div>` : ''}
                    `;
                }
            } else {
                if (this.tooltip) this.tooltip.classList.remove("visible");
            }
        });

        this.svg.addEventListener("mouseleave", () => {
            if (this.tooltip) this.tooltip.classList.remove("visible");
        });
    }

    updateTransform() {
        this.viewport.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
        
        // Hide/Show details on zooming states using dynamic CSS helper classes
        if (this.zoom < 0.45) {
            this.svg.classList.add("map-scale-low");
        } else {
            this.svg.classList.remove("map-scale-low");
        }
    }

    // Convert Screen clientX/Y coordinates to high-precision SVG matrix system coordinates
    screenToSVG(clientX, clientY) {
        const rect = this.svg.getBoundingClientRect();
        const x = (clientX - rect.left - this.panX) / this.zoom;
        const y = (clientY - rect.top - this.panY) / this.zoom;
        return { x: Math.round(x), y: Math.round(y) };
    }

    setTheme(themeName) {
        document.body.setAttribute("data-theme", themeName);
        this.render();
    }

    toggleLayer(layerName, visible) {
        if (layerName in this.layers) {
            this.layers[layerName] = visible;
            this.render();
        }
    }

    setSelectedPlot(plotId) {
        this.selectedPlotId = plotId;
        this.render();
    }

    setEditMode(enabled) {
        this.editMode = enabled;
        this.render();
    }

    resetZoom() {
        this.zoom = 0.85;
        this.panX = 100;
        this.panY = 60;
        this.updateTransform();
    }

    // Mathematical formula to calculate the center coordinate (centroid) of a non-self-intersecting polygon
    calculateCentroid(points) {
        let area = 0;
        let cx = 0;
        let cy = 0;
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
        
        cx = cx / (6.0 * area);
        cy = cy / (6.0 * area);
        
        return { x: Math.round(cx), y: Math.round(cy) };
    }

    // Shoelace algorithm to calculate exact mathematical 2D area of polygon
    calculatePolygonArea(points) {
        let area = 0;
        const numPoints = points.length;

        for (let i = 0; i < numPoints; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % numPoints];
            area += (p1[0] * p2[1]) - (p2[0] * p1[1]);
        }

        // Convert coordinates to simulated metric scale (e.g., 1 coordinate unit = ~1.2 meters, or keep direct for exact representation)
        // For visual reliability, let's establish a scaling ratio or keep the initial preset value if un-morphed
        return Math.abs(area) * 0.055; // Calibrated scaling coefficient to align layout density with exact sqm quantities
    }

    handleVertexDrag(e) {
        const svgCoords = this.screenToSVG(e.clientX, e.clientY);
        const plot = this.data.plots.find(p => p.id === this.selectedPlotId);
        
        if (plot && this.activeHandle !== null) {
            // Update vertex coordinates
            plot.points[this.activeHandle] = [svgCoords.x, svgCoords.y];
            
            // Recalculate Area automatically using Shoelace
            plot.area = this.calculatePolygonArea(plot.points);
            
            // Redraw polygon, handles, and label instantly
            this.render();
            
            // Live feedback to Sidebar inputs
            if (this.onPlotUpdated) {
                this.onPlotUpdated(plot, true); // true indicates active dragging state
            }
        }
    }

    render() {
        this.updateTransform();

        // 1. Clear Layer Groups
        this.roadsLayer.innerHTML = "";
        this.plotsLayer.innerHTML = "";
        this.decorationsLayer.innerHTML = "";
        this.labelsLayer.innerHTML = "";
        this.handlesLayer.innerHTML = "";

        // Render Reference Sketch Overlay Image (Bottom-most Layer)
        if (this.data.backgroundImage && this.data.backgroundImage.href) {
            const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
            img.setAttribute("href", this.data.backgroundImage.href);
            img.setAttribute("x", this.data.backgroundImage.x !== undefined ? this.data.backgroundImage.x : 100);
            img.setAttribute("y", this.data.backgroundImage.y !== undefined ? this.data.backgroundImage.y : 100);
            img.setAttribute("width", this.data.backgroundImage.width !== undefined ? this.data.backgroundImage.width : 1200);
            img.setAttribute("height", this.data.backgroundImage.height !== undefined ? this.data.backgroundImage.height : 800);
            img.setAttribute("opacity", this.data.backgroundImage.opacity !== undefined ? this.data.backgroundImage.opacity : 0.5);
            img.setAttribute("pointer-events", "none");
            img.setAttribute("id", "ref-overlay-img");
            
            const existingImg = this.viewport.querySelector("#ref-overlay-img");
            if (existingImg) existingImg.remove();
            this.viewport.insertBefore(img, this.viewport.firstChild);
        } else {
            const existingImg = this.viewport.querySelector("#ref-overlay-img");
            if (existingImg) existingImg.remove();
        }

        // 2. Render Roads
        if (this.layers.roads) {
            this.data.roads.forEach(road => {
                const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                poly.setAttribute("points", road.points.map(p => p.join(",")).join(" "));
                poly.setAttribute("class", "road-overlay");
                this.roadsLayer.appendChild(poly);

                // Road text rendering on baseline path
                if (road.textPath) {
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute("id", `path-${road.id}`);
                    path.setAttribute("d", road.textPath);
                    path.setAttribute("fill", "none");
                    path.setAttribute("stroke", "none");
                    this.roadsLayer.appendChild(path);

                    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    text.setAttribute("class", "road-label");
                    
                    const textPathNode = document.createElementNS("http://www.w3.org/2000/svg", "textPath");
                    textPathNode.setAttribute("href", `#path-${road.id}`);
                    textPathNode.setAttribute("startOffset", "50%");
                    textPathNode.setAttribute("text-anchor", "middle");
                    textPathNode.textContent = road.name;
                    
                    text.appendChild(textPathNode);
                    this.roadsLayer.appendChild(text);
                }
            });
        }

        // 3. Render Plots
        this.data.plots.forEach(plot => {
            const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            poly.setAttribute("points", plot.points.map(p => p.join(",")).join(" "));
            
            // Generate visual classes based on selected parameters
            let classes = "plot-polygon";
            if (this.layers.statusColors) {
                classes += ` state-${plot.status}`;
            } else {
                classes += " state-available"; // Neutral style
            }
            
            if (plot.id === this.selectedPlotId) {
                classes += " selected";
            }
            poly.setAttribute("class", classes);
            poly.dataset.id = plot.id;
            
            // Add click listener
            poly.addEventListener("click", (e) => {
                e.stopPropagation();
                if (this.onPlotSelected) this.onPlotSelected(plot.id);
            });

            this.plotsLayer.appendChild(poly);

            // Render hatched shapes inside Sub Plot 1 if building layer is designated
            if (plot.isBuilding && this.data.hatches) {
                this.data.hatches.forEach(hatch => {
                    const hatchPoly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    hatchPoly.setAttribute("points", hatch.points.map(p => p.join(",")).join(" "));
                    hatchPoly.setAttribute("class", "cad-hatch");
                    hatchPoly.setAttribute("pointer-events", "none");
                    this.decorationsLayer.appendChild(hatchPoly);
                });
            }

            // 4. Render Dynamic Center-aligned Text Labels
            if (this.layers.labels) {
                const centroid = this.calculateCentroid(plot.points);
                const ox = plot.labelOffset ? plot.labelOffset.x : 0;
                const oy = plot.labelOffset ? plot.labelOffset.y : 0;
                
                const textGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                textGroup.setAttribute("transform", `translate(${centroid.x + ox}, ${centroid.y + oy})`);
                textGroup.setAttribute("pointer-events", "none");
                
                // Plot ID
                const textId = document.createElementNS("http://www.w3.org/2000/svg", "text");
                textId.setAttribute("class", "plot-label");
                textId.setAttribute("y", plot.isBuilding || plot.id.length > 8 ? "-5" : "0");
                textId.textContent = plot.id;
                textGroup.appendChild(textId);
                
                // Sub-Area (only on prominent plots or high zoom)
                if (plot.isBuilding || plot.id === "COMMON PLOT" || plot.id.includes("+")) {
                    const textArea = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    textArea.setAttribute("class", "plot-label-sub");
                    textArea.setAttribute("y", "10");
                    textArea.textContent = `${plot.area.toFixed(2)} SQ.MT.`;
                    textGroup.appendChild(textArea);
                }
                
                this.labelsLayer.appendChild(textGroup);
            }
        });

        // 5. Render Boundary Node Handles (If editing boundaries)
        if (this.editMode && this.selectedPlotId) {
            const plot = this.data.plots.find(p => p.id === this.selectedPlotId);
            if (plot) {
                plot.points.forEach((pt, index) => {
                    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    circle.setAttribute("cx", pt[0]);
                    circle.setAttribute("cy", pt[1]);
                    circle.setAttribute("r", "6");
                    circle.setAttribute("class", "vertex-handle");
                    circle.dataset.index = index;
                    
                    circle.addEventListener("mousedown", (e) => {
                        e.stopPropagation();
                        this.activeHandle = index;
                        circle.classList.add("active");
                    });

                    // Add vertex on double click on poly line (managed on polygon level)
                    // Delete vertex on right click
                    circle.addEventListener("contextmenu", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (plot.points.length > 3) {
                            plot.points.splice(index, 1);
                            plot.area = this.calculatePolygonArea(plot.points);
                            this.render();
                            if (this.onPlotUpdated) this.onPlotUpdated(plot);
                        }
                    });

                    this.handlesLayer.appendChild(circle);
                });

                // Render dashed guide lines between nodes for clear boundary limits
                const guides = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                guides.setAttribute("points", plot.points.map(p => p.join(",")).join(" "));
                guides.setAttribute("fill", "none");
                guides.setAttribute("stroke", "var(--accent)");
                guides.setAttribute("stroke-width", "1");
                guides.setAttribute("stroke-dasharray", "4 4");
                guides.setAttribute("pointer-events", "none");
                this.handlesLayer.appendChild(guides);
            }
        }
    }
}

// Bind to window object for global availability
window.MapRenderer = MapRenderer;
