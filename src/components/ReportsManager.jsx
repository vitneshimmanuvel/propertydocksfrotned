import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Download, PieChart, Landmark, Calendar, Printer, Users, Building, Home, MapPin, Eye, EyeOff } from 'lucide-react';

export default function ReportsManager({ 
    database,
    showToast
}) {
    const ownerListings = database.ownerListings || [];
    const clients = database.clients || [];

    const COMMERCIAL_CATS = ['commercial', 'office', 'shop', 'warehouse', 'industrial', 'commercial_land', 'showroom'];

    // Calculate live report statistics from PostgreSQL database
    const reportData = useMemo(() => {
        const totalProperties = ownerListings.length;
        const activeCount = ownerListings.filter(l => (l.status || 'available') === 'available').length;
        const disabledCount = ownerListings.filter(l => l.status === 'disabled').length;

        // Commercial vs Residential
        const commercialListings = ownerListings.filter(l => COMMERCIAL_CATS.some(c => (l.category || '').toLowerCase().includes(c)));
        const residentialListings = ownerListings.filter(l => !COMMERCIAL_CATS.some(c => (l.category || '').toLowerCase().includes(c)));

        // Location distribution
        const locationMap = {};
        ownerListings.forEach(l => {
            const locName = l.location || l.district || 'Erode Region';
            if (!locationMap[locName]) {
                locationMap[locName] = { name: locName, total: 0, active: 0, disabled: 0, residential: 0, commercial: 0 };
            }
            locationMap[locName].total++;
            if ((l.status || 'available') === 'available') locationMap[locName].active++;
            else locationMap[locName].disabled++;

            if (COMMERCIAL_CATS.some(c => (l.category || '').toLowerCase().includes(c))) {
                locationMap[locName].commercial++;
            } else {
                locationMap[locName].residential++;
            }
        });

        const locationList = Object.values(locationMap).sort((a, b) => b.total - a.total);

        // Owner breakdown
        const ownerSummaryMap = {};
        clients.forEach(c => {
            ownerSummaryMap[c.phone] = {
                name: c.name,
                phone: c.phone,
                email: c.email || '—',
                location: c.location || '—',
                totalProps: 0,
                activeProps: 0
            };
        });

        ownerListings.forEach(l => {
            const phoneKey = l.contactPhone || l.ownerPhone;
            if (phoneKey && ownerSummaryMap[phoneKey]) {
                ownerSummaryMap[phoneKey].totalProps++;
                if ((l.status || 'available') === 'available') ownerSummaryMap[phoneKey].activeProps++;
            }
        });

        const ownerList = Object.values(ownerSummaryMap);

        const totalViews = ownerListings.reduce((sum, l) => sum + (Number(l.viewsCount || l.views || 0)), 0);

        return {
            totalProperties,
            activeCount,
            disabledCount,
            totalViews,
            residentialCount: residentialListings.length,
            commercialCount: commercialListings.length,
            totalOwners: clients.length,
            locationList,
            ownerList
        };
    }, [ownerListings, clients]);

    // Handle CSV Download Export
    const exportCSVReport = () => {
        if (ownerListings.length === 0) {
            showToast && showToast('No properties available to export.', 'warning');
            return;
        }

        const headers = ["Property ID", "Title", "Owner Name", "Owner Phone", "Category", "Location", "Price/Rent", "Total Clicks/Views", "Status", "Created At"];
        const rows = ownerListings.map(l => [
            `"${l.id}"`,
            `"${(l.title || '').replace(/"/g, '""')}"`,
            `"${(l.contactName || '').replace(/"/g, '""')}"`,
            `"${l.contactPhone || l.ownerPhone || ''}"`,
            `"${l.category || 'residential'}"`,
            `"${(l.location || '').replace(/"/g, '""')}"`,
            `"${l.price || l.rentAmount || l.bogithuAmount || 0}"`,
            `"${l.viewsCount || l.views || 0}"`,
            `"${l.status || 'available'}"`,
            `"${l.createdAt || l.created_at || ''}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Property_Inventory_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast && showToast('Property Inventory CSV Report exported successfully!', 'success');
    };

    return (
        <div className="reports-view" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', background: 'var(--bg-main)' }}>
            
            {/* Header & Export Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart3 size={24} style={{ color: 'var(--primary)' }} /> Property Analytics & Inventory Reports
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Comprehensive live database breakdown of property owners, categories, locations, and public availability status.</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={() => window.print()} 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                        <Printer size={16} /> Print Report
                    </button>
                    <button 
                        onClick={exportCSVReport} 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#921214', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(146,18,20,0.2)' }}
                    >
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '20px' }}>
                
                {/* Total Properties */}
                <div style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Database Listings</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(146,18,20,0.1)', color: '#921214' }}>
                            <Landmark size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{reportData.totalProperties}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Registered Property Items</span>
                </div>

                {/* Active Public Listings */}
                <div style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Active Public Listings</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                            <Eye size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#22c55e' }}>{reportData.activeCount}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Visible on Public Website</span>
                </div>

                {/* Disabled Listings */}
                <div style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Disabled / Offline Listings</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                            <EyeOff size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{reportData.disabledCount}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hidden from Public Website</span>
                </div>

                {/* Property Owners */}
                <div style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Property Owners</span>
                        <div style={{ padding: '6px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                            <Users size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{reportData.totalOwners}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Registered Owner Accounts</span>
                </div>

            </div>

            {/* Middle Section: Location Breakdown & Owners Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                
                {/* Location Distribution Table */}
                <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Location Distribution</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Listings grouped by city & district</span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '10px 8px' }}>Location</th>
                                    <th style={{ padding: '10px 8px' }}>Total</th>
                                    <th style={{ padding: '10px 8px' }}>Active</th>
                                    <th style={{ padding: '10px 8px' }}>Types</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.locationList.map(loc => (
                                    <tr key={loc.name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={14} style={{ color: 'var(--primary)' }} />
                                                <span>{loc.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 8px', fontWeight: 700 }}>{loc.total}</td>
                                        <td style={{ padding: '10px 8px', color: '#22c55e', fontWeight: 700 }}>{loc.active}</td>
                                        <td style={{ padding: '10px 8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                            🏠 {loc.residential} Res | 🏢 {loc.commercial} Comm
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Property Owners Summary */}
                <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Property Owners Summary</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered owner contacts & property portfolios</span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '10px 8px' }}>Owner Name</th>
                                    <th style={{ padding: '10px 8px' }}>Phone</th>
                                    <th style={{ padding: '10px 8px' }}>Properties</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.ownerList.map(owner => (
                                    <tr key={owner.phone} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--text-primary)' }}>{owner.name}</td>
                                        <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{owner.phone}</td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{owner.totalProps}</span> Properties ({owner.activeProps} active)
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

        </div>
    );
}
