import React, { useState, useMemo } from 'react';
import { ClipboardList, Check, X, ShieldAlert, BadgePercent, TrendingUp, Search, UserCheck } from 'lucide-react';

export default function BookingsManager({ 
    database, 
    setDatabase, 
    showToast 
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const bookings = useMemo(() => {
        return database.bookings || [];
    }, [database.bookings]);

    // Calculate metrics
    const metrics = useMemo(() => {
        const pending = bookings.filter(b => b.status === 'pending');
        const confirmed = bookings.filter(b => b.status === 'confirmed');
        const cancelled = bookings.filter(b => b.status === 'cancelled');
        
        const totalRevenue = confirmed.reduce((sum, b) => sum + b.amountPaid, 0);

        return {
            total: bookings.length,
            pending: pending.length,
            confirmed: confirmed.length,
            cancelled: cancelled.length,
            revenue: totalRevenue
        };
    }, [bookings]);

    // Handle Confirm/Approve Booking
    const handleConfirmBooking = (bookingId) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        setDatabase(prev => {
            const newBookings = prev.bookings.map(b => {
                if (b.id === bookingId) {
                    return { ...b, status: 'confirmed' };
                }
                return b;
            });

            const newLayouts = prev.layouts.map(l => {
                if (l.id === booking.layoutId) {
                    return {
                        ...l,
                        plots: l.plots.map(p => {
                            if (p.id === booking.plotId) {
                                return { 
                                    ...p, 
                                    status: 'sold',
                                    owner: booking.customerName // Set owner name
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
                layouts: newLayouts,
                bookings: newBookings
            };
        });

        showToast(`Booking ${bookingId} confirmed! Plot ${booking.plotId} is now marked as Sold to ${booking.customerName}.`, "success");
    };

    // Handle Cancel/Reject Booking
    const handleCancelBooking = (bookingId) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        if (!window.confirm(`Are you sure you want to cancel booking reservation ${bookingId} for Plot ${booking.plotId}?`)) {
            return;
        }

        setDatabase(prev => {
            const newBookings = prev.bookings.map(b => {
                if (b.id === bookingId) {
                    return { ...b, status: 'cancelled' };
                }
                return b;
            });

            const newLayouts = prev.layouts.map(l => {
                if (l.id === booking.layoutId) {
                    return {
                        ...l,
                        plots: l.plots.map(p => {
                            if (p.id === booking.plotId) {
                                return { 
                                    ...p, 
                                    status: 'available',
                                    owner: null // Clear owner
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
                layouts: newLayouts,
                bookings: newBookings
            };
        });

        showToast(`Booking ${bookingId} cancelled. Plot ${booking.plotId} is back to Available.`, "warning");
    };

    // Filtered Bookings List
    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query || 
                b.id.toLowerCase().includes(query) ||
                b.plotId.toLowerCase().includes(query) ||
                b.customerName.toLowerCase().includes(query) ||
                b.customerPhone.includes(query) ||
                (b.layoutName && b.layoutName.toLowerCase().includes(query));
            
            return matchesStatus && matchesSearch;
        });
    }, [bookings, searchQuery, statusFilter]);

    const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    return (
        <div className="bookings-dashboard" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', background: 'var(--bg-main)' }}>
            {/* Title block */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ClipboardList size={24} style={{ color: 'var(--primary)' }} /> Bookings Manager
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Monitor client reservations, approve sales, and manage bookings across all layout sheets.</p>
                </div>
            </div>

            {/* Metrics Dashboard Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="metric-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total Bookings</h3>
                    <div className="metric-value" style={{ fontSize: '1.8rem', marginTop: '6px' }}>{metrics.total}</div>
                    <span className="metric-sub" style={{ color: 'var(--text-muted)' }}>Reservations logged</span>
                </div>
                
                <div className="metric-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.72rem', color: 'var(--color-reserved)' }}>Pending Approvals</h3>
                    <div className="metric-value" style={{ fontSize: '1.8rem', marginTop: '6px', color: 'var(--color-reserved)' }}>{metrics.pending}</div>
                    <span className="metric-sub" style={{ color: 'var(--text-muted)' }}>Awaiting verification</span>
                </div>

                <div className="metric-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.72rem', color: 'var(--color-available)' }}>Confirmed Sales</h3>
                    <div className="metric-value" style={{ fontSize: '1.8rem', marginTop: '6px', color: 'var(--color-available)' }}>{metrics.confirmed}</div>
                    <span className="metric-sub" style={{ color: 'var(--text-muted)' }}>Plots successfully sold</span>
                </div>

                <div className="metric-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>Revenue Collected</h3>
                    <div className="metric-value" style={{ fontSize: '1.8rem', marginTop: '6px', color: 'var(--primary)' }}>{currencyFormatter.format(metrics.revenue)}</div>
                    <span className="metric-sub" style={{ color: 'var(--text-muted)' }}>From booking advances</span>
                </div>
            </div>

            {/* Bookings Table Panel */}
            <div style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                flex: 1,
                minHeight: '350px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
                {/* Search / Filter Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="search-wrapper" style={{ width: '100%', maxWidth: '340px' }}>
                        <Search size={14} />
                        <input 
                            type="text" 
                            placeholder="Search customer, plot number, ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ padding: '8px 12px 8px 32px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}
                        />
                    </div>

                    <div className="filter-row" style={{ gap: '6px' }}>
                        {['all', 'pending', 'confirmed', 'cancelled'].map(status => (
                            <button
                                key={status}
                                className={`btn-filter ${statusFilter === status ? 'active' : ''}`}
                                onClick={() => setStatusFilter(status)}
                                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            >
                                {status === 'all' ? 'All Bookings' : status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table container */}
                <div style={{ overflowX: 'auto', flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Booking ID</th>
                                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Plot ID</th>
                                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Layout Plan</th>
                                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Customer Name</th>
                                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Contact info</th>
                                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Date Logged</th>
                                <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'right' }}>Advance Paid</th>
                                <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No booking records found matching search queries or filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredBookings.map(b => (
                                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)', transition: 'background var(--transition-fast)' }} className="table-row-hover">
                                        <td style={{ padding: '14px 8px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.id}</td>
                                        <td style={{ padding: '14px 8px', fontWeight: 700 }}>{b.plotId}</td>
                                        <td style={{ padding: '14px 8px', color: 'var(--text-secondary)' }}>{b.layoutName || 'Property Docs Layout'}</td>
                                        <td style={{ padding: '14px 8px', fontWeight: 600 }}>{b.customerName}</td>
                                        <td style={{ padding: '14px 8px', fontSize: '0.78rem' }}>
                                            <div style={{ fontWeight: 500 }}>{b.customerPhone}</div>
                                            <div style={{ color: 'var(--text-muted)' }}>{b.customerEmail}</div>
                                        </td>
                                        <td style={{ padding: '14px 8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                            {new Date(b.date).toLocaleDateString('en-IN')}
                                        </td>
                                        <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                                            {currencyFormatter.format(b.amountPaid)}
                                        </td>
                                        <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                                            <span className={`property-badge badge-${b.status}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                                            {b.status === 'pending' ? (
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                    <button 
                                                        className="btn-icon" 
                                                        title="Confirm Booking (Mark as Sold)" 
                                                        onClick={() => handleConfirmBooking(b.id)}
                                                        style={{ 
                                                            width: '28px', 
                                                            height: '28px', 
                                                            background: 'var(--color-available-glow)', 
                                                            color: 'var(--color-available)',
                                                            border: '1px solid var(--color-available-border)'
                                                        }}
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button 
                                                        className="btn-icon" 
                                                        title="Cancel Booking (Mark as Available)" 
                                                        onClick={() => handleCancelBooking(b.id)}
                                                        style={{ 
                                                            width: '28px', 
                                                            height: '28px', 
                                                            background: 'var(--color-sold-glow)', 
                                                            color: 'var(--color-sold)',
                                                            border: '1px solid var(--color-sold-border)'
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {b.status === 'confirmed' ? (
                                                        <span style={{ color: 'var(--color-available)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                            <UserCheck size={12}/> Complete
                                                        </span>
                                                    ) : 'Archived'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{__html: `
                .table-row-hover:hover {
                    background: rgba(255, 255, 255, 0.015);
                }
            `}} />
        </div>
    );
}
