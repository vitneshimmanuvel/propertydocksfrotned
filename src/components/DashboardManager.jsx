import React, { useMemo } from 'react';
import { LayoutDashboard, Landmark, ClipboardList, TrendingUp, Users, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';

export default function DashboardManager({ 
    database, 
    setAdminTab,
    showToast 
}) {
    const layouts = database.layouts || [];
    const bookings = database.bookings || [];

    // Calculate metrics
    const stats = useMemo(() => {
        let totalPlots = 0;
        let soldPlots = 0;
        let bookedPlots = 0;
        let availablePlots = 0;

        layouts.forEach(l => {
            const plotsList = l.plots || [];
            totalPlots += plotsList.length;
            plotsList.forEach(p => {
                if (p.status === 'sold') soldPlots++;
                else if (p.status === 'booked' || p.status === 'reserved') bookedPlots++;
                else availablePlots++;
            });
        });

        const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
        const pendingBookings = bookings.filter(b => b.status === 'pending');
        const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (Number(b.amountPaid) || 0), 0);

        const occupancyRate = totalPlots > 0 ? Math.round(((soldPlots + bookedPlots) / totalPlots) * 100) : 0;

        return {
            totalLayouts: layouts.length,
            totalPlots,
            availablePlots,
            soldPlots,
            bookedPlots,
            totalBookings: bookings.length,
            pendingBookings: pendingBookings.length,
            confirmedBookings: confirmedBookings.length,
            revenue: totalRevenue,
            occupancyRate
        };
    }, [layouts, bookings]);

    // Format currency in Indian Rupees style
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Get last 5 bookings
    const recentBookings = useMemo(() => {
        return [...bookings]
            .sort((a, b) => {
                const aTime = a.id.split('-')[1] || 0;
                const bTime = b.id.split('-')[1] || 0;
                return bTime - aTime;
            })
            .slice(0, 5);
    }, [bookings]);

    return (
        <div className="dashboard-view" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', background: 'var(--bg-main)' }}>
            
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <LayoutDashboard size={24} style={{ color: 'var(--primary)' }} /> Administrative Executive Dashboard
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Overview of Property Docs real estate layouts, booking sales performance, and recent activity.</p>
            </div>

            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                
                {/* Total Layouts */}
                <div className="metric-card" style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Layout Projects</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
                            <MapPin size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalLayouts}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active layout sheets</span>
                </div>

                {/* Total Plots */}
                <div className="metric-card" style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Plots</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                            <Landmark size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalPlots}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <strong style={{ color: '#10b981' }}>{stats.availablePlots}</strong> available / <strong style={{ color: 'var(--primary)' }}>{stats.soldPlots}</strong> sold
                    </span>
                </div>

                {/* Bookings */}
                <div className="metric-card" style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Plot Reservations</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                            <ClipboardList size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalBookings}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <strong style={{ color: '#f59e0b' }}>{stats.pendingBookings}</strong> pending approval
                    </span>
                </div>

                {/* Revenue */}
                <div className="metric-card" style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Confirmed Revenue</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(stats.revenue)}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>From confirmed booking advances</span>
                </div>

                {/* Occupancy Rate */}
                <div className="metric-card" style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Booking Occupancy</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                            <ShieldCheck size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.occupancyRate}%</div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                        <div style={{ width: `${stats.occupancyRate}%`, height: '100%', background: 'var(--primary)' }}></div>
                    </div>
                </div>

            </div>

            {/* Middle Section: Layout occupancy overview & Recent bookings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
                
                {/* Layouts Directory table card */}
                <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Layout Sheets Progress</h3>
                        <button className="btn-secondary" onClick={() => setAdminTab('layouts')} style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            View Map Editor <ArrowRight size={12} />
                        </button>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                    <th style={{ padding: '10px 8px' }}>Sheet Name</th>
                                    <th style={{ padding: '10px 8px' }}>Location</th>
                                    <th style={{ padding: '10px 8px' }}>Plots</th>
                                    <th style={{ padding: '10px 8px' }}>Sold/Booked</th>
                                    <th style={{ padding: '10px 8px' }}>Occupancy Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {layouts.map(l => {
                                    const plotsList = l.plots || [];
                                    const total = plotsList.length;
                                    const sold = plotsList.filter(p => p.status === 'sold').length;
                                    const booked = plotsList.filter(p => p.status === 'booked' || p.status === 'reserved').length;
                                    const occPct = total > 0 ? Math.round(((sold + booked) / total) * 100) : 0;
                                    
                                    return (
                                        <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: 'var(--text-primary)' }}>
                                            <td style={{ padding: '12px 8px', fontWeight: 600 }}>{l.name}</td>
                                            <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{l.area}, {l.district}</td>
                                            <td style={{ padding: '12px 8px' }}>{total}</td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{sold}</span> / <span style={{ color: '#f59e0b' }}>{booked}</span>
                                            </td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${occPct}%`, height: '100%', background: occPct > 80 ? '#10b981' : occPct > 40 ? 'var(--primary)' : '#8b5cf6' }}></div>
                                                    </div>
                                                    <span>{occPct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Bookings column card */}
                <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Recent Reservations</h3>
                        <button className="btn-secondary" onClick={() => setAdminTab('bookings')} style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            All Bookings <ArrowRight size={12} />
                        </button>
                    </div>

                    {recentBookings.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', minHeight: '160px' }}>
                            <ClipboardList size={32} style={{ opacity: 0.2 }} />
                            <span style={{ fontSize: '0.78rem' }}>No plot reservations logged yet.</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '320px' }}>
                            {recentBookings.map(b => (
                                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{b.customerName}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Plot {b.plotId} | Phone: {b.customerPhone}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(b.amountPaid)}</span>
                                        <span style={{
                                            fontSize: '0.62rem',
                                            fontWeight: 700,
                                            padding: '1px 6px',
                                            borderRadius: '10px',
                                            textTransform: 'uppercase',
                                            background: b.status === 'confirmed' ? 'rgba(16,185,129,0.15)' : b.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                            color: b.status === 'confirmed' ? '#10b981' : b.status === 'cancelled' ? '#ef4444' : '#f59e0b',
                                            border: `1px solid ${b.status === 'confirmed' ? 'rgba(16,185,129,0.2)' : b.status === 'cancelled' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`
                                        }}>
                                            {b.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* Quick Actions Footer Panel */}
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>System Quick Actions</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    <button className="btn-primary" onClick={() => setAdminTab('layouts')} style={{ fontSize: '0.8rem', padding: '10px 16px', borderRadius: 'var(--radius-sm)' }}>
                        Open Visual Map Workspace
                    </button>
                    <button className="btn-secondary" onClick={() => setAdminTab('plots')} style={{ fontSize: '0.8rem', padding: '10px 16px', borderRadius: 'var(--radius-sm)' }}>
                        Inspect Plot Database
                    </button>
                    <button className="btn-secondary" onClick={() => setAdminTab('bookings')} style={{ fontSize: '0.8rem', padding: '10px 16px', borderRadius: 'var(--radius-sm)' }}>
                        Pending Reservations Queue
                    </button>
                    <button className="btn-secondary" onClick={() => setAdminTab('videos')} style={{ fontSize: '0.8rem', padding: '10px 16px', borderRadius: 'var(--radius-sm)' }}>
                        Manage Promotional Playlist
                    </button>
                    <button className="btn-secondary" onClick={() => setAdminTab('settings')} style={{ fontSize: '0.8rem', padding: '10px 16px', borderRadius: 'var(--radius-sm)' }}>
                        Global Admin Settings
                    </button>
                </div>
            </div>

        </div>
    );
}
