import React, { useMemo } from 'react';
import { LayoutDashboard, Landmark, Home, Building, Users, ArrowRight, ShieldCheck, MapPin, Eye, EyeOff } from 'lucide-react';

export default function DashboardManager({ 
    database, 
    setAdminTab,
    showToast 
}) {
    const ownerListings = database.ownerListings || [];
    const clients = database.clients || [];

    const COMMERCIAL_CATS = ['commercial', 'office', 'shop', 'warehouse', 'industrial', 'commercial_land', 'showroom'];

    // Calculate 100% real database metrics
    const stats = useMemo(() => {
        const totalProperties = ownerListings.length;
        const activeListings = ownerListings.filter(l => (l.status || 'available') === 'available').length;
        const disabledListings = ownerListings.filter(l => l.status === 'disabled').length;

        const commercialCount = ownerListings.filter(l => COMMERCIAL_CATS.some(c => (l.category || '').toLowerCase().includes(c))).length;
        const residentialCount = totalProperties - commercialCount;
        const totalViewsCount = ownerListings.reduce((sum, l) => sum + (Number(l.viewsCount || l.views || 0)), 0);

        // Unique property owners count across clients table and listings table
        const ownerPhones = new Set();
        clients.forEach(c => c.phone && ownerPhones.add(c.phone.replace(/\D/g, '').slice(-10)));
        ownerListings.forEach(l => {
            const p = (l.contactPhone || l.ownerPhone || '').replace(/\D/g, '').slice(-10);
            if (p) ownerPhones.add(p);
        });
        const totalOwnersCount = ownerPhones.size > 0 ? ownerPhones.size : clients.length;

        return {
            totalProperties,
            activeListings,
            disabledListings,
            totalOwnersCount,
            residentialCount,
            commercialCount,
            totalViewsCount
        };
    }, [ownerListings, clients]);

    // Format property price
    const formatPropertyPrice = (loc) => {
        if (!loc) return '—';
        if (loc.category === 'bogithu' && loc.bogithuAmount) {
            return `₹${Number(loc.bogithuAmount).toLocaleString('en-IN')} (Lease)`;
        }
        if (loc.rentAmount) {
            return `₹${Number(loc.rentAmount).toLocaleString('en-IN')}/m (Rent)`;
        }
        if (loc.price) {
            return `₹${Number(loc.price).toLocaleString('en-IN')}`;
        }
        return '—';
    };

    // Get recent 6 listings sorted by created date
    const recentProperties = useMemo(() => {
        return [...ownerListings]
            .sort((a, b) => {
                const dateA = new Date(a.createdAt || a.created_at || 0);
                const dateB = new Date(b.createdAt || b.created_at || 0);
                return dateB - dateA;
            })
            .slice(0, 6);
    }, [ownerListings]);

    return (
        <div className="dashboard-view" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', background: 'var(--bg-main)' }}>
            
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <LayoutDashboard size={24} style={{ color: 'var(--primary)' }} /> Executive Real Estate Dashboard
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Real-time live database overview of Property Owners, Residential & Commercial property listings.</p>
            </div>

            {/* KPI Cards Grid — 100% Real Database Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '20px' }}>
                
                {/* Total Properties Listed */}
                <div className="metric-card" style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Properties</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(146, 18, 20, 0.1)', color: '#921214' }}>
                            <Landmark size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalProperties}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Properties in Database</span>
                </div>

                {/* Active Public Listings */}
                <div className="metric-card" style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Active Public Listings</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                            <Eye size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>{stats.activeListings}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Visible to Website Customers</span>
                </div>

                {/* Disabled / Internal Listings */}
                <div className="metric-card" style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Disabled Listings</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                            <EyeOff size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{stats.disabledListings}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hidden from Public Website</span>
                </div>

                {/* Registered Property Owners */}
                <div className="metric-card" style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Property Owners</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                            <Users size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalOwnersCount}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Property Owner Contacts</span>
                </div>

                {/* Total Property Views / Clicks KPI */}
                <div className="metric-card" style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid rgba(2, 132, 199, 0.3)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Clicks / Views</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' }}>
                            <Eye size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7' }}>{stats.totalViewsCount.toLocaleString('en-IN')}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Customer Card Views & Clicks</span>
                </div>

                {/* Residential vs Commercial Split */}
                <div className="metric-card" style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Categories Breakdown</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                            <Home size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                        🏠 {stats.residentialCount} Res • 🏢 {stats.commercialCount} Comm
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Residential & Commercial Listings</span>
                </div>

            </div>

            {/* Middle Section: Recent Property Listings Data Table */}
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Recent Property Listings</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latest property listings in PostgreSQL database</span>
                    </div>
                    <button className="btn-secondary" onClick={() => setAdminTab('clients')} style={{ fontSize: '0.78rem', padding: '8px 14px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '6px', background: '#921214', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                        Manage Property Owners & Listings <ArrowRight size={14} />
                    </button>
                </div>

                {recentProperties.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No property listings recorded in database yet. Click "Property Owners Directory" to add properties.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <th style={{ padding: '12px 10px' }}>Property Title</th>
                                    <th style={{ padding: '12px 10px' }}>Property Owner</th>
                                    <th style={{ padding: '12px 10px' }}>Category</th>
                                    <th style={{ padding: '12px 10px' }}>Location</th>
                                    <th style={{ padding: '12px 10px' }}>Price / Rent</th>
                                    <th style={{ padding: '12px 10px' }}>Clicks / Views</th>
                                    <th style={{ padding: '12px 10px' }}>Public Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentProperties.map(l => {
                                    const isComm = COMMERCIAL_CATS.some(c => (l.category || '').toLowerCase().includes(c));
                                    const statusAvailable = (l.status || 'available') === 'available';

                                    return (
                                        <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                                            <td style={{ padding: '12px 10px', fontWeight: 700 }}>{l.title}</td>
                                            <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                                                {l.contactName || 'Owner'} ({l.contactPhone || l.ownerPhone || '—'})
                                            </td>
                                            <td style={{ padding: '12px 10px' }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: isComm ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.12)', color: isComm ? '#d97706' : '#6366f1' }}>
                                                    {isComm ? '🏢 Commercial' : '🏠 Residential'} ({ (l.category || 'residential').replace('_', ' ') })
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                                                    <span>{l.location || '—'}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 10px', fontWeight: 800, color: '#921214' }}>
                                                {formatPropertyPrice(l)}
                                            </td>
                                            <td style={{ padding: '12px 10px' }}>
                                                <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Eye size={12} /> {Number(l.viewsCount || l.views || 0)}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 10px' }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: statusAvailable ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: statusAvailable ? '#22c55e' : '#ef4444' }}>
                                                    {statusAvailable ? '● Active' : '○ Disabled'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
}
