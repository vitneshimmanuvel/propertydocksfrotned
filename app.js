/* -------------------------------------------------------------
 * AEROSTAGE CAD - Real Estate Interactive Map Controller
 * Orchestrates layout state, handles sidebar explorer, edits metadata,
 * calculates statistics, and handles JSON import/export routines.
 * ------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    // ---------------------------------------------------------
    // 1. Core State Initialization
    // ---------------------------------------------------------
    let activeMapData = null;
    let mapRenderer = null;
    let selectedPlotId = null;
    let currentTool = "select"; // 'select', 'pan', 'add'
    let activeFilter = "all";
    let searchQuery = "";

    // Load data from LocalStorage or fall back to default pre-loaded layout
    const savedData = localStorage.getItem("aerostage_map_database");
    if (savedData) {
        try {
            activeMapData = JSON.parse(savedData);
        } catch (e) {
            console.error("Error reading saved database. Reverting to initial templates.", e);
            activeMapData = { ...window.INITIAL_MAP_DATA };
        }
    } else {
        activeMapData = { ...window.INITIAL_MAP_DATA };
    }

    // ---------------------------------------------------------
    // 2. DOM Elements Selection
    // ---------------------------------------------------------
    const svgCanvas = document.getElementById("cad-canvas");
    const themeSelector = document.getElementById("theme-selector");
    const btnResetMap = document.getElementById("btn-reset-map");
    const btnExportJson = document.getElementById("btn-export-json");
    
    // Left Sidebar Elements
    const metricTotalValue = document.getElementById("metric-total-value");
    const metricValueSub = document.getElementById("metric-value-sub");
    const metricAvailable = document.getElementById("metric-available");
    const metricAvailableSub = document.getElementById("metric-available-sub");
    const metricTotalArea = document.getElementById("metric-total-area");
    const metricSoldRatio = document.getElementById("metric-sold-ratio");
    const metricSoldSub = document.getElementById("metric-sold-sub");
    
    const searchPlotsInput = document.getElementById("search-plots");
    const btnFilters = document.querySelectorAll(".btn-filter");
    const plotQuickList = document.getElementById("plot-quick-list");
    const plotListCountText = document.getElementById("plot-list-count");
    
    const btnTriggerImport = document.getElementById("btn-trigger-import");
    const fileImportInput = document.getElementById("file-import-input");

    // Floating Map Toolbar Tools
    const toolSelect = document.getElementById("tool-select");
    const toolPan = document.getElementById("tool-pan");
    const btnZoomReset = document.getElementById("btn-zoom-reset");
    const toolEditBoundaries = document.getElementById("tool-edit-boundaries");
    const toolAddPlot = document.getElementById("tool-add-plot");
    const toolDeletePlot = document.getElementById("tool-delete-plot");
    
    const layerLabels = document.getElementById("layer-labels");
    const layerRoads = document.getElementById("layer-roads");
    const layerGrids = document.getElementById("layer-grids");
    const layerColors = document.getElementById("layer-colors");

    // Right Sidebar Plot Editor Elements
    const editorSidebar = document.getElementById("editor-sidebar");
    const editorEmptyState = document.getElementById("editor-empty-state");
    const editorFormContainer = document.getElementById("editor-form-container");
    const editPlotId = document.getElementById("edit-plot-id");
    const editPlotStatus = document.getElementById("edit-plot-status");
    const editPlotArea = document.getElementById("edit-plot-area");
    const editPlotPrice = document.getElementById("edit-plot-price");
    const editPlotTotalVal = document.getElementById("edit-plot-total-val");
    const editPlotOwner = document.getElementById("edit-plot-owner");
    const editPlotNotes = document.getElementById("edit-plot-notes");
    const geometryNodesTbody = document.getElementById("geometry-nodes-tbody");
    const btnCloseEditor = document.getElementById("btn-close-editor");
    const plotEditorForm = document.getElementById("plot-editor-form");
    const toastContainer = document.getElementById("toast-container");

    // ---------------------------------------------------------
    // 3. UI Toast Notifications Utility
    // ---------------------------------------------------------
    function showToast(message, type = "success") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        
        let iconName = "check-circle";
        if (type === "warning") iconName = "alert-triangle";
        if (type === "error") iconName = "x-circle";
        
        toast.innerHTML = `
            <i data-lucide="${iconName}"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        lucide.createIcons(); // Initialize the new icon
        
        // Trigger reflow for slide animation
        setTimeout(() => toast.classList.add("visible"), 50);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove("visible");
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // ---------------------------------------------------------
    // 4. Analytics & Global KPIs Calculations
    // ---------------------------------------------------------
    function updateMetrics() {
        const plots = activeMapData.plots;
        const totalCount = plots.length;
        
        let totalVal = 0;
        let soldVal = 0;
        let totalArea = 0;
        let soldArea = 0;
        let availableArea = 0;
        let availableCount = 0;
        let reservedCount = 0;
        let soldCount = 0;
        
        plots.forEach(plot => {
            const plotVal = plot.area * plot.price;
            totalVal += plotVal;
            totalArea += plot.area;
            
            if (plot.status === "available" || plot.status === "premium") {
                availableCount++;
                availableArea += plot.area;
            } else if (plot.status === "sold") {
                soldCount++;
                soldArea += plot.area;
                soldVal += plotVal;
            } else if (plot.status === "reserved") {
                reservedCount++;
                soldArea += plot.area; // Occupied block
                soldVal += plotVal;
            }
        });
        
        const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
        
        // Update Total Value metric
        metricTotalValue.textContent = currencyFormatter.format(totalVal);
        const occupancyValPercent = totalVal > 0 ? Math.round((soldVal / totalVal) * 100) : 0;
        metricValueSub.textContent = `${occupancyValPercent}% secured sales portfolio`;

        // Update Available Plots metrics
        metricAvailable.textContent = `${availableCount} / ${totalCount}`;
        const availAreaPercent = totalArea > 0 ? Math.round((availableArea / totalArea) * 100) : 0;
        metricAvailableSub.textContent = `${availAreaPercent}% of sqm available`;

        // Total Surface Area
        metricTotalArea.textContent = `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(totalArea)} m²`;

        // Sales Velocity (Sold & Reserved ratios)
        const occupancyRate = totalCount > 0 ? Math.round(((soldCount + reservedCount) / totalCount) * 100) : 0;
        metricSoldRatio.textContent = `${occupancyRate}%`;
        metricSoldSub.textContent = `${soldCount} sold, ${reservedCount} reserved`;
    }

    // ---------------------------------------------------------
    // 5. Sidebar Explorer List Renderer
    // ---------------------------------------------------------
    function renderPlotExplorer() {
        plotQuickList.innerHTML = "";
        
        // Filter plots list based on current settings
        const filteredPlots = activeMapData.plots.filter(plot => {
            const matchesFilter = activeFilter === "all" || plot.status === activeFilter;
            const query = searchQuery.toLowerCase();
            const matchesSearch = plot.id.toLowerCase().includes(query) || 
                                 (plot.owner && plot.owner.toLowerCase().includes(query)) ||
                                 (plot.notes && plot.notes.toLowerCase().includes(query));
            return matchesFilter && matchesSearch;
        });

        plotListCountText.textContent = `Showing ${filteredPlots.length} plots`;

        if (filteredPlots.length === 0) {
            plotQuickList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px 0;">No matching parcels found</div>`;
            return;
        }

        filteredPlots.forEach(plot => {
            const item = document.createElement("div");
            item.className = `plot-item ${plot.id === selectedPlotId ? 'selected' : ''}`;
            
            const areaFormatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(plot.area);
            const valFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(plot.area * plot.price);
            
            item.innerHTML = `
                <div class="plot-item-info">
                    <div class="plot-item-id">${plot.id}</div>
                    <div class="plot-item-area">${areaFormatted} SQ.MT. | ${valFormatted}</div>
                </div>
                <span class="status-indicator status-${plot.status}">${plot.status}</span>
            `;
            
            item.addEventListener("click", () => {
                selectPlot(plot.id);
            });
            
            plotQuickList.appendChild(item);
        });
    }

    // ---------------------------------------------------------
    // 6. Plot Selection and Sidebar Form Bindings
    // ---------------------------------------------------------
    function selectPlot(plotId) {
        selectedPlotId = plotId;
        mapRenderer.setSelectedPlot(plotId);
        
        if (plotId) {
            const plot = activeMapData.plots.find(p => p.id === plotId);
            if (plot) {
                // Populate forms
                editPlotId.value = plot.id;
                editPlotStatus.value = plot.status;
                editPlotArea.value = plot.area.toFixed(2);
                editPlotPrice.value = plot.price;
                
                const totalVal = plot.area * plot.price;
                editPlotTotalVal.value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(totalVal);
                
                editPlotOwner.value = plot.owner || "";
                editPlotNotes.value = plot.notes || "";
                
                // Populate Coordinates Table
                populateCoordinatesTable(plot.points);

                // Enable toolbar editing actions
                toolEditBoundaries.removeAttribute("disabled");
                toolDeletePlot.removeAttribute("disabled");

                // Toggle views
                editorEmptyState.style.display = "none";
                editorFormContainer.style.display = "flex";
                editorSidebar.classList.remove("collapsed");
                
                // Active zoom translation to frame the selected polygon smoothly
                // Compute centroid to pan to
                const centroid = mapRenderer.calculateCentroid(plot.points);
                // Standard offset positioning centering the plot nicely in remaining viewport
                const rect = svgCanvas.getBoundingClientRect();
                const targetPanX = (rect.width - 380) / 2 - centroid.x * mapRenderer.zoom;
                const targetPanY = rect.height / 2 - centroid.y * mapRenderer.zoom;
                
                // Smooth transition overlay
                mapRenderer.panX = targetPanX;
                mapRenderer.panY = targetPanY;
                mapRenderer.render();
            }
        } else {
            // Null state selections
            toolEditBoundaries.setAttribute("disabled", "true");
            toolDeletePlot.setAttribute("disabled", "true");
            
            // Turn off edit mode visual handles
            if (mapRenderer.editMode) {
                mapRenderer.setEditMode(false);
                toolEditBoundaries.classList.remove("active");
            }
            
            editorFormContainer.style.display = "none";
            editorEmptyState.style.display = "flex";
            editorSidebar.classList.add("collapsed");
        }
        
        renderPlotExplorer();
    }

    function populateCoordinatesTable(points) {
        geometryNodesTbody.innerHTML = "";
        points.forEach((pt, index) => {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid var(--border-color)";
            tr.innerHTML = `
                <td style="padding: 6px 12px; color: var(--text-muted);">${index + 1}</td>
                <td style="padding: 6px 12px;">${pt[0]}</td>
                <td style="padding: 6px 12px;">${pt[1]}</td>
            `;
            
            // Delete node on double click in CAD table
            tr.addEventListener("dblclick", () => {
                if (points.length > 3) {
                    points.splice(index, 1);
                    const plot = activeMapData.plots.find(p => p.id === selectedPlotId);
                    plot.area = mapRenderer.calculatePolygonArea(points);
                    mapRenderer.render();
                    updatePlotPropertiesLive(plot);
                    showToast(`Vertex ${index + 1} removed from boundary coordinates`, "warning");
                } else {
                    showToast("Polygons require at least 3 boundaries to remain secure", "error");
                }
            });
            
            geometryNodesTbody.appendChild(tr);
        });
    }

    // Handles live updates coming from the Renderer (like dragging handles)
    function updatePlotPropertiesLive(plot, isDragging = false) {
        // Sync Sidebar input values
        editPlotArea.value = plot.area.toFixed(2);
        
        const totalVal = plot.area * plot.price;
        editPlotTotalVal.value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(totalVal);
        
        populateCoordinatesTable(plot.points);
        
        if (!isDragging) {
            // Write database updates to storage only when dragging halts to preserve smooth framing
            saveDatabaseState();
            updateMetrics();
        } else {
            // Dragging update metrics dynamically
            updateMetrics();
        }
    }

    function saveDatabaseState() {
        localStorage.setItem("aerostage_map_database", JSON.stringify(activeMapData));
    }

    // ---------------------------------------------------------
    // 7. Input Event Listeners
    // ---------------------------------------------------------
    
    // Live update plot labels & styles as user edits sidebar fields
    function syncPlotMetadataForm() {
        if (!selectedPlotId) return;
        
        const plot = activeMapData.plots.find(p => p.id === selectedPlotId);
        if (plot) {
            const oldId = plot.id;
            const newId = editPlotId.value.trim();
            
            // Verify new ID is unique if altered
            if (newId !== oldId) {
                const idExists = activeMapData.plots.some(p => p.id === newId);
                if (idExists) {
                    showToast(`Plot ID "${newId}" already exists. Please choose a unique name.`, "error");
                    editPlotId.value = oldId;
                    return;
                }
                plot.id = newId;
                selectedPlotId = newId;
                mapRenderer.selectedPlotId = newId;
            }
            
            plot.status = editPlotStatus.value;
            plot.area = parseFloat(editPlotArea.value) || plot.area;
            plot.price = parseFloat(editPlotPrice.value) || 0;
            plot.owner = editPlotOwner.value.trim() || null;
            plot.notes = editPlotNotes.value.trim() || null;
            
            // Update total value display
            const totalVal = plot.area * plot.price;
            editPlotTotalVal.value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(totalVal);

            // Re-render map and sidebars
            mapRenderer.render();
            renderPlotExplorer();
            updateMetrics();
            saveDatabaseState();
            
            showToast(`Plot properties for "${plot.id}" updated successfully`, "success");
        }
    }

    plotEditorForm.addEventListener("submit", (e) => {
        e.preventDefault();
        syncPlotMetadataForm();
    });

    // Save on hitting enter inside details fields
    const formInputs = [editPlotId, editPlotStatus, editPlotArea, editPlotPrice, editPlotOwner];
    formInputs.forEach(input => {
        input.addEventListener("change", syncPlotMetadataForm);
    });

    // ---------------------------------------------------------
    // 8. Toolbar & Navigation Handlers
    // ---------------------------------------------------------
    
    toolSelect.addEventListener("click", () => {
        currentTool = "select";
        toolSelect.classList.add("active");
        toolPan.classList.remove("active");
        svgCanvas.style.cursor = "default";
    });

    toolPan.addEventListener("click", () => {
        currentTool = "pan";
        toolPan.classList.add("active");
        toolSelect.classList.remove("active");
        svgCanvas.style.cursor = "grab";
        
        // Turn off handle edit mode for clean navigation
        if (mapRenderer.editMode) {
            mapRenderer.setEditMode(false);
            toolEditBoundaries.classList.remove("active");
        }
    });

    btnZoomReset.addEventListener("click", () => {
        mapRenderer.resetZoom();
        showToast("Map workspace reset to global viewport fits", "success");
    });

    // Toggle CAD Vertex Handles Editor Mode
    toolEditBoundaries.addEventListener("click", () => {
        if (!selectedPlotId) return;
        
        const enabled = !mapRenderer.editMode;
        mapRenderer.setEditMode(enabled);
        
        if (enabled) {
            toolEditBoundaries.classList.add("active");
            showToast("Boundary CAD nodes active. Click and drag corner circles to morph layout boundaries.", "success");
        } else {
            toolEditBoundaries.classList.remove("active");
            showToast("Boundary CAD editing disabled.", "warning");
        }
    });

    // Create a new customized Plot from center viewpoint
    toolAddPlot.addEventListener("click", () => {
        // Find center of current screen coordinates
        const rect = svgCanvas.getBoundingClientRect();
        const screenCenterX = rect.width / 2;
        const screenCenterY = rect.height / 2;
        
        // Translate screen center to SVG canvas bounds
        const svgCoords = mapRenderer.screenToSVG(screenCenterX, screenCenterY);
        
        // Define clean default hexagon layout coordinates around viewport center
        const cx = svgCoords.x;
        const cy = svgCoords.y;
        const radius = 60;
        
        const newPoints = [
            [Math.round(cx - radius), Math.round(cy - radius/2)],
            [Math.round(cx), Math.round(cy - radius)],
            [Math.round(cx + radius), Math.round(cy - radius/2)],
            [Math.round(cx + radius), Math.round(cy + radius/2)],
            [Math.round(cx), Math.round(cy + radius)],
            [Math.round(cx - radius), Math.round(cy + radius/2)]
        ];

        // Generate auto unique name ID
        let newPlotIndex = activeMapData.plots.length + 1;
        let newPlotId = `PLOT-${newPlotIndex}`;
        while (activeMapData.plots.some(p => p.id === newPlotId)) {
            newPlotIndex++;
            newPlotId = `PLOT-${newPlotIndex}`;
        }

        const newPlot = {
            id: newPlotId,
            status: "available",
            area: mapRenderer.calculatePolygonArea(newPoints),
            price: 300,
            owner: null,
            notes: "Custom newly-created subdivision block.",
            points: newPoints,
            labelOffset: { x: 0, y: 0 }
        };

        // Push to active database
        activeMapData.plots.push(newPlot);
        saveDatabaseState();
        
        // Direct selections rendering
        mapRenderer.render();
        selectPlot(newPlotId);
        updateMetrics();
        
        // Instantly toggle on Boundary Edit handles so they can shape it immediately
        mapRenderer.setEditMode(true);
        toolEditBoundaries.classList.add("active");
        
        showToast(`Plot ${newPlotId} created at center coordinate screen. Drag handle corner nodes to adapt geometry limits.`, "success");
    });

    // Delete selected plot geometry
    toolDeletePlot.addEventListener("click", () => {
        if (!selectedPlotId) return;
        
        const plotId = selectedPlotId;
        const confirmDelete = confirm(`Are you sure you want to permanently delete Plot boundary "${plotId}"?`);
        
        if (confirmDelete) {
            activeMapData.plots = activeMapData.plots.filter(p => p.id !== plotId);
            saveDatabaseState();
            
            // Re-render and clear editor selection
            mapRenderer.render();
            selectPlot(null);
            updateMetrics();
            
            showToast(`Plot ${plotId} permanently deleted from inventory records`, "warning");
        }
    });

    // Visibility layers checkboxes
    layerLabels.addEventListener("click", () => {
        const visible = !mapRenderer.layers.labels;
        mapRenderer.toggleLayer("labels", visible);
        layerLabels.classList.toggle("active", visible);
    });
    layerRoads.addEventListener("click", () => {
        const visible = !mapRenderer.layers.roads;
        mapRenderer.toggleLayer("roads", visible);
        layerRoads.classList.toggle("active", visible);
    });
    layerGrids.addEventListener("click", () => {
        const visible = !mapRenderer.layers.grids;
        mapRenderer.toggleLayer("grids", visible);
        layerGrids.classList.toggle("active", visible);
        
        // Hide/Show CSS main grid patterns too
        if (visible) {
            svgCanvas.style.backgroundImage = "";
            mapRenderer.gridBg.setAttribute("display", "block");
        } else {
            mapRenderer.gridBg.setAttribute("display", "none");
        }
    });
    layerColors.addEventListener("click", () => {
        const visible = !mapRenderer.layers.statusColors;
        mapRenderer.toggleLayer("statusColors", visible);
        layerColors.classList.toggle("active", visible);
    });

    // Close right Sidebar property editor panel
    btnCloseEditor.addEventListener("click", () => {
        selectPlot(null);
    });

    // Close properties sidebar clicking outside plot polygons
    svgCanvas.addEventListener("click", (e) => {
        if (currentTool === "select" && !e.target.closest(".plot-polygon") && !e.target.closest(".vertex-handle")) {
            selectPlot(null);
        }
    });

    // ---------------------------------------------------------
    // 9. Searching & Filtering
    // ---------------------------------------------------------
    
    // Filtering by plot sales status
    btnFilters.forEach(btn => {
        btn.addEventListener("click", () => {
            btnFilters.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            activeFilter = btn.dataset.filter;
            renderPlotExplorer();
        });
    });

    // Keyup typing search
    searchPlotsInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderPlotExplorer();
    });

    // Theme selector canvas changes
    themeSelector.addEventListener("change", (e) => {
        mapRenderer.setTheme(e.target.value);
        showToast(`Theme changed to: ${themeSelector.options[themeSelector.selectedIndex].text}`, "success");
    });

    // Reset Database parameters back to clean templates
    btnResetMap.addEventListener("click", () => {
        const confirmReset = confirm("Are you sure you want to completely erase your customizations and reset the layout to factory defaults?");
        if (confirmReset) {
            localStorage.removeItem("aerostage_map_database");
            showToast("Database cleared. Re-assembling defaults...", "warning");
            setTimeout(() => location.reload(), 600);
        }
    });

    // ---------------------------------------------------------
    // 10. Data Import & Export Routines
    // ---------------------------------------------------------
    
    // Export fully customized active database as downloadable JSON file
    btnExportJson.addEventListener("click", () => {
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeMapData, null, 4));
            const downloadAnchor = document.createElement("a");
            
            const timestamp = new Date().toISOString().slice(0, 10);
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `aerostage_layout_backup_${timestamp}.json`);
            
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            
            showToast("Real Estate Layout exported successfully as JSON", "success");
        } catch (e) {
            console.error("Export failures: ", e);
            showToast("Failed to serialize database structures", "error");
        }
    });

    // Import external JSON backing file
    btnTriggerImport.addEventListener("click", () => {
        fileImportInput.click();
    });

    fileImportInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedDatabase = JSON.parse(event.target.result);
                
                // Core validation checks for safety
                if (importedDatabase && Array.isArray(importedDatabase.plots) && Array.isArray(importedDatabase.roads)) {
                    activeMapData = importedDatabase;
                    saveDatabaseState();
                    
                    showToast("Layout database successfully parsed. Live refreshing canvas...", "success");
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showToast("Import failed: JSON file is missing essential plot structure segments.", "error");
                }
            } catch (err) {
                console.error("Import processing error", err);
                showToast("Failed to parse JSON file structures.", "error");
            }
        };
        reader.readAsText(file);
    });

    // ---------------------------------------------------------
    // 10.5. Reference Sketch Tracing Overlay Event Bindings
    // ---------------------------------------------------------
    const btnTriggerRefImage = document.getElementById("btn-trigger-ref-image");
    const refImageInput = document.getElementById("ref-image-input");
    const btnClearRefImage = document.getElementById("btn-clear-ref-image");
    const refControlsContainer = document.getElementById("ref-controls-container");
    const refImageOpacity = document.getElementById("ref-image-opacity");
    const labelRefOpacity = document.getElementById("label-ref-opacity");
    const refImageWidth = document.getElementById("ref-image-width");
    const refImageHeight = document.getElementById("ref-image-height");
    const refImageX = document.getElementById("ref-image-x");
    const refImageY = document.getElementById("ref-image-y");

    // Initialize background image overlay states, defaulting to null so it doesn't show on load
    activeMapData.backgroundImage = activeMapData.backgroundImage || {
        href: null,
        opacity: 0.35,
        x: -40,
        y: -100,
        width: 1620,
        height: 1100
    };

    // If the saved background image is a transient blob URL or the legacy layout_sketch.png, clear and save it
    if (activeMapData.backgroundImage && activeMapData.backgroundImage.href) {
        if (activeMapData.backgroundImage.href.startsWith("blob:") || activeMapData.backgroundImage.href === "layout_sketch.png") {
            activeMapData.backgroundImage.href = null;
            saveDatabaseState();
        }
    }

    // Capture the original image source cleanly
    let originalImageSrc = activeMapData.backgroundImage.href;

    // Sync sliders and show panel since default image is pre-loaded on boot
    if (activeMapData.backgroundImage && activeMapData.backgroundImage.href) {
        refControlsContainer.style.display = "flex";
        btnClearRefImage.style.display = "block";
        
        // Sync sliders
        refImageOpacity.value = activeMapData.backgroundImage.opacity;
        labelRefOpacity.textContent = `${Math.round(activeMapData.backgroundImage.opacity * 100)}%`;
        refImageWidth.value = activeMapData.backgroundImage.width;
        refImageHeight.value = activeMapData.backgroundImage.height;
        refImageX.value = activeMapData.backgroundImage.x;
        refImageY.value = activeMapData.backgroundImage.y;
    }

    btnTriggerRefImage.addEventListener("click", () => {
        refImageInput.click();
    });

    refImageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const objectUrl = URL.createObjectURL(file);
        originalImageSrc = objectUrl;
        activeMapData.backgroundImage.href = objectUrl;
        
        // Display controls
        refControlsContainer.style.display = "flex";
        btnClearRefImage.style.display = "block";

        // Sync inputs with current data state
        refImageOpacity.value = activeMapData.backgroundImage.opacity;
        labelRefOpacity.textContent = `${Math.round(activeMapData.backgroundImage.opacity * 100)}%`;
        refImageWidth.value = activeMapData.backgroundImage.width;
        refImageHeight.value = activeMapData.backgroundImage.height;
        refImageX.value = activeMapData.backgroundImage.x;
        refImageY.value = activeMapData.backgroundImage.y;

        // Re-render
        mapRenderer.render();
        showToast("Reference sketch overlay uploaded. Align it using controls to trace.", "success");
    });

    btnClearRefImage.addEventListener("click", () => {
        originalImageSrc = null;
        activeMapData.backgroundImage.href = null;
        refControlsContainer.style.display = "none";
        btnClearRefImage.style.display = "none";
        refImageInput.value = "";
        
        mapRenderer.render();
        showToast("Reference sketch overlay removed.", "warning");
    });

    // Opacity Range Slider (Live updates the DOM element immediately for fluid drag response)
    refImageOpacity.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        activeMapData.backgroundImage.opacity = val;
        labelRefOpacity.textContent = `${Math.round(val * 100)}%`;
        
        const img = svgCanvas.querySelector("#ref-overlay-img");
        if (img) img.setAttribute("opacity", val);
    });

    // Coordinate controls change listener
    const updateOverlayCoordinates = () => {
        activeMapData.backgroundImage.width = parseInt(refImageWidth.value) || 1200;
        activeMapData.backgroundImage.height = parseInt(refImageHeight.value) || 800;
        activeMapData.backgroundImage.x = parseInt(refImageX.value) || 100;
        activeMapData.backgroundImage.y = parseInt(refImageY.value) || 100;
        
        mapRenderer.render();
        saveDatabaseState();
    };

    [refImageWidth, refImageHeight, refImageX, refImageY].forEach(input => {
        input.addEventListener("change", updateOverlayCoordinates);
    });

    // ---------------------------------------------------------
    // 10.6. CAD Auto-Vectorizer Tracing Logic
    // ---------------------------------------------------------
    const vectorizer = new VectorizerEngine();
    
    const vectorizerThreshold = document.getElementById("vectorizer-threshold");
    const labelVectorizerThreshold = document.getElementById("label-vectorizer-threshold");
    const vectorizerDilation = document.getElementById("vectorizer-dilation");
    const labelVectorizerDilation = document.getElementById("label-vectorizer-dilation");
    const vectorizerSimplify = document.getElementById("vectorizer-simplify");
    const labelVectorizerSimplify = document.getElementById("label-vectorizer-simplify");
    const btnRunVectorizer = document.getElementById("btn-run-vectorizer");

    vectorizerThreshold.addEventListener("input", (e) => {
        labelVectorizerThreshold.textContent = e.target.value;
        if (vectorizerPreviewMask.checked) {
            updateMaskPreview();
        }
    });

    vectorizerDilation.addEventListener("input", (e) => {
        labelVectorizerDilation.textContent = `${e.target.value} px`;
        if (vectorizerPreviewMask.checked) {
            updateMaskPreview();
        }
    });

    vectorizerSimplify.addEventListener("input", (e) => {
        labelVectorizerSimplify.textContent = parseFloat(e.target.value).toFixed(1);
    });

    // Real-time binarization mask preview logic!
    const vectorizerPreviewMask = document.getElementById("vectorizer-preview-mask");

    const updateMaskPreview = async () => {
        if (!originalImageSrc) return;

        if (vectorizerPreviewMask.checked) {
            try {
                const img = await vectorizer.loadImage(originalImageSrc);
                const tempCanvas = document.createElement("canvas");
                const scale = Math.min(800 / img.width, 1.0); // downscale slightly for smooth tracing
                tempCanvas.width = img.width * scale;
                tempCanvas.height = img.height * scale;
                
                const tempCtx = tempCanvas.getContext("2d");
                tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
                
                const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                const thresholdVal = parseInt(vectorizerThreshold.value);
                const dilationVal = parseInt(vectorizerDilation.value);
                const binary = vectorizer.binarize(imgData, thresholdVal, dilationVal);
                
                // Redraw black/white pixels on canvas
                const maskCanvas = document.createElement("canvas");
                maskCanvas.width = binary.width;
                maskCanvas.height = binary.height;
                const maskCtx = maskCanvas.getContext("2d");
                const maskData = maskCtx.createImageData(binary.width, binary.height);
                
                for (let i = 0; i < binary.data.length; i++) {
                    const val = binary.data[i] === 1 ? 255 : 0;
                    const idx = i * 4;
                    maskData.data[idx] = val;
                    maskData.data[idx+1] = val;
                    maskData.data[idx+2] = val;
                    maskData.data[idx+3] = 255;
                }
                maskCtx.putImageData(maskData, 0, 0);
                
                // Swap image reference temporarily in renderer and refresh
                activeMapData.backgroundImage.href = maskCanvas.toDataURL();
                mapRenderer.render();
            } catch (err) {
                console.error("Mask generation failed", err);
            }
        } else {
            // Restore original image reference in renderer and refresh
            activeMapData.backgroundImage.href = originalImageSrc;
            mapRenderer.render();
        }
    };

    vectorizerPreviewMask.addEventListener("change", updateMaskPreview);

    // Upgraded high-safety boundary tracing fallback routine
    const runFallbackBoundaryTracing = async () => {
        try {
            const config = {
                threshold: parseInt(vectorizerThreshold.value),
                dilation: parseInt(vectorizerDilation.value),
                simplify: parseFloat(vectorizerSimplify.value),
                ocrWords: [],
                bgX: activeMapData.backgroundImage.x !== undefined ? activeMapData.backgroundImage.x : 0,
                bgY: activeMapData.backgroundImage.y !== undefined ? activeMapData.backgroundImage.y : 0,
                bgWidth: activeMapData.backgroundImage.width !== undefined ? activeMapData.backgroundImage.width : 1620,
                bgHeight: activeMapData.backgroundImage.height !== undefined ? activeMapData.backgroundImage.height : 1100
            };

            const tracedPlots = await vectorizer.vectorize(originalImageSrc, config);
            
            if (tracedPlots && tracedPlots.length > 0) {
                activeMapData.plots = tracedPlots;
                selectedPlotId = null;
                mapRenderer.selectedPlotId = null;
                
                mapRenderer.render();
                updateMetrics();
                renderPlotExplorer();
                saveDatabaseState();
                
                showToast(`Success! Traced ${tracedPlots.length} layout boundary plots successfully.`, "success");
            } else {
                showToast("No bounded plot regions detected. Widen lines by adjusting Line Threshold slider.", "error");
            }
        } catch (err) {
            console.error("Fallback tracer encountered an error:", err);
            showToast("Tracer engine encountered a pixel-analysis processing failure.", "error");
        } finally {
            btnRunVectorizer.disabled = false;
            btnRunVectorizer.innerHTML = `<i data-lucide="cpu"></i> Run Auto-Vectorizer`;
            lucide.createIcons();
        }
    };

    btnRunVectorizer.addEventListener("click", () => {
        if (!originalImageSrc) {
            showToast("Please upload a layout sketch image first to vectorize!", "error");
            return;
        }

        btnRunVectorizer.disabled = true;
        btnRunVectorizer.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Processing Tracing...`;
        lucide.createIcons();

        // High-Safety synchronous check: If Tesseract script blocked or slow, run boundaries tracing directly!
        if (typeof Tesseract === "undefined") {
            console.warn("Tesseract OCR is offline. Proceeding with boundaries tracing only.");
            showToast("OCR engine offline. Proceeding with boundary outline tracing only.", "warning");
            setTimeout(runFallbackBoundaryTracing, 50);
            return;
        }

        showToast("Scanning layout image for text labels (OCR)... Please wait.", "success");
        
        // 1. Run Tesseract.js OCR scan on background image
        Tesseract.recognize(
            originalImageSrc,
            'eng'
        ).then(({ data: { words } }) => {
            console.log("Vectorizer OCR Scan Complete:", words);
            
            // Extract clean alphanumeric strings (like "212", "234/P") and coordinates
            const ocrWords = words.map(w => ({
                text: w.text.replace(/[^a-zA-Z0-9\/+]/g, ""), 
                x: w.bbox.x0 + (w.bbox.x1 - w.bbox.x0)/2,
                y: w.bbox.y0 + (w.bbox.y1 - w.bbox.y0)/2
            })).filter(w => w.text.length >= 2);

            btnRunVectorizer.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Tracing boundaries...`;
            lucide.createIcons();

            // 2. Trigger Computer Vision contour finder & simplify boundaries
            setTimeout(async () => {
                try {
                    const config = {
                        threshold: parseInt(vectorizerThreshold.value),
                        dilation: parseInt(vectorizerDilation.value),
                        simplify: parseFloat(vectorizerSimplify.value),
                        ocrWords: ocrWords,
                        bgX: activeMapData.backgroundImage.x !== undefined ? activeMapData.backgroundImage.x : 0,
                        bgY: activeMapData.backgroundImage.y !== undefined ? activeMapData.backgroundImage.y : 0,
                        bgWidth: activeMapData.backgroundImage.width !== undefined ? activeMapData.backgroundImage.width : 1620,
                        bgHeight: activeMapData.backgroundImage.height !== undefined ? activeMapData.backgroundImage.height : 1100
                    };

                    const tracedPlots = await vectorizer.vectorize(originalImageSrc, config);
                    
                    if (tracedPlots.length === 0) {
                        showToast("No bounded plot regions detected. Try sliding Line Threshold up or down.", "error");
                        return;
                    }

                    // 3. Success! Wipe old template plots and load newly parsed ones!
                    activeMapData.plots = tracedPlots;
                    
                    // Reset selected plots
                    selectedPlotId = null;
                    mapRenderer.selectedPlotId = null;
                    
                    // Refresh view
                    mapRenderer.render();
                    updateMetrics();
                    renderPlotExplorer();
                    saveDatabaseState();

                    showToast(`Success! Traced ${tracedPlots.length} layout plots with auto-extracted names!`, "success");
                } catch (err) {
                    console.error("Vectorizer error:", err);
                    showToast("Failed to vectorize image. Verify contrast or type.", "error");
                } finally {
                    btnRunVectorizer.disabled = false;
                    btnRunVectorizer.innerHTML = `<i data-lucide="cpu"></i> Run Auto-Vectorizer`;
                    lucide.createIcons();
                }
            }, 50);
        }).catch(err => {
            console.error("OCR scan failed, running contour tracing fallback:", err);
            showToast("OCR scanning failed. Proceeding with boundaries tracing only.", "warning");
            setTimeout(runFallbackBoundaryTracing, 50);
        });
    });

    // ---------------------------------------------------------
    // 11. Final Engine Boot Initialization
    // ---------------------------------------------------------
    
    // Initialize map engine instance
    mapRenderer = new MapRenderer(
        svgCanvas,
        activeMapData,
        // Selected Plot Callback
        (plotId) => selectPlot(plotId),
        // Live Drag/Update Callback
        (plot, isDragging) => updatePlotPropertiesLive(plot, isDragging)
    );

    // Initial sidebar analytics refresh
    updateMetrics();
    renderPlotExplorer();

    // Trigger icon replacements
    lucide.createIcons();
    
    // Initial welcome toast
    showToast("AEROSTAGE Interactive Layout Engine Booted. Drag or scroll wheel inside viewport to navigate.", "success");
});
