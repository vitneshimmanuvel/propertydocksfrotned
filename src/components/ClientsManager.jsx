import React, { useState, useMemo } from 'react';
import { Users, Search, Phone, Mail, FileText, Landmark, BadgeAlert, Plus, X, Edit2, Trash2, MapPin, UserPlus } from 'lucide-react';
import { saveFullDatabase } from '../utils/api';

export default function ClientsManager({ 
    database,
    setDatabase,
    showToast
}) {
    const bookings = database.bookings || [];
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);

    // Combine manually registered clients from database.clients and aggregated booking clients
    const clients = useMemo(() => {
        const clientsMap = {};

        // 1. Load manually added clients from database.clients
        (database.clients || []).forEach(c => {
            const phone = (c.phone || "").trim();
            if (!phone) return;
            clientsMap[phone] = {
                id: c.id,
                name: c.name,
                phone: phone,
                email: c.email || '—',
                address: c.address || '',
                notes: c.notes || '',
                clientType: c.clientType || 'Registered Client',
                bookedPlots: [],
                totalPaid: 0,
                bookingsCount: 0,
                pendingCount: 0,
                confirmedCount: 0,
                cancelledCount: 0,
                isManual: true
            };
        });

        // 2. Aggregate bookings into clients map
        bookings.forEach(b => {
            const phone = (b.customerPhone || "").trim();
            if (!phone) return;

            if (!clientsMap[phone]) {
                clientsMap[phone] = {
                    id: 'b_' + phone,
                    name: b.customerName,
                    phone: phone,
                    email: b.customerEmail || '—',
                    address: '',
                    notes: '',
                    clientType: 'Buyer',
                    bookedPlots: [],
                    totalPaid: 0,
                    bookingsCount: 0,
                    pendingCount: 0,
                    confirmedCount: 0,
                    cancelledCount: 0,
                    isManual: false
                };
            }

            clientsMap[phone].name = b.customerName || clientsMap[phone].name;
            clientsMap[phone].email = b.customerEmail || clientsMap[phone].email;
            
            const plotDescriptor = `${b.plotId} (${(database.layouts || []).find(l => l.id === b.layoutId)?.name || 'Layout'})`;
            if (!clientsMap[phone].bookedPlots.includes(plotDescriptor)) {
                clientsMap[phone].bookedPlots.push(plotDescriptor);
            }

            clientsMap[phone].bookingsCount++;
            if (b.status === 'confirmed') {
                clientsMap[phone].confirmedCount++;
                clientsMap[phone].totalPaid += Number(b.amountPaid) || 0;
            } else if (b.status === 'pending') {
                clientsMap[phone].pendingCount++;
            } else if (b.status === 'cancelled') {
                clientsMap[phone].cancelledCount++;
            }
        });

        return Object.values(clientsMap);
    }, [database.clients, bookings, database.layouts]);

    // Filtered clients list
    const filteredClients = useMemo(() => {
        return clients.filter(c => {
            return (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
                   (c.phone && c.phone.includes(searchQuery)) ||
                   (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                   (c.clientType && c.clientType.toLowerCase().includes(searchQuery.toLowerCase()));
        });
    }, [clients, searchQuery]);

    // Save Client handler
    const handleSaveClient = async (e) => {
        e.preventDefault();
        const form = e.target;
        const name = form.clientName.value.trim();
        const phone = form.clientPhone.value.trim();
        const email = form.clientEmail.value.trim();
        const address = form.clientAddress.value.trim();
        const notes = form.clientNotes.value.trim();
        const clientType = form.clientType.value;

        if (!name || !phone) {
            if (showToast) showToast("Client name and phone number are required", "warning");
            return;
        }

        const newDb = { ...database };
        newDb.clients = newDb.clients || [];

        if (editingClient) {
            newDb.clients = newDb.clients.map(c => {
                if (c.id === editingClient.id || c.phone === editingClient.phone) {
                    return {
                        ...c,
                        name,
                        phone,
                        email,
                        address,
                        notes,
                        clientType,
                        updatedAt: new Date().toISOString()
                    };
                }
                return c;
            });
        } else {
            const newClient = {
                id: 'client_' + Date.now(),
                name,
                phone,
                email: email || '—',
                address: address || '',
                notes: notes || '',
                clientType: clientType || 'Buyer',
                createdAt: new Date().toISOString()
            };
            newDb.clients.push(newClient);
        }

        try {
            if (setDatabase) setDatabase(newDb);
            await saveFullDatabase(newDb);
            if (showToast) showToast(editingClient ? "Client updated successfully!" : "Client added successfully to directory!", "success");
            setIsAddModalOpen(false);
            setEditingClient(null);
        } catch (err) {
            console.error(err);
            if (showToast) showToast("Failed to save client details", "error");
        }
    };

    // Delete Client handler
    const handleDeleteClient = async (client) => {
        if (!window.confirm(`Are you sure you want to remove client "${client.name}"?`)) return;
        const newDb = { ...database };
        newDb.clients = (newDb.clients || []).filter(c => c.id !== client.id && c.phone !== client.phone);
        try {
            if (setDatabase) setDatabase(newDb);
            await saveFullDatabase(newDb);
            if (showToast) showToast("Client removed successfully", "success");
        } catch (err) {
            console.error(err);
            if (showToast) showToast("Failed to remove client", "error");
        }
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="clients-dashboard" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', background: 'var(--bg-main)' }}>
            
            {/* Header with Add Client Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={24} style={{ color: 'var(--primary)' }} /> Customer & Buyer Directory
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Manage client contacts, registered buyers, payment ledgers, and property bookings.</p>
                </div>

                <button 
                    onClick={() => { setEditingClient(null); setIsAddModalOpen(true); }}
                    style={{
                        padding: '10px 18px',
                        background: '#921214',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(146, 18, 20, 0.25)'
                    }}
                >
                    <UserPlus size={16} /> Add New Client
                </button>
            </div>

            {/* Metrics block */}
            <div style={{ maxWidth: '260px' }}>
                <div className="metric-card" style={{ padding: '16px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <h3 style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total Registered Clients</h3>
                    <div className="metric-value" style={{ fontSize: '1.8rem', marginTop: '6px', fontWeight: 800, color: 'var(--text-primary)' }}>{clients.length}</div>
                    <span className="metric-sub" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Buyers & Manual Client entries</span>
                </div>
            </div>

            {/* Filter controls */}
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                        type="text"
                        placeholder="Search clients by name, phone number, email, or client category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '10px 10px 10px 36px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                </div>
            </div>

            {/* Clients Grid Directory */}
            {filteredClients.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: 'var(--bg-panel)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                    <Users size={40} style={{ opacity: 0.15 }} />
                    <h3>No clients found</h3>
                    <p style={{ fontSize: '0.8rem' }}>Click "Add New Client" above to register a client into the directory.</p>
                    <button onClick={() => setIsAddModalOpen(true)} style={{ padding: '8px 16px', background: '#921214', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                        Add New Client Now
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                    {filteredClients.map((client) => (
                        <div 
                            key={client.id || client.phone}
                            style={{
                                background: 'var(--bg-panel)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                        >
                            {/* Header card banner */}
                            <div style={{ padding: '18px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                                        {client.name ? client.name.charAt(0).toUpperCase() : 'C'}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', margin: 0 }}>{client.name}</h3>
                                        <span style={{ fontSize: '0.72rem', color: '#921214', fontWeight: 600 }}>{client.clientType || 'Registered Client'}</span>
                                    </div>
                                </div>

                                {client.isManual && (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button 
                                            onClick={() => { setEditingClient(client); setIsAddModalOpen(true); }}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                            title="Edit Client"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteClient(client)}
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                            title="Delete Client"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Contact details */}
                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                                    <span>{client.phone}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                                    <span>{client.email || '—'}</span>
                                </div>
                                {client.address && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                        <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span>{client.address}</span>
                                    </div>
                                )}
                                {client.notes && (
                                    <div style={{ padding: '8px 10px', background: 'var(--bg-main)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        "{client.notes}"
                                    </div>
                                )}
                            </div>

                            {/* Booked Plots Tag Chips */}
                            <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Booked Plots & Estates</span>
                                {client.bookedPlots.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {client.bookedPlots.map((plot, idx) => (
                                            <span 
                                                key={idx}
                                                style={{
                                                    fontSize: '0.68rem',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid var(--border-color)',
                                                    padding: '3px 8px',
                                                    borderRadius: '4px',
                                                    color: 'var(--text-primary)',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Landmark size={10} style={{ color: 'var(--primary)' }} />
                                                {plot}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No plot bookings registered yet</span>
                                )}
                            </div>

                            {/* Ledger statistics footer */}
                            <div style={{ padding: '12px 18px', background: 'rgba(0,0,0,0.1)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Deposit</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(client.totalPaid)}</span>
                                </div>
                                {client.pendingCount > 0 && (
                                    <span style={{
                                        fontSize: '0.62rem',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        background: 'rgba(245,158,11,0.12)',
                                        color: '#f59e0b',
                                        border: '1px solid rgba(245,158,11,0.2)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <BadgeAlert size={10} />
                                        {client.pendingCount} Pending Approval
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add / Edit Client Modal */}
            {(isAddModalOpen || editingClient) && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--bg-surface)', padding: '28px', borderRadius: '12px', width: '90%', maxWidth: '480px', border: '1px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <UserPlus size={20} color="#921214" />
                                {editingClient ? 'Edit Client Details' : 'Add New Client'}
                            </h3>
                            <button onClick={() => { setIsAddModalOpen(false); setEditingClient(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveClient} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Client Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" name="clientName" defaultValue={editingClient ? editingClient.name : ''} placeholder="e.g. Anand Kumar" required style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Mobile Phone <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="tel" name="clientPhone" defaultValue={editingClient ? editingClient.phone : ''} placeholder="+91 98765 43210" required style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Client Category</label>
                                    <select name="clientType" defaultValue={editingClient ? editingClient.clientType : 'Buyer'} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }}>
                                        <option value="Buyer">Buyer</option>
                                        <option value="Investor">Investor</option>
                                        <option value="Landlord/Promoter">Landlord / Promoter</option>
                                        <option value="VIP Client">VIP Client</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Email Address</label>
                                <input type="email" name="clientEmail" defaultValue={editingClient ? editingClient.email : ''} placeholder="anand@example.com" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Location / Address</label>
                                <input type="text" name="clientAddress" defaultValue={editingClient ? editingClient.address : ''} placeholder="e.g. Vijayamangalam, Erode" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Notes / Requirements</label>
                                <textarea name="clientNotes" rows="2" defaultValue={editingClient ? editingClient.notes : ''} placeholder="Interested in 2BHK villa or layout plot..." style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', resize: 'none' }} />
                            </div>

                            <button type="submit" style={{ width: '100%', padding: '12px', background: '#921214', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', marginTop: '6px' }}>
                                {editingClient ? 'Save Client Changes' : 'Register Client'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
