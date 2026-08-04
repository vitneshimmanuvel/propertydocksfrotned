import React, { useState } from 'react';
import { MessageSquare, Phone, Calendar, Mail, Trash2, CheckCircle, Clock } from 'lucide-react';
import { saveFullDatabase } from '../utils/api';

export default function InquiriesManager({ database, setDatabase, showToast }) {
    const inquiries = database.inquiries || [];
    const [searchQuery, setSearchQuery] = useState('');

    const getRelativeTime = (dateStr) => {
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

    const handleMarkAllRead = async () => {
        const newDb = { ...database };
        newDb.inquiries = (newDb.inquiries || []).map(i => ({ ...i, status: 'read' }));
        if (setDatabase) setDatabase(newDb);
        try {
            await saveFullDatabase(newDb);
            showToast("All inquiries marked as read", "success");
        } catch (e) {
            console.error(e);
            showToast("Failed to save changes", "error");
        }
    };

    const handleMarkContacted = async (inqId) => {
        const newDb = { ...database };
        newDb.inquiries = (newDb.inquiries || []).map(i => i.id === inqId ? { ...i, status: 'contacted' } : i);
        if (setDatabase) setDatabase(newDb);
        try {
            await saveFullDatabase(newDb);
            showToast("Marked as contacted", "success");
        } catch (e) {
            console.error(e);
            showToast("Failed to save status", "error");
        }
    };

    const handleDeleteInquiry = async (inqId) => {
        if (!window.confirm("Are you sure you want to delete this inquiry?")) return;
        const newDb = { ...database };
        newDb.inquiries = (newDb.inquiries || []).filter(i => i.id !== inqId);
        if (setDatabase) setDatabase(newDb);
        try {
            await saveFullDatabase(newDb);
            showToast("Inquiry deleted successfully", "success");
        } catch (e) {
            console.error(e);
            showToast("Failed to delete inquiry", "error");
        }
    };

    const filteredInquiries = inquiries.filter(inq => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (inq.userName && inq.userName.toLowerCase().includes(q)) ||
               (inq.userPhone && inq.userPhone.toLowerCase().includes(q)) ||
               (inq.userEmail && inq.userEmail.toLowerCase().includes(q)) ||
               (inq.listingTitle && inq.listingTitle.toLowerCase().includes(q)) ||
               (inq.message && inq.message.toLowerCase().includes(q));
    });

    return (
        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', background: 'var(--bg-main)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MessageSquare size={24} style={{ color: 'var(--primary)' }} /> Customer Inquiries & Leads
                        {inquiries.filter(i => i.status === 'unread').length > 0 && (
                            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 800, borderRadius: '12px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {inquiries.filter(i => i.status === 'unread').length} New
                            </span>
                        )}
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>View callback requests, bookings interest, and showcase forms submitted by users.</p>
                </div>
                
                <button 
                    onClick={handleMarkAllRead}
                    disabled={inquiries.filter(i => i.status === 'unread').length === 0}
                    style={{ padding: '8px 16px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)', opacity: inquiries.filter(i => i.status === 'unread').length === 0 ? 0.5 : 1 }}
                >
                    ✓ Mark All as Read
                </button>
            </div>

            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <input 
                    type="text" 
                    placeholder="Search by customer name, email, phone, or property..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                />
            </div>

            {filteredInquiries.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: 'var(--bg-panel)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                    <MessageSquare size={40} style={{ opacity: 0.15 }} />
                    <h3>No inquiries found</h3>
                    <p style={{ fontSize: '0.8rem' }}>Customer submissions from listing details will show up here.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredInquiries.map(inq => {
                        const isUnread = inq.status === 'unread';
                        return (
                            <div key={inq.id} style={{ 
                                background: 'var(--bg-panel)', 
                                padding: '20px', 
                                borderRadius: 'var(--radius-md)', 
                                border: isUnread ? '2px solid #921214' : '1px solid var(--border-color)',
                                boxShadow: isUnread ? '0 4px 16px rgba(146,18,20,0.1)' : '0 2px 8px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isUnread ? '#921214' : 'var(--bg-main)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isUnread ? '#fff' : 'var(--text-primary)', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                                            {(inq.userName || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{inq.userName || 'Unknown'}</h3>
                                                {isUnread && (
                                                    <span style={{ background: 'rgba(146, 18, 20, 0.1)', color: '#921214', fontSize: '0.68rem', fontWeight: 800, borderRadius: '4px', padding: '1px 6px', border: '1px solid rgba(146,18,20,0.2)' }}>NEW</span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Phone size={12} style={{ color: 'var(--text-muted)' }} /> <a href={`tel:${inq.userPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{inq.userPhone}</a>
                                                </span>
                                                {inq.userEmail && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Mail size={12} style={{ color: 'var(--text-muted)' }} /> {inq.userEmail}
                                                    </span>
                                                )}
                                                {inq.contactMethod && (
                                                    <span style={{ background: 'var(--bg-main)', padding: '1px 6px', borderRadius: '3px', fontSize: '0.68rem', fontWeight: 600, textTransform: 'capitalize' }}>
                                                        Method: {inq.contactMethod}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <Calendar size={12} /> {getRelativeTime(inq.createdAt)}
                                    </div>
                                </div>

                                {inq.message && (
                                    <div style={{ padding: '12px 14px', background: 'var(--bg-main)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', borderLeft: '3px solid #921214', lineHeight: '1.4' }}>
                                        {inq.message}
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    <div>
                                        <strong>Property Interest:</strong> {inq.listingTitle || `ID: ${inq.listingId}`}
                                        {inq.listingAddress && <span style={{ color: 'var(--text-secondary)' }}> ({inq.listingAddress})</span>}
                                        {inq.planTo && (
                                            <span style={{ background: 'rgba(146, 18, 20, 0.08)', color: '#921214', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 600 }}>
                                                Plan to: {inq.planTo}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {isUnread && (
                                            <button 
                                                onClick={() => handleMarkContacted(inq.id)}
                                                style={{ padding: '4px 10px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <CheckCircle size={12} /> Mark Contacted
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDeleteInquiry(inq.id)}
                                            style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border-color)', color: '#ef4444', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <Trash2 size={12} /> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}
