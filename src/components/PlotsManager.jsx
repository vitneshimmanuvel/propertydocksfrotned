import React, { useState, useMemo } from 'react';
import { Landmark, Search, Filter, Edit2, CheckCircle2, AlertCircle, Ban, X, Save } from 'lucide-react';

export default function PlotsManager({ 
    database, 
    setDatabase, 
    showToast 
}) {
    const layouts = database.layouts || [];
    const [selectedLayoutId, setSelectedLayoutId] = useState(database.activeLayoutId || (layouts[0]?.id || ""));
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    
    // Editing plot state
    const [editingPlot, setEditingPlot] = useState(null); // plot object
    const [plotForm, setPlotForm] = useState({
        status: 'available',
        category: 'general',
        area: '',
        price: '',
        owner: ''
    });

    const activeLayout = useMemo(() => {
        return layouts.find(l => l.id === selectedLayoutId) || layouts[0];
    }, [layouts, selectedLayoutId]);

    const plots = useMemo(() => {
        return activeLayout?.plots || [];
    }, [activeLayout]);

    // Filtered plots list
    const filteredPlots = useMemo(() => {
        return plots.filter(p => {
            const matchesSearch = p.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (p.owner || "").toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
            const matchesCategory = categoryFilter === 'all' || (p.category || 'general') === categoryFilter;

            return matchesSearch && matchesStatus && matchesCategory;
        });
    }, [plots, searchQuery, statusFilter, categoryFilter]);

    // Open Plot Edit
    const handleOpenEdit = (plot) => {
        setEditingPlot(plot);
        setPlotForm({
            status: plot.status || 'available',
            category: plot.category || 'general',
            area: plot.area || '',
            price: plot.price || '',
            owner: plot.owner || ''
        });
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setPlotForm(prev => ({ ...prev, [name]: value }));
    };

    // Save edited plot
    const handleSavePlot = (e) => {
        e.preventDefault();
        
        setDatabase(prev => {
            const updatedLayouts = prev.layouts.map(l => {
                if (l.id === selectedLayoutId) {
                    return {
                        ...l,
                        plots: l.plots.map(p => {
                            if (p.id === editingPlot.id) {
                                return {
                                    ...p,
                                    status: plotForm.status,
                                    category: plotForm.category,
                                    area: plotForm.area,
                                    price: plotForm.price,
                                    owner: plotForm.status === 'sold' || plotForm.status === 'booked' ? plotForm.owner.trim() : ''
                                };
                            }
                            return p;
                        })
                    };
                }
                return l;
            });

            return {
                ...prev,
                layouts: updatedLayouts
            };
        });

        showToast(`Plot ${editingPlot.id} updated successfully.`, "success");
        setEditingPlot(null);
    };

    return (
        <div className="plots-dashboard" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', background: 'var(--bg-main)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Landmark size={24} style={{ color: 'var(--primary)' }} /> Plot Inventory Database
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Search, filter, inspect, and modify plot properties across your layout projects.</p>
                </div>
                
                {/* Layout Sheet Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Layout:</span>
                    <select
                        value={selectedLayoutId}
                        onChange={(e) => {
                            setSelectedLayoutId(e.target.value);
                            setEditingPlot(null);
                        }}
                        className="theme-selector"
                        style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                    >
                        {layouts.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Filter controls panel */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                {/* Search Bar */}
                <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                        type="text"
                        placeholder="Search by Plot ID or Owner Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '10px 10px 10px 36px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                </div>

                {/* Status Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="theme-selector"
                        style={{ padding: '8px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                        <option value="all">All Statuses</option>
                        <option value="available">Available (Green)</option>
                        <option value="sold">Sold (Red)</option>
                        <option value="booked">Booked (Yellow)</option>
                    </select>
                </div>

                {/* Category Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select 
                        value={categoryFilter} 
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="theme-selector"
                        style={{ padding: '8px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                        <option value="all">All Categories</option>
                        <option value="general">General Plots</option>
                        <option value="premium">Premium Plots</option>
                    </select>
                </div>
            </div>

            {/* Main Table view */}
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {filteredPlots.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <Landmark size={40} style={{ opacity: 0.15 }} />
                        <h3>No matching plots found</h3>
                        <p style={{ fontSize: '0.8rem' }}>Try expanding your search query or adjusting filters.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)' }}>
                                    <th style={{ padding: '12px 16px' }}>Plot ID</th>
                                    <th style={{ padding: '12px 16px' }}>Status</th>
                                    <th style={{ padding: '12px 16px' }}>Category</th>
                                    <th style={{ padding: '12px 16px' }}>Size (sq.ft.)</th>
                                    <th style={{ padding: '12px 16px' }}>Price Rate / sq.ft</th>
                                    <th style={{ padding: '12px 16px' }}>Owner Name</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPlots.map((plot) => {
                                    const isPremium = plot.category === 'premium';
                                    
                                    return (
                                        <tr key={plot.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: 'var(--text-primary)' }}>
                                            <td style={{ padding: '14px 16px', fontWeight: 700 }}>{plot.id}</td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{
                                                    fontSize: '0.68rem',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    textTransform: 'uppercase',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    background: plot.status === 'sold' ? 'rgba(239,68,68,0.15)' : plot.status === 'booked' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                                                    color: plot.status === 'sold' ? '#ef4444' : plot.status === 'booked' ? '#f59e0b' : '#10b981',
                                                    border: `1px solid ${plot.status === 'sold' ? 'rgba(239,68,68,0.2)' : plot.status === 'booked' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`
                                                }}>
                                                    {plot.status === 'sold' ? <Ban size={10} /> : plot.status === 'booked' ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                                                    {plot.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    color: isPremium ? 'var(--primary)' : 'var(--text-secondary)'
                                                }}>
                                                    {isPremium ? '★ Premium' : 'General'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>{plot.area || '1,200'} sq.ft</td>
                                            <td style={{ padding: '14px 16px' }}>₹{plot.price || '850'}</td>
                                            <td style={{ padding: '14px 16px', color: plot.owner ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                {plot.owner || '—'}
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                <button 
                                                    className="btn-secondary" 
                                                    onClick={() => handleOpenEdit(plot)}
                                                    style={{ padding: '5px 10px', fontSize: '0.72rem', borderRadius: 'var(--radius-sm)', gap: '4px' }}
                                                >
                                                    <Edit2 size={12} /> Edit
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Inline Plot Property Editor Modal */}
            {editingPlot && (
                <div className="custom-modal-overlay animate-fade-in" style={{ zIndex: 200 }}>
                    <div className="custom-modal" style={{ maxWidth: '440px', width: '90%' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            Edit Properties for Plot {editingPlot.id}
                        </h3>
                        
                        <form onSubmit={handleSavePlot} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                            {/* Availability Status */}
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Availability Status</label>
                                <select 
                                    name="status"
                                    value={plotForm.status}
                                    onChange={handleFormChange}
                                    style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                >
                                    <option value="available">Available (Green)</option>
                                    <option value="booked">Booked (Yellow)</option>
                                    <option value="sold">Sold / Reserved (Red)</option>
                                </select>
                            </div>

                            {/* Category type */}
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Plot Tier / Category</label>
                                <select 
                                    name="category"
                                    value={plotForm.category}
                                    onChange={handleFormChange}
                                    style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                >
                                    <option value="general">General Plot</option>
                                    <option value="premium">★ Premium Plot</option>
                                </select>
                            </div>

                            {/* Size & Pricing Rate */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Area (sq.ft.)</label>
                                    <input 
                                        type="number"
                                        name="area"
                                        required
                                        placeholder="e.g. 1500"
                                        value={plotForm.area}
                                        onChange={handleFormChange}
                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Base Rate (₹/sq.ft.)</label>
                                    <input 
                                        type="number"
                                        name="price"
                                        required
                                        placeholder="e.g. 950"
                                        value={plotForm.price}
                                        onChange={handleFormChange}
                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            {/* Buyer Owner name (if Sold or Booked) */}
                            {(plotForm.status === 'sold' || plotForm.status === 'booked') && (
                                <div className="form-group animate-fade-in">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Owner / Buyer Name</label>
                                    <input 
                                        type="text"
                                        name="owner"
                                        required
                                        placeholder="Enter customer name..."
                                        value={plotForm.owner}
                                        onChange={handleFormChange}
                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setEditingPlot(null)} style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', gap: '4px' }}>
                                    <Save size={12} /> Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
