import React, { useEffect, useRef, useState } from 'react';
import { Pointer, Move, Maximize, PencilRuler, PlusCircle, Trash2, Type, Milestone, Grid3X3, Palette, FileText, Minus, Plus, Settings, Lock, Unlock } from 'lucide-react';
import MapRenderer from '../utils/MapRenderer';

export default function MapWorkspace({ 
    mapData, 
    setMapData, 
    selectedPlotId, 
    setSelectedPlotId, 
    currentTool, 
    setCurrentTool, 
    layers, 
    setLayers, 
    theme, 
    editMode, 
    setEditMode, 
    showToast,
    isLocked,
    setIsLocked,
    isAdmin = true
}) {
    const svgRef = useRef(null);
    const rendererRef = useRef(null);
    const [currentZoom, setCurrentZoom] = useState(0.9);

    // Initialize map renderer once
    useEffect(() => {
        if (svgRef.current && !rendererRef.current) {
            rendererRef.current = new MapRenderer(
                svgRef.current,
                mapData,
                (plotId) => {
                    setSelectedPlotId(plotId);
                },
                (updatedPlot, isDragging) => {
                    setMapData(prev => {
                        const newPlots = prev.plots.map(p => p.id === updatedPlot.id ? updatedPlot : p);
                        return { ...prev, plots: newPlots };
                    });
                },
                (zoomLevel) => {
                    setCurrentZoom(zoomLevel);
                }
            );
            rendererRef.current.isAdmin = isAdmin;
        }
    }, []);

    // Sync admin state to renderer if changed
    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.isAdmin = isAdmin;
        }
    }, [isAdmin]);

    // Sync state changes into the renderer
    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.data = mapData;
            rendererRef.current.render();
        }
    }, [mapData]);

    // Auto-center the map layout sheet on load, window resize, layout change, or mounting when size becomes actual and non-zero
    useEffect(() => {
        if (!svgRef.current) return;
        
        const handleResize = () => {
            if (rendererRef.current) {
                rendererRef.current.resetZoom();
                setCurrentZoom(rendererRef.current.zoom);
            }
        };

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                    handleResize();
                }
            }
        });
        
        resizeObserver.observe(svgRef.current);
        
        // Initial fallback timer to ensure rendering completes
        const timer = setTimeout(handleResize, 100);
        
        return () => {
            resizeObserver.disconnect();
            clearTimeout(timer);
        };
    }, [mapData?.id]);

    // Pan to selected plot centroid
    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.setSelectedPlot(selectedPlotId);
            
            if (isAdmin) {
                // For admin, auto-pan to selected plot centroid for editing if unlocked,
                // but if it is locked, keep it centered and static like customer portal!
                if (selectedPlotId && !editMode && !isLocked) {
                    const plot = mapData.plots.find(p => p.id === selectedPlotId);
                    if (plot) {
                        const centroid = rendererRef.current.calculateCentroid(plot.points);
                        const rect = svgRef.current.getBoundingClientRect();
                        const targetPanX = (rect.width - 360) / 2 - centroid.x * rendererRef.current.zoom;
                        const targetPanY = rect.height / 2 - centroid.y * rendererRef.current.zoom;
                        
                        rendererRef.current.panX = targetPanX;
                        rendererRef.current.panY = targetPanY;
                        rendererRef.current.updateTransform();
                        rendererRef.current.render();
                    }
                } else {
                    rendererRef.current.resetZoom();
                    setCurrentZoom(rendererRef.current.zoom);
                    
                    if (!selectedPlotId) {
                        if (rendererRef.current.editMode) {
                            rendererRef.current.setEditMode(false);
                            setEditMode(false);
                        }
                    }
                }
            } else {
                // For customer view, adjust pan positioning to account for the drawer overlay but retain user's current zoom scale
                rendererRef.current.resetZoom(true);
                setCurrentZoom(rendererRef.current.zoom);
            }
        }
    }, [selectedPlotId]);

    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.setTheme(theme);
        }
    }, [theme]);

    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.setEditMode(editMode);
        }
    }, [editMode]);

    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.setTool(currentTool);
        }
    }, [currentTool]);

    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.setLayers(layers);
        }
    }, [layers]);

    const handleZoomReset = () => {
        if (rendererRef.current) {
            rendererRef.current.resetZoom();
            setCurrentZoom(rendererRef.current.zoom);
            showToast("Map workspace reset to global viewport fits", "success");
        }
    };

    const handleZoomIn = () => {
        if (rendererRef.current) {
            const nextZoom = Math.min(5.0, rendererRef.current.zoom + 0.1);
            rendererRef.current.setZoomCentered(nextZoom);
            setCurrentZoom(nextZoom);
        }
    };

    const handleZoomOut = () => {
        if (rendererRef.current) {
            const nextZoom = Math.max(0.15, rendererRef.current.zoom - 0.1);
            rendererRef.current.setZoomCentered(nextZoom);
            setCurrentZoom(nextZoom);
        }
    };

    const handleAddPlot = () => {
        if (!rendererRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const screenCenterX = rect.width / 2;
        const screenCenterY = rect.height / 2;
        const svgCoords = rendererRef.current.screenToSVG(screenCenterX, screenCenterY);
        
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

        let newPlotIndex = mapData.plots.length + 1;
        let newPlotId = `PLOT-${newPlotIndex}`;
        while (mapData.plots.some(p => p.id === newPlotId)) {
            newPlotIndex++;
            newPlotId = `PLOT-${newPlotIndex}`;
        }

        const newPlot = {
            id: newPlotId, status: "available", area: rendererRef.current.calculatePolygonArea(newPoints),
            price: 300, owner: null, notes: "Custom newly-created subdivision block.",
            points: newPoints, labelOffset: { x: 0, y: 0 }
        };

        setMapData(prev => ({ ...prev, plots: [...prev.plots, newPlot] }));
        setSelectedPlotId(newPlotId);
        setEditMode(true);
        showToast(`Plot ${newPlotId} created at center coordinate screen. Drag handle corner nodes to adapt geometry limits.`, "success");
    };

    const handleDeletePlot = () => {
        if (!selectedPlotId) return;
        if (window.confirm(`Are you sure you want to permanently delete Plot boundary "${selectedPlotId}"?`)) {
            setMapData(prev => ({ ...prev, plots: prev.plots.filter(p => p.id !== selectedPlotId) }));
            setSelectedPlotId(null);
            showToast(`Plot ${selectedPlotId} permanently deleted from inventory records`, "warning");
        }
    };

    const handleToolSelect = () => {
        setCurrentTool("select");
    };

    const handleToolPan = () => {
        setCurrentTool("pan");
        if (editMode) setEditMode(false);
    };

    const toggleLayer = (key) => {
        setLayers(prev => ({ ...prev, [key]: !prev[key] }));
    };

    let fileName = mapData.name || "Property Docs Layout Sheet";
    if (mapData.backgroundImage?.name) {
        const parts = mapData.backgroundImage.name.split('.');
        const ext = parts.length > 1 ? parts[parts.length - 1] : '';
        if (ext) {
            fileName = `${fileName}.${ext}`;
        }
    } else {
        fileName = `${fileName}.png`;
    }

    return (
        <main className={`map-workspace tool-${currentTool} ${isAdmin ? 'is-admin' : 'is-user'} ${selectedPlotId ? 'has-selected-plot' : ''}`} id="canvas-workspace" style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Invisible hover trigger for Top Canvas Header Bar */}
            <div 
                className="canvas-header-bar-trigger" 
                style={{ position: 'absolute', top: 0, left: 0, height: '12px', zIndex: 49, pointerEvents: 'auto' }} 
            />

            {/* Top Canvas Header Bar */}
            <div className="canvas-header-bar">
                <div className="canvas-file-info">
                    <FileText size={16} />
                    <span>{fileName}</span>
                </div>
                
                <div className="canvas-controls">
                    <div style={{ display: 'flex', gap: '4px', marginRight: '16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '2px 6px', alignItems: 'center' }}>
                        {/* Tools Group */}
                        <button 
                            onClick={handleToolSelect} 
                            className={`btn-icon-toggle ${currentTool === 'select' ? 'active' : ''}`}
                            style={{
                                border: 'none',
                                background: currentTool === 'select' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                                color: currentTool === 'select' ? 'var(--primary)' : 'var(--text-secondary)',
                                borderRadius: '50%',
                                width: '26px',
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            title="Select Tool"
                        >
                            <Pointer size={13} />
                        </button>
                        <button 
                            onClick={handleToolPan} 
                            className={`btn-icon-toggle ${currentTool === 'pan' ? 'active' : ''}`}
                            style={{
                                border: 'none',
                                background: currentTool === 'pan' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                                color: currentTool === 'pan' ? 'var(--primary)' : 'var(--text-secondary)',
                                borderRadius: '50%',
                                width: '26px',
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            title="Pan Map Tool"
                        >
                            <Move size={13} />
                        </button>

                        {/* Admin CAD Tools Group */}
                        {isAdmin && (
                            <>
                                <div style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 2px' }} />
                                <button 
                                    onClick={() => { if(selectedPlotId) setEditMode(!editMode) }} 
                                    disabled={!selectedPlotId}
                                    className={`btn-icon-toggle ${editMode ? 'active' : ''}`}
                                    style={{
                                        border: 'none',
                                        background: editMode ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                        color: editMode ? '#ef4444' : (!selectedPlotId ? 'var(--text-muted)' : 'var(--text-secondary)'),
                                        borderRadius: '50%',
                                        width: '26px',
                                        height: '26px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: selectedPlotId ? 'pointer' : 'not-allowed',
                                        opacity: selectedPlotId ? 1 : 0.4,
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="Edit Selected Plot Boundaries"
                                >
                                    <PencilRuler size={13} />
                                </button>
                                <button 
                                    onClick={handleAddPlot} 
                                    className="btn-icon-toggle"
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        borderRadius: '50%',
                                        width: '26px',
                                        height: '26px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="Add New custom Plot Boundary"
                                >
                                    <PlusCircle size={13} />
                                </button>
                                <button 
                                    onClick={handleDeletePlot} 
                                    disabled={!selectedPlotId}
                                    className="btn-icon-toggle"
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: !selectedPlotId ? 'var(--text-muted)' : '#ef4444',
                                        borderRadius: '50%',
                                        width: '26px',
                                        height: '26px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: selectedPlotId ? 'pointer' : 'not-allowed',
                                        opacity: selectedPlotId ? 1 : 0.4,
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="Delete Selected Plot"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </>
                        )}

                        {/* Separator line */}
                        <div style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 2px' }} />

                        {/* Layers Group */}
                        <button 
                            onClick={() => toggleLayer('labels')} 
                            className={`btn-icon-toggle ${layers.labels ? 'active' : ''}`}
                            style={{
                                border: 'none',
                                background: layers.labels ? 'rgba(118, 153, 4, 0.15)' : 'transparent',
                                color: layers.labels ? 'var(--primary)' : 'var(--text-secondary)',
                                borderRadius: '50%',
                                width: '26px',
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                                }}
                            title="Toggle Plot Labels"
                        >
                            <Type size={13} />
                        </button>
                        <button 
                            onClick={() => toggleLayer('roads')} 
                            className={`btn-icon-toggle ${layers.roads ? 'active' : ''}`}
                            style={{
                                border: 'none',
                                background: layers.roads ? 'rgba(118, 153, 4, 0.15)' : 'transparent',
                                color: layers.roads ? 'var(--primary)' : 'var(--text-secondary)',
                                borderRadius: '50%',
                                width: '26px',
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            title="Toggle Roads Layer"
                        >
                            <Milestone size={13} />
                        </button>
                        <button 
                            onClick={() => toggleLayer('grids')} 
                            className={`btn-icon-toggle ${layers.grids ? 'active' : ''}`}
                            style={{
                                border: 'none',
                                background: layers.grids ? 'rgba(118, 153, 4, 0.15)' : 'transparent',
                                color: layers.grids ? 'var(--primary)' : 'var(--text-secondary)',
                                borderRadius: '50%',
                                width: '26px',
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            title="Toggle Blueprint Grid"
                        >
                            <Grid3X3 size={13} />
                        </button>
                        <button 
                            onClick={() => toggleLayer('statusColors')} 
                            className={`btn-icon-toggle ${layers.statusColors ? 'active' : ''}`}
                            style={{
                                border: 'none',
                                background: layers.statusColors ? 'rgba(118, 153, 4, 0.15)' : 'transparent',
                                color: layers.statusColors ? 'var(--primary)' : 'var(--text-secondary)',
                                borderRadius: '50%',
                                width: '26px',
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            title="Toggle Accent Colors"
                        >
                            <Palette size={13} />
                        </button>
                    </div>
                    {mapData.backgroundImage?.href && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '4px 12px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>OPACITY:</span>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.05" 
                                value={mapData.backgroundImage.opacity !== undefined ? mapData.backgroundImage.opacity : 0.5} 
                                onChange={(e) => {
                                    setMapData(prev => ({
                                        ...prev,
                                        backgroundImage: {
                                            ...prev.backgroundImage,
                                            opacity: parseFloat(e.target.value)
                                        }
                                    }));
                                }} 
                                style={{ width: '80px', height: '4px', cursor: 'pointer', padding: 0 }} 
                                title="Adjust background opacity"
                            />
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: '32px', textAlign: 'right' }}>
                                {Math.round((mapData.backgroundImage.opacity !== undefined ? mapData.backgroundImage.opacity : 0.5) * 100)}%
                            </span>
                        </div>
                    )}


                    {isAdmin && (
                        <button 
                            className={`btn-canvas-action ${isLocked ? 'active' : ''}`} 
                            onClick={() => {
                                setIsLocked(!isLocked);
                                showToast(isLocked ? "Viewport synchronization unlocked (manual scrolling)." : "Viewport synchronization locked (auto-focusing).", "info");
                            }} 
                            style={{ padding: '6px' }} 
                            title={isLocked ? "Unlock Viewport Synchronization" : "Lock Viewport Synchronization"}
                        >
                            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                    )}
                </div>
            </div>





            {/* Main Interactive SVG */}
            <svg 
                id="cad-canvas" 
                className="map-svg-container" 
                viewBox="0 0 1600 1000" 
                ref={svgRef}
                style={{ flex: 1, width: '100%', height: '100%' }}
            ></svg>
            
            {/* Bottom Floating Zoom Controls */}
            <div className="bottom-zoom-controls">
                <button className="btn-canvas-action" onClick={handleZoomReset}>
                    <Maximize size={14} />
                    <span>Fit to Screen</span>
                </button>
                
                <div className="zoom-slider-container">
                    <span className="zoom-label">ZOOM:</span>
                    <button 
                        onClick={handleZoomOut} 
                        title="Zoom Out"
                        className="btn-zoom-adjust-icon"
                    >
                        <Minus size={13} />
                    </button>
                    <input 
                        type="range" 
                        min="0.15" 
                        max="2.5" 
                        step="0.05" 
                        value={currentZoom} 
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (rendererRef.current) {
                                rendererRef.current.setZoomCentered(val);
                            }
                            setCurrentZoom(val);
                        }} 
                        className="zoom-slider-input"
                        title="Adjust zoom level"
                    />
                    <button 
                        onClick={handleZoomIn} 
                        title="Zoom In"
                        className="btn-zoom-adjust-icon"
                    >
                        <Plus size={13} />
                    </button>
                    <span className="zoom-percent-text">
                        {Math.round(currentZoom * 100)}%
                    </span>
                </div>
            </div>
            
            <div id="canvas-tooltip" className="custom-tooltip"></div>
        </main>
    );
}
