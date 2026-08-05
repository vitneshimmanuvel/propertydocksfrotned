import React, { useState, useMemo } from 'react';
import { MessageSquare, Phone, Calendar, Mail, Trash2, CheckCircle, Clock, Filter, User, Landmark, CheckSquare, Square, Building2 } from 'lucide-react';
import { saveFullDatabase } from '../utils/api';

export default function InquiriesManager({ database, setDatabase, showToast }) {
    const inquiries = database.inquiries || [];
    const ownerListings = database.ownerListings || [];
    const clients = database.clients || [];

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'open', 'shared'
    const [selectedOwnerFilter, setSelectedOwnerFilter] = useState('all');

    const getRelativeTime = (dateStr) => {
        if (!dateStr) return 'Recently';
        const now = new Date();
        const d = new Date(dateStr);
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin} min ago`;
        if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`;
        if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Toggle "Shared to Owner" / "Shared to Client" state
    const handleToggleSharedToClient = async (inqId) => {
        const newDb = { ...database };
        newDb.inquiries = (newDb.inquiries || []).map(i => {
            if (i.id === inqId) {
                const nextState = !i.sharedToClient;
                return {
                    ...i,
                    sharedToClient: nextState,
                    status: nextState ? 'shared' : 'open'
                };
            }
            return i;
        });

        if (setDatabase) setDatabase({ ...newDb });
        try {
            await saveFullDatabase(newDb);
            const targetInq = newDb.inquiries.find(i => i.id === inqId);
            if (showToast) showToast(targetInq.sharedToClient ? "Inquiry marked as Shared to Owner!" : "Inquiry reset to Open state.", "success");
        } catch (e) {
            console.error(e);
            if (showToast) showToast("Failed to update inquiry status", "error");
        }
    };

    // Delete Inquiry
    const handleDeleteInquiry = async (inqId) => {
        if (!window.confirm("Are you sure you want to delete this customer inquiry?")) return;
        const newDb = { ...database };
        newDb.inquiries = (newDb.inquiries || []).filter(i => i.id !== inqId);
        if (setDatabase) setDatabase({ ...newDb });
        try {
            await saveFullDatabase(newDb);
            if (showToast) showToast("Inquiry deleted successfully", "success");
        } catch (e) {
            console.error(e);
            if (showToast) showToast("Failed to delete inquiry", "error");
        }
    };

    // Enrich Inquiries with Property & Owner Info + Deduplication
    const enrichedInquiries = useMemo(() => {
        const seenMap = new Set();
        const result = [];

        (inquiries || []).forEach(inq => {
            const phone = (inq.userPhone || '').replace(/\D/g, '').slice(-10);
            const key = `${inq.listingId || inq.listingTitle}_${phone}`;
            
            // Deduplicate exact same inquiry from same user for same property
            if (seenMap.has(key)) return;
            seenMap.add(key);

            // Find target property listing
            const matchedListing = ownerListings.find(l => l.id === inq.listingId) || 
                                   ownerListings.find(l => (l.title || l.name) === inq.listingTitle);
            
            const propertyTitle = inq.listingTitle || (matchedListing ? (matchedListing.title || matchedListing.name) : 'Property Listing');
            const propertyPrice = matchedListing ? (matchedListing.price ? `₹${Number(matchedListing.price).toLocaleString('en-IN')}` : (matchedListing.rentAmount ? `₹${Number(matchedListing.rentAmount).toLocaleString('en-IN')}/mo` : '')) : (inq.listingPrice ? `₹${inq.listingPrice}` : '');
            const propertyLocation = matchedListing ? (matchedListing.location || matchedListing.district || '') : (inq.listingAddress || '');

            // Find Property Owner
            const ownerPhone = inq.ownerPhone || (matchedListing ? (matchedListing.contactPhone || matchedListing.ownerPhone) : '');
            const matchedOwner = clients.find(c => c.phone && ownerPhone && c.phone.replace(/\D/g, '').slice(-10) === ownerPhone.replace(/\D/g, '').slice(-10));
            const ownerName = inq.ownerName || (matchedOwner ? matchedOwner.name : (matchedListing ? matchedListing.contactName : 'Property Owner'));

            result.push({
                ...inq,
                enrichedPropertyTitle: propertyTitle,
                enrichedPropertyPrice: propertyPrice,
                enrichedPropertyLocation: propertyLocation,
                enrichedOwnerName: ownerName,
                enrichedOwnerPhone: ownerPhone || 'N/A'
            });
        });

        return result;
    }, [inquiries, ownerListings, clients]);

    // Filtered Inquiries
    const filteredInquiries = useMemo(() => {
        return enrichedInquiries.filter(inq => {
            // Status filter
            if (statusFilter === 'open' && inq.sharedToClient) return false;
            if (statusFilter === 'shared' && !inq.sharedToClient) return false;

            // Owner filter
            if (selectedOwnerFilter !== 'all') {
                const inqOwnerPhone = (inq.enrichedOwnerPhone || '').replace(/\D/g, '').slice(-10);
                const filterPhone = selectedOwnerFilter.replace(/\D/g, '').slice(-10);
                if (inqOwnerPhone !== filterPhone) return false;
            }

            // Search query
            const q = searchQuery.toLowerCase().trim();
            if (!q) return true;

            return (
                (inq.userName && inq.userName.toLowerCase().includes(q)) ||
                (inq.userPhone && inq.userPhone.includes(q)) ||
                (inq.userEmail && inq.userEmail.toLowerCase().includes(q)) ||
                (inq.enrichedPropertyTitle && inq.enrichedPropertyTitle.toLowerCase().includes(q)) ||
                (inq.enrichedOwnerName && inq.enrichedOwnerName.toLowerCase().includes(q)) ||
                (inq.message && inq.message.toLowerCase().includes(q))
            );
        });
    }, [enrichedInquiries, statusFilter, selectedOwnerFilter, searchQuery]);

    const openCount = enrichedInquiries.filter(i => !i.sharedToClient).length;

    return (
        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', background: 'var(--bg-main)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MessageSquare size={24} style={{ color: '#921214' }} /> Customer Inquiries & Leads
                        {openCount > 0 && (
                            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 800, borderRadius: '12px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {openCount} Open
                            </span>
                        )}
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>Manage customer lead submissions, property owner info at top row, and mark items as "Shared to Owner".</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px' }}>
                {/* Search Input */}
                <input 
                    type="text" 
                    placeholder="Search by lead name, owner, phone, email, or property..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                />

                {/* Status Filter */}
                <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                >
                    <option value="all">All Inquiry Statuses ({enrichedInquiries.length})</option>
                    <option value="open">⏳ Pending Open ({openCount})</option>
                    <option value="shared">✓ Shared to Owner ({enrichedInquiries.length - openCount})</option>
                </select>

                {/* Owner Filter */}
                <select 
                    value={selectedOwnerFilter} 
                    onChange={(e) => setSelectedOwnerFilter(e.target.value)}
                    style={{ padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                >
                    <option value="all">All Property Owners</option>
                    {clients.map(c => (
                        <option key={c.id || c.phone} value={c.phone}>
                            👤 Owner: {c.name} ({c.phone})
                        </option>
                    ))}
                </select>
            </div>

            {/* Inquiries List */}
            {filteredInquiries.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: 'var(--bg-panel)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                    <MessageSquare size={40} style={{ opacity: 0.15 }} />
                    <h3>No customer inquiries found</h3>
                    <p style={{ fontSize: '0.8rem' }}>Customer submissions from listing details will show up here.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredInquiries.map(inq => {
                        const isShared = Boolean(inq.sharedToClient);
                        return (
                            <div key={inq.id} style={{ 
                                background: 'var(--bg-panel)', 
                                padding: '20px', 
                                borderRadius: 'var(--radius-md)', 
                                border: isShared ? '1px solid var(--border-color)' : '2px solid #921214',
                                boxShadow: isShared ? '0 2px 8px rgba(0,0,0,0.04)' : '0 4px 16px rgba(146,18,20,0.12)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '14px'
                            }}>
                                {/* Top Header: Lead Name + Property Owner Info AT TOP + Action Button */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: isShared ? '#22c55e' : '#921214', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.15rem', flexShrink: 0 }}>
                                            {(inq.userName || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            {/* Lead Name + Property Owner Info Side-by-Side in Top Row */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                                                    <span style={{ color: '#921214' }}>Lead:</span> {inq.userName || 'Customer'}
                                                </h3>

                                                <span style={{ background: 'rgba(146, 18, 20, 0.08)', color: '#921214', fontSize: '0.8rem', fontWeight: 800, borderRadius: '6px', padding: '3px 10px', border: '1px solid rgba(146,18,20,0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    👤 <strong>Owner:</strong> {inq.enrichedOwnerName} ({inq.enrichedOwnerPhone})
                                                </span>

                                                <span style={{ background: isShared ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: isShared ? '#22c55e' : '#ef4444', fontSize: '0.72rem', fontWeight: 800, borderRadius: '4px', padding: '2px 8px', border: isShared ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)' }}>
                                                    {isShared ? '✓ Shared to Owner' : '⏳ Pending Review'}
                                                </span>
                                            </div>

                                            {/* Lead Contact Info Sub-row */}
                                            <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Phone size={13} style={{ color: 'var(--text-muted)' }} /> <a href={`tel:${inq.userPhone}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}>{inq.userPhone}</a>
                                                </span>
                                                {inq.userEmail && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Mail size={13} style={{ color: 'var(--text-muted)' }} /> {inq.userEmail}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={12} /> {getRelativeTime(inq.createdAt)}
                                        </span>

                                        {/* Shared to Owner Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleToggleSharedToClient(inq.id)}
                                            style={{
                                                padding: '8px 16px',
                                                background: isShared ? 'rgba(34,197,94,0.12)' : '#921214',
                                                color: isShared ? '#166534' : '#ffffff',
                                                border: isShared ? '1px solid #22c55e' : 'none',
                                                borderRadius: '6px',
                                                fontWeight: 800,
                                                fontSize: '0.82rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: isShared ? 'none' : '0 2px 6px rgba(146,18,20,0.3)'
                                            }}
                                        >
                                            {isShared ? <CheckSquare size={16} /> : <Square size={16} />}
                                            {isShared ? 'Shared to Owner' : 'Share to Owner'}
                                        </button>
                                    </div>
                                </div>

                                {/* Customer Message */}
                                {inq.message && (
                                    <div style={{ padding: '12px 14px', background: 'var(--bg-main)', borderRadius: '8px', fontSize: '0.88rem', color: 'var(--text-primary)', borderLeft: '4px solid #921214', lineHeight: '1.5' }}>
                                        💬 "{inq.message}"
                                    </div>
                                )}

                                {/* Bottom Metadata Bar: Target Property & Delete Action */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Building2 size={16} color="#921214" />
                                        <span><strong>Target Property:</strong> <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{inq.enrichedPropertyTitle}</span> {inq.enrichedPropertyPrice && <span style={{ color: '#921214', fontWeight: 800 }}>({inq.enrichedPropertyPrice})</span>}</span>
                                    </div>

                                    <button 
                                        onClick={() => handleDeleteInquiry(inq.id)}
                                        style={{ padding: '4px 8px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        title="Delete Inquiry"
                                    >
                                        <Trash2 size={13} /> Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}
