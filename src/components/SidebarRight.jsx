import React, { useEffect, useState } from 'react';
import { Sliders, X, Loader, PencilRuler } from 'lucide-react';

export default function SidebarRight({ 
    mapData, 
    setMapData, 
    selectedPlotId, 
    setSelectedPlotId, 
    showToast,
    editMode,
    setEditMode
}) {
    const plot = selectedPlotId ? mapData.plots.find(p => p.id === selectedPlotId) : null;
    const [apiLoading, setApiLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        id: '', status: 'available', area: 0, price: 0, owner: '', notes: '', classification: 'plot'
    });

    useEffect(() => {
        if (plot) {
            setFormData({
                id: plot.id,
                status: plot.status,
                area: plot.area,
                price: plot.price,
                owner: plot.owner || '',
                notes: plot.notes || '',
                classification: plot.classification || 'plot'
            });
        }
    }, [plot, selectedPlotId]);

    // Simulate API fetch delay when selection changes
    useEffect(() => {
        if (selectedPlotId && plot) {
            setApiLoading(true);
            const timer = setTimeout(() => {
                setApiLoading(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [selectedPlotId]);

    const handleSave = (e, updatedFields = {}) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!plot) return;
        
        const dataToSave = {
            id: formData.id,
            status: formData.status,
            area: formData.area,
            price: formData.price,
            owner: formData.owner,
            notes: formData.notes,
            classification: formData.classification,
            ...updatedFields
        };
        
        const newId = dataToSave.id.trim();
        if (newId !== plot.id) {
            const conflictingPlot = mapData.plots.find(p => p.id === newId);
            if (conflictingPlot) {
                // Auto-swap names to prevent collision
                setMapData(prev => {
                    const newPlots = prev.plots.map(p => {
                        if (p.id === plot.id) {
                            return {
                                ...p,
                                id: newId,
                                status: dataToSave.status,
                                area: parseFloat(dataToSave.area) || p.area,
                                price: parseFloat(dataToSave.price) || 0,
                                owner: dataToSave.owner.trim() || null,
                                notes: dataToSave.notes.trim() || null,
                                classification: dataToSave.classification || 'plot'
                            };
                        } else if (p.id === newId) {
                            return {
                                ...p,
                                id: plot.id, // Swap name to the old ID of the current plot
                                notes: p.notes ? p.notes + " (Auto-swapped due to conflict)" : "Auto-swapped due to conflict"
                            };
                        }
                        return p;
                    });
                    return { ...prev, plots: newPlots };
                });
                
                showToast(`Swapped conflicting plot names: "${newId}" and "${plot.id}"`, "success");
                setSelectedPlotId(newId);
                return;
            }
        }
        
        setMapData(prev => {
            const newPlots = prev.plots.map(p => {
                if (p.id === plot.id) {
                    return {
                        ...p,
                        id: newId,
                        status: dataToSave.status,
                        area: parseFloat(dataToSave.area) || p.area,
                        price: parseFloat(dataToSave.price) || 0,
                        owner: dataToSave.owner.trim() || null,
                        notes: dataToSave.notes.trim() || null,
                        classification: dataToSave.classification || 'plot'
                    };
                }
                return p;
            });
            return { ...prev, plots: newPlots };
        });
        
        if (newId !== plot.id) {
            setSelectedPlotId(newId);
        }
        
        showToast(`Plot properties for "${newId}" updated successfully`, "success");
    };

    const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    const totalVal = formData.area * formData.price;

    const points = plot?.points || [];
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const minX = xs.length ? Math.min(...xs) : 0;
    const maxX = xs.length ? Math.max(...xs) : 100;
    const minY = ys.length ? Math.min(...ys) : 0;
    const maxY = ys.length ? Math.max(...ys) : 100;
    const width = maxX - minX;
    const height = maxY - minY;
    
    const pad = Math.max(width, height) * 0.15 || 15;
    const viewBox = `${minX - pad} ${minY - pad} ${width + 2 * pad} ${height + 2 * pad}`;

    const isOpen = !!(selectedPlotId && plot);

    return (
        <aside className={`editor-panel ${isOpen ? '' : 'collapsed'}`}>
            {isOpen && (
                apiLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', padding: '24px', gap: '12px', textAlign: 'center' }}>
                        <Loader size={32} className="animate-spin" style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fetching plot metadata from API...</span>
                        <style dangerouslySetInnerHTML={{__html: `
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}} />
                    </div>
                ) : (
                    <>
                        <div className="panel-header">
                            <h2><Sliders size={20} /> Selected Plot</h2>
                            <button className="btn-icon" title="Close Panel" onClick={() => setSelectedPlotId(null)}>
                                <X size={16} />
                              </button>
                        </div>
                        
                        <div className="panel-content" style={{ overflowY: 'auto' }}>
                            {/* 2D Shape Geometry Preview Card */}
                            <div className="plot-preview-card" style={{ 
                                background: 'rgba(0,0,0,0.2)', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: 'var(--radius-md)', 
                                padding: '14px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', alignSelf: 'flex-start' }}>
                                    2D Geometry Analysis
                                </span>
                                <div style={{ 
                                    width: '100%', 
                                    height: '140px', 
                                    background: 'var(--bg-main)', 
                                    backgroundImage: 'radial-gradient(var(--grid-minor) 1.2px, transparent 0)',
                                    backgroundSize: '10px 10px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}>
                                    <svg key={plot.id} style={{ width: '90%', height: '90%' }} viewBox={viewBox}>
                                        <polygon 
                                            points={points.map(p => p.join(",")).join(" ")}
                                            fill={formData.status === 'sold' ? `var(--color-sold-glow)` : (formData.classification === 'plot' ? `var(--color-${formData.status}-glow, rgba(99,102,241,0.1))` : `rgba(100,116,139,0.1)`)}
                                            stroke={formData.status === 'sold' ? `var(--color-sold)` : (formData.classification === 'plot' ? `var(--color-${formData.status}, var(--primary))` : `rgba(100,116,139,0.5)`)}
                                            strokeWidth="3"
                                            className="animated-contour"
                                            style={{ strokeLinejoin: 'round' }}
                                        />
                                        {points.map((pt, idx) => (
                                            <circle 
                                                key={idx}
                                                cx={pt[0]}
                                                cy={pt[1]}
                                                r={Math.max(3, Math.min(width, height) * 0.025)}
                                                fill="#ffffff"
                                                stroke={formData.classification === 'plot' ? `var(--color-${formData.status}, var(--primary))` : `rgba(100,116,139,0.7)`}
                                                strokeWidth="1.5"
                                            />
                                        ))}
                                    </svg>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', gap: '8px', fontSize: '0.75rem' }}>
                                    <div style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem' }}>Width Bounds</span>
                                        <strong style={{ color: 'var(--text-primary)' }}>{(width * 0.23).toFixed(1)} m</strong>
                                    </div>
                                    <div style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem' }}>Height Bounds</span>
                                        <strong style={{ color: 'var(--text-primary)' }}>{(height * 0.23).toFixed(1)} m</strong>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    className={`btn-primary ${editMode ? 'active' : ''}`}
                                    onClick={() => setEditMode(!editMode)}
                                    style={{ 
                                        width: '100%', 
                                        fontSize: '0.8rem', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '6px', 
                                        marginTop: '4px',
                                        padding: '8px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: editMode ? 'var(--accent)' : 'var(--primary)',
                                        color: '#ffffff',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        boxShadow: '0 2px 6px var(--primary-glow)',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                >
                                    <PencilRuler size={14} /> 
                                    {editMode ? 'Finish Reshaping' : 'Reshape / Edit Boundaries'}
                                </button>
                                {editMode && (
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2px', display: 'block', width: '100%' }}>
                                        Drag the white circles on the map to adjust corners.
                                    </span>
                                )}
                            </div>
 
                            {/* Property Edit Form */}
                            <form id="plot-editor-form" style={{ marginTop: '14px' }} onSubmit={handleSave}>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label>Plot Number</label>
                                    <input type="text" required value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} onBlur={() => handleSave()} />
                                </div>

                                <div className="form-row" style={{ marginBottom: '12px' }}>
                                    <div className="form-group">
                                        <label>Classification</label>
                                        <select 
                                            value={formData.classification} 
                                            onChange={e => { 
                                                const val = e.target.value;
                                                setFormData(prev => ({...prev, classification: val})); 
                                                handleSave(null, { classification: val }); 
                                            }}
                                        >
                                            <option value="plot">Plot / Parcel</option>
                                            <option value="rental_house">Rental House</option>
                                            <option value="pg">PG Accommodation</option>
                                            <option value="room">Room</option>
                                            <option value="bogithu">Bogithu (Lease)</option>
                                            <option value="road">Roadway</option>
                                            <option value="park">Park / Greenery</option>
                                            <option value="amenity">Amenity / Utility</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Status</label>
                                        <select 
                                            value={formData.status} 
                                            className={`status-select status-select-${formData.status}`}
                                            onChange={e => { 
                                                const val = e.target.value;
                                                setFormData(prev => ({...prev, status: val})); 
                                                handleSave(null, { status: val }); 
                                            }}
                                        >
                                            <option value="available">Available</option>
                                            <option value="reserved">Reserved</option>
                                            <option value="sold">Sold</option>
                                            <option value="premium">Premium</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row" style={{ marginBottom: '12px' }}>
                                    <div className="form-group">
                                        <label>Area (m²)</label>
                                        <input type="number" step="0.01" required value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} onBlur={() => handleSave()} />
                                    </div>
                                    <div className="form-group">
                                        <label>Price (₹/m²)</label>
                                        <input type="number" step="1" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} onBlur={() => handleSave()} />
                                    </div>
                                </div>

                                <div className="form-row" style={{ marginBottom: '12px' }}>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label>Total Value</label>
                                        <input 
                                            type="number" 
                                            value={Math.round(formData.area * formData.price) || 0} 
                                            onChange={e => {
                                                const newTotalVal = parseFloat(e.target.value) || 0;
                                                const area = parseFloat(formData.area) || 1;
                                                const newPrice = Math.round(newTotalVal / area);
                                                setFormData({
                                                    ...formData,
                                                    price: newPrice
                                                });
                                            }} 
                                            onBlur={() => handleSave()} 
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label>Registered Owner</label>
                                    <input type="text" placeholder="Enter owner's name..." value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} onBlur={() => handleSave()} />
                                </div>

                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label>Location & Notes</label>
                                    <textarea placeholder="Enter special remarks..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} onBlur={() => handleSave()} style={{ minHeight: '60px' }}></textarea>
                                </div>
                            </form>
                        </div>
                    </>
                )
            )}
        </aside>
    );
}
