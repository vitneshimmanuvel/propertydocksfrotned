import React, { useMemo, useState } from 'react';
import { Search, Settings, Trash2, Cpu } from 'lucide-react';

export default function SidebarLeft({ 
    mapData, 
    setMapData, 
    selectedPlotId, 
    setSelectedPlotId, 
    activeFilter, 
    setActiveFilter, 
    searchQuery, 
    setSearchQuery, 
    showToast,
    collapsed,
    isLocked,
    runAutoVectorization,
    ocrWords,
    vecThreshold,
    setVecThreshold,
    vecDilation,
    setVecDilation,
    vecSimplify,
    setVecSimplify
}) {
    const [vectorizerSettingsOpen, setVectorizerSettingsOpen] = useState(false);

    const handleClearAllPlots = () => {
        if (window.confirm("Are you sure you want to permanently clear all plots and boundaries?")) {
            setMapData(prev => ({
                ...prev,
                plots: [],
                roads: []
            }));
            setSelectedPlotId(null);
            showToast("Canvas cleared.", "warning");
        }
    };

    const handleAutoVectorize = async () => {
        if (!mapData.backgroundImage?.href) {
            showToast("Please upload a reference layout first.", "error");
            return;
        }
        await runAutoVectorization(mapData.backgroundImage.href, ocrWords);
    };

    const updateBgProps = (key, val) => {
        setMapData(prev => ({
            ...prev,
            backgroundImage: { ...prev.backgroundImage, [key]: val }
        }));
    };

    // Filter plots based on active tab and query input
    const filteredPlots = useMemo(() => {
        return mapData.plots.filter(p => {
            const classification = p.classification || 'plot';
            const matchesFilter = activeFilter === "all" || (classification === 'plot' && p.status === activeFilter);
            const query = searchQuery.toLowerCase();
            const matchesSearch = p.id.toLowerCase().includes(query) || 
                                 (p.owner && p.owner.toLowerCase().includes(query)) ||
                                 (p.notes && p.notes.toLowerCase().includes(query));
            return matchesFilter && matchesSearch;
        });
    }, [mapData.plots, activeFilter, searchQuery]);

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed-strip' : ''}`}>
            {collapsed ? (
                /* Collapsed Narrow View */
                <>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', width: '100%', paddingBottom: '6px', flexShrink: 0 }}>
                        PLOTS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' }}>
                        {filteredPlots.map(p => {
                            const isSelected = selectedPlotId === p.id;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedPlotId(p.id)}
                                    title={p.id}
                                    style={{
                                        width: '100%',
                                        padding: '6px 4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        borderRadius: '4px',
                                        background: isSelected ? 'var(--primary)' : 'var(--bg-surface)',
                                        color: isSelected ? '#ffffff' : 'var(--text-primary)',
                                        border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        transition: 'all 0.15s ease',
                                        lineHeight: 1.2,
                                        flexShrink: 0
                                    }}
                                >
                                    {p.id.replace(/^(?:plot|lot|p|l)?\s*[-._\s]\s*/i, '').trim()}
                                </button>
                            );
                        })}
                    </div>
                </>
            ) : (
                /* Full Sidebar Content */
                <>
                    <div className="layouts-subtitle" style={{ marginTop: '-4px', marginBottom: '8px' }}>
                        ALL PLOTS ({mapData.plots.filter(p => !p.classification || p.classification === 'plot').length})
                    </div>

                    {/* Search and Filters */}
                    <div className="search-filter-box" style={{ padding: '0px', border: 'none', background: 'transparent', gap: '12px', marginBottom: '16px' }}>
                        <div className="search-wrapper">
                            <Search size={14} />
                            <input 
                                type="text" 
                                placeholder="Search plot number..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                style={{ padding: '8px 12px 8px 32px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                            />
                        </div>
                        
                        <div className="filter-row" style={{ gap: '4px' }}>
                            {['all', 'available', 'reserved', 'sold', 'premium'].map(f => (
                                <button 
                                    key={f} 
                                    className={`btn-filter ${activeFilter === f ? 'active' : ''}`} 
                                    onClick={() => setActiveFilter(f)}
                                    style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                                >
                                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Plot vertical list scrollbox */}
                    <div className="layouts-list">
                        {filteredPlots.map(p => {
                            const classification = p.classification || 'plot';
                            return (
                                <div 
                                    key={p.id} 
                                    className={`layout-plot-item ${p.id === selectedPlotId ? 'selected' : ''}`}
                                    onClick={() => setSelectedPlotId(p.id)}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <span>{p.id}</span>
                                    {classification !== 'plot' ? (
                                        <span className={`classification-badge badge-${classification}`} style={{ textTransform: 'capitalize' }}>
                                            {classification.replace('_', ' ')}
                                        </span>
                                    ) : (
                                        <span style={{ 
                                            width: '8px', 
                                            height: '8px', 
                                            borderRadius: '50%', 
                                            background: `var(--color-${p.status})`,
                                            boxShadow: `0 0 6px var(--color-${p.status})`,
                                            flexShrink: 0
                                        }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Collapsible Accordion Cog Settings */}
                    <details 
                        open={vectorizerSettingsOpen} 
                        onToggle={(e) => setVectorizerSettingsOpen(e.target.open)}
                        style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}
                    >
                        <summary style={{ cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', userSelect: 'none' }}>
                            <Settings size={14} /> Vectorizer Settings
                        </summary>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', paddingBottom: '4px' }}>
                            <div className="form-group" style={{ gap: '4px' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    <span>Line Threshold</span>
                                    <span>{vecThreshold}</span>
                                </label>
                                <input type="range" min="30" max="220" value={vecThreshold} onChange={(e) => setVecThreshold(parseInt(e.target.value))} style={{ height: '4px', padding: 0 }} />
                            </div>

                            <div className="form-group" style={{ gap: '4px' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    <span>Line Dilation (Thickness)</span>
                                    <span>{vecDilation}px</span>
                                </label>
                                <input type="range" min="1" max="5" value={vecDilation} onChange={(e) => setVecDilation(parseInt(e.target.value))} style={{ height: '4px', padding: 0 }} />
                            </div>

                            <div className="form-group" style={{ gap: '4px' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    <span>Simplify Tolerance (Straighter lines)</span>
                                    <span>{vecSimplify}</span>
                                </label>
                                <input type="range" min="1.0" max="15.0" step="0.5" value={vecSimplify} onChange={(e) => setVecSimplify(parseFloat(e.target.value))} style={{ height: '4px', padding: 0 }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                                <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={handleAutoVectorize}>
                                    <Cpu size={12} /> Vectorize
                                </button>
                                <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }} onClick={handleClearAllPlots}>
                                    <Trash2 size={12} /> Clear
                                </button>
                            </div>
                        </div>
                    </details>
                </>
            )}
        </aside>
    );
}
