import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Download, PieChart, Landmark, Calendar, Printer } from 'lucide-react';

export default function ReportsManager({ 
    database,
    showToast
}) {
    const layouts = database.layouts || [];
    const bookings = database.bookings || [];

    // Calculate report statistics
    const reportData = useMemo(() => {
        let totalRevenue = 0;
        let pendingAdvance = 0;
        let totalPlots = 0;
        let soldPlots = 0;
        let bookedPlots = 0;
        let premiumPlots = 0;
        let generalPlots = 0;

        const layoutSales = layouts.map(l => {
            let layoutPlotsCount = l.plots?.length || 0;
            let layoutSold = 0;
            let layoutBooked = 0;
            let layoutRevenue = 0;
            let totalEstVal = 0;

            l.plots?.forEach(p => {
                const plotArea = Number(p.area) || 1200;
                const plotRate = Number(p.price) || 850;
                const estVal = plotArea * plotRate;
                totalEstVal += estVal;

                if (p.status === 'sold') layoutSold++;
                else if (p.status === 'booked' || p.status === 'reserved') layoutBooked++;

                if (p.category === 'premium') premiumPlots++;
                else generalPlots++;
            });

            totalPlots += layoutPlotsCount;
            soldPlots += layoutSold;
            bookedPlots += layoutBooked;

            // Get revenue for this layout
            const layoutConfirmedBookings = bookings.filter(b => b.layoutId === l.id && b.status === 'confirmed');
            const layoutPendingBookings = bookings.filter(b => b.layoutId === l.id && b.status === 'pending');
            
            const confirmedAmt = layoutConfirmedBookings.reduce((sum, b) => sum + (Number(b.amountPaid) || 0), 0);
            const pendingAmt = layoutPendingBookings.reduce((sum, b) => sum + (Number(b.amountPaid) || 0), 0);
            
            totalRevenue += confirmedAmt;
            pendingAdvance += pendingAmt;

            return {
                id: l.id,
                name: l.name,
                location: `${l.area}, ${l.district}`,
                totalPlots: layoutPlotsCount,
                sold: layoutSold,
                booked: layoutBooked,
                occupancyRate: layoutPlotsCount > 0 ? Math.round(((layoutSold + layoutBooked) / layoutPlotsCount) * 100) : 0,
                revenue: confirmedAmt,
                pendingRevenue: pendingAmt,
                estimatedValue: totalEstVal
            };
        });

        // Payment methods statistics
        const paymentStats = {
            upi: 0,
            bank_transfer: 0,
            card: 0,
            cash: 0
        };

        const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
        confirmedBookings.forEach(b => {
            const method = b.paymentMethod || 'upi';
            if (paymentStats[method] !== undefined) {
                paymentStats[method] += Number(b.amountPaid) || 0;
            } else {
                paymentStats.upi += Number(b.amountPaid) || 0;
            }
        });

        return {
            totalRevenue,
            pendingAdvance,
            totalPlots,
            soldPlots,
            bookedPlots,
            premiumPlots,
            generalPlots,
            layoutSales,
            paymentStats
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

    // Export layout stats to CSV
    const exportToCSV = () => {
        try {
            const headers = ['Layout Name', 'Location', 'Total Plots', 'Sold Plots', 'Booked Plots', 'Occupancy Rate (%)', 'Confirmed Revenue (₹)', 'Pending Revenue (₹)', 'Estimated Layout Value (₹)'];
            const rows = reportData.layoutSales.map(l => [
                l.name,
                l.location,
                l.totalPlots,
                l.sold,
                l.booked,
                `${l.occupancyRate}%`,
                l.revenue,
                l.pendingRevenue,
                l.estimatedValue
            ]);

            const csvContent = "data:text/csv;charset=utf-8," 
                + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Property Docs_Sales_Report_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("CSV report exported successfully.", "success");
        } catch (e) {
            showToast("Failed to export CSV report.", "error");
        }
    };

    // Print window helper
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="reports-dashboard" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', background: 'var(--bg-main)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart3 size={24} style={{ color: 'var(--primary)' }} /> Financial & Sales Reports
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Analyze land development sales charts, payment collections, and download Excel-ready CSV files.</p>
                </div>
                
                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={handlePrint} style={{ padding: '8px 14px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)', gap: '6px' }}>
                        <Printer size={16} /> Print Report
                    </button>
                    <button className="btn-primary" onClick={exportToCSV} style={{ padding: '8px 14px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)', gap: '6px' }}>
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Financial Overview Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {/* Total confirmed revenue */}
                <div className="metric-card" style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Confirmed Advance Collections</span>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(reportData.totalRevenue)}</div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>From approved bookings</span>
                    </div>
                </div>

                {/* Pending revenue */}
                <div className="metric-card" style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                        <Calendar size={24} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pending Advance Approvals</span>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(reportData.pendingAdvance)}</div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Bookings awaiting verification</span>
                    </div>
                </div>

                {/* Total plots breakdown */}
                <div className="metric-card" style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
                        <Landmark size={24} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Plot Category Distribution</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                            <span>★ Premium: <strong>{reportData.premiumPlots}</strong></span>
                            <span>General: <strong>{reportData.generalPlots}</strong></span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', display: 'flex', marginTop: '6px' }}>
                            <div style={{ width: `${reportData.totalPlots > 0 ? (reportData.premiumPlots / reportData.totalPlots) * 100 : 0}%`, height: '100%', background: 'var(--primary)' }}></div>
                            <div style={{ flex: 1, height: '100%', background: '#8b5cf6' }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Layout sales summary table */}
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Landmark size={18} style={{ color: 'var(--primary)' }} /> Project Performance Breakdown
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)' }}>
                                <th style={{ padding: '12px 10px' }}>Layout Project</th>
                                <th style={{ padding: '12px 10px' }}>Location</th>
                                <th style={{ padding: '12px 10px' }}>Total Plots</th>
                                <th style={{ padding: '12px 10px' }}>Sold/Booked</th>
                                <th style={{ padding: '12px 10px' }}>Occupancy</th>
                                <th style={{ padding: '12px 10px' }}>Est. Total Valuation</th>
                                <th style={{ padding: '12px 10px' }}>Revenue (Advance)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.layoutSales.map(l => (
                                <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: 'var(--text-primary)' }}>
                                    <td style={{ padding: '14px 10px', fontWeight: 700 }}>{l.name}</td>
                                    <td style={{ padding: '14px 10px', color: 'var(--text-secondary)' }}>{l.location}</td>
                                    <td style={{ padding: '14px 10px' }}>{l.totalPlots}</td>
                                    <td style={{ padding: '14px 10px' }}>
                                        <span style={{ color: '#10b981', fontWeight: 600 }}>{l.sold}</span> / <span style={{ color: '#f59e0b' }}>{l.booked}</span>
                                    </td>
                                    <td style={{ padding: '14px 10px' }}>
                                        <span style={{ fontWeight: 600, color: l.occupancyRate > 75 ? '#10b981' : l.occupancyRate > 40 ? 'var(--primary)' : 'var(--text-muted)' }}>
                                            {l.occupancyRate}%
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 10px', color: 'var(--text-secondary)' }}>{formatCurrency(l.estimatedValue)}</td>
                                    <td style={{ padding: '14px 10px', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(l.revenue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Row: Payment methods share */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
                
                {/* Payment Methods revenue ledger */}
                <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PieChart size={18} style={{ color: 'var(--primary)' }} /> Revenue Share by Payment Method
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                        {/* UPI */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <span style={{ fontWeight: 600 }}>UPI (GPay / PhonePe / Paytm)</span>
                                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatCurrency(reportData.paymentStats.upi)}</span>
                            </div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                <div style={{ 
                                    width: `${reportData.totalRevenue > 0 ? (reportData.paymentStats.upi / reportData.totalRevenue) * 100 : 0}%`, 
                                    height: '100%', 
                                    background: 'var(--primary)' 
                                }}></div>
                            </div>
                        </div>

                        {/* Net Banking */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <span style={{ fontWeight: 600 }}>Net Banking / RTGS / IMPS</span>
                                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatCurrency(reportData.paymentStats.bank_transfer)}</span>
                            </div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                <div style={{ 
                                    width: `${reportData.totalRevenue > 0 ? (reportData.paymentStats.bank_transfer / reportData.totalRevenue) * 100 : 0}%`, 
                                    height: '100%', 
                                    background: '#8b5cf6' 
                                }}></div>
                            </div>
                        </div>

                        {/* Credit/Debit Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <span style={{ fontWeight: 600 }}>Credit / Debit Cards</span>
                                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatCurrency(reportData.paymentStats.card)}</span>
                            </div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                <div style={{ 
                                    width: `${reportData.totalRevenue > 0 ? (reportData.paymentStats.card / reportData.totalRevenue) * 100 : 0}%`, 
                                    height: '100%', 
                                    background: '#10b981' 
                                }}></div>
                            </div>
                        </div>

                        {/* Cash */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <span style={{ fontWeight: 600 }}>Direct Cash Deposit</span>
                                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatCurrency(reportData.paymentStats.cash)}</span>
                            </div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                <div style={{ 
                                    width: `${reportData.totalRevenue > 0 ? (reportData.paymentStats.cash / reportData.totalRevenue) * 100 : 0}%`, 
                                    height: '100%', 
                                    background: '#f59e0b' 
                                }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Helpful notes / print details */}
                <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Business Audit Details</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        This statement calculates real-time advance tokens paid by buyers. It represents the active capital reserve for Property Docs. 
                        To print a clean official summary, click the "Print Report" action at the top right, which will trigger the browser's native print screen styled with layout breakdowns.
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        * Valuation estimations are calculated based on: Plot Area (sq.ft) × Plot Rate (₹/sq.ft).
                    </p>
                </div>

            </div>

        </div>
    );
}
