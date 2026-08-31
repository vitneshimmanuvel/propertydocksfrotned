import React, { useState, useMemo, useRef } from 'react';
import { Users, Search, Phone, Mail, Landmark, Plus, X, Edit2, Trash2, MapPin, UserPlus, Home, Building, Upload, Link as LinkIcon, FileText } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { saveFullDatabase, uploadImage, uploadVideo } from '../utils/api';

const GOOGLE_MAPS_API_KEY = "AIzaSyDU7d-rl_p88O4tel70xd5UKPA3x8n5foU";
const mapLibraries = ['drawing', 'geometry'];

export default function ClientsManager({ 
    database,
    setDatabase,
    showToast
}) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-picker-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: mapLibraries
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);

    // Modal state for viewing an owner's properties
    const [selectedOwnerForPropertiesModal, setSelectedOwnerForPropertiesModal] = useState(null);

    // Client form states with strict validation
    const [clientNameVal, setClientNameVal] = useState('');
    const [clientPhoneVal, setClientPhoneVal] = useState('+91');
    const [clientAltPhoneVal, setClientAltPhoneVal] = useState('+91');
    const [clientEmailVal, setClientEmailVal] = useState('');
    const [clientAddressVal, setClientAddressVal] = useState('');
    const [clientNotesVal, setClientNotesVal] = useState('');
    const [isSavingClient, setIsSavingClient] = useState(false);

    // Property uploader modal states
    const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
    const [editingProperty, setEditingProperty] = useState(null);
    const [selectedClientForProperty, setSelectedClientForProperty] = useState(null);
    const [propertyTypeTab, setPropertyTypeTab] = useState('residential');
    const [selectedCategory, setSelectedCategory] = useState('residential');
    const [selectedTxnType, setSelectedTxnType] = useState('for_sale');
    
    // Lat / Lng inputs state
    const [latInputVal, setLatInputVal] = useState('');
    const [lngInputVal, setLngInputVal] = useState('');

    // Interactive Map Picker modal states
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
    const [pickerCoords, setPickerCoords] = useState({ lat: 11.3410, lng: 77.7172 });

    // Media management states
    const [mediaItemsList, setMediaItemsList] = useState([]);
    const [showAddLinkInput, setShowAddLinkInput] = useState(false);
    const [newLinkText, setNewLinkText] = useState('');
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const mediaInputRef = useRef(null);

    // Internal Admin Documents management states
    const [internalDocsList, setInternalDocsList] = useState([]);
    const [showAddDocLinkInput, setShowAddDocLinkInput] = useState(false);
    const [newDocLinkText, setNewDocLinkText] = useState('');
    const [newDocName, setNewDocName] = useState('');
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const docInputRef = useRef(null);

    // Phone & Pincode Validation Utilities
    const validatePhoneNumber = (num) => {
        if (!num) return false;
        const clean = num.replace(/[\s\-\(\)]/g, '');
        const regex = /^(\+?\d{1,4})?\d{10}$/;
        return regex.test(clean);
    };

    const validatePincode = (pin) => {
        if (!pin) return true;
        return /^\d{6}$/.test(pin.trim());
    };

    const getCorePhone = (num) => String(num || '').replace(/\D/g, '').slice(-10);

    // Load property owner clients from database.clients and database.ownerListings
    const clients = useMemo(() => {
        const clientsMap = {};

        // 1. Load registered property owners from database.clients
        (database.clients || []).forEach(c => {
            const phone = (c.phone || "").trim();
            if (!phone) return;
            const core = getCorePhone(phone);
            const key = core || phone;

            clientsMap[key] = {
                id: c.id,
                name: c.name,
                phone: phone,
                alternatePhone: c.alternatePhone || '',
                email: c.email || '—',
                address: c.address || '',
                notes: c.notes || '',
                isManual: true
            };
        });

        // 2. Aggregate property owners from database.ownerListings into clients map
        (database.ownerListings || []).forEach(o => {
            const phone = (o.contactPhone || o.ownerPhone || "").trim();
            if (!phone) return;
            const core = getCorePhone(phone);
            const key = core || phone;

            if (!clientsMap[key]) {
                clientsMap[key] = {
                    id: 'o_' + phone,
                    name: o.contactName || 'Property Owner',
                    phone: phone,
                    alternatePhone: '',
                    email: o.ownerEmail || '—',
                    address: o.location || '',
                    notes: '',
                    isManual: true
                };
            }
        });

        return Object.values(clientsMap);
    }, [database.clients, database.ownerListings]);

    // Filtered clients list
    // Modal reset helpers for client form
    const openAddClientModal = () => {
        setEditingClient(null);
        setClientNameVal('');
        setClientPhoneVal('+91');
        setClientAltPhoneVal('+91');
        setClientEmailVal('');
        setClientAddressVal('');
        setClientNotesVal('');
        setIsAddModalOpen(true);
    };

    const openEditClientModal = (client) => {
        setEditingClient(client);
        setClientNameVal(client.name || '');
        setClientPhoneVal(client.phone || '+91');
        setClientAltPhoneVal(client.alternatePhone || '+91');
        setClientEmailVal(client.email && client.email !== '—' ? client.email : '');
        setClientAddressVal(client.address || '');
        setClientNotesVal(client.notes || '');
        setIsAddModalOpen(true);
    };

    const filteredClients = useMemo(() => {
        return clients.filter(c => {
            return (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
                   (c.phone && c.phone.includes(searchQuery)) ||
                   (c.alternatePhone && c.alternatePhone.includes(searchQuery)) ||
                   (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
        });
    }, [clients, searchQuery]);

    // Save Client handler
    const handleSaveClient = async (e) => {
        e.preventDefault();
        const name = clientNameVal.trim();
        const phone = clientPhoneVal.trim();
        const alternatePhone = clientAltPhoneVal.trim();
        const email = clientEmailVal.trim();
        const address = clientAddressVal.trim();
        const notes = clientNotesVal.trim();

        if (!name) {
            if (showToast) showToast("Owner Full Name is required (letters only)", "warning");
            return;
        }

        if (!phone || phone === '+91') {
            if (showToast) showToast("Mobile Phone Number is required", "warning");
            return;
        }

        if (!validatePhoneNumber(phone)) {
            if (showToast) showToast("Primary phone must have country code & exactly 10 digits (e.g. +919876543210)", "error");
            return;
        }

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                if (showToast) showToast("Please enter a valid email address (e.g. name@domain.com)", "error");
                return;
            }
        }

        setIsSavingClient(true);
        const newDb = { ...database };
        newDb.clients = [...(newDb.clients || [])];

        if (editingClient) {
            newDb.clients = newDb.clients.map(c => {
                if (c.id === editingClient.id || c.phone === editingClient.phone) {
                    return {
                        ...c,
                        name,
                        phone,
                        alternatePhone: alternatePhone === '+91' ? '' : alternatePhone,
                        email,
                        address,
                        notes,
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
                alternatePhone: alternatePhone === '+91' ? '' : alternatePhone,
                email,
                address: address || '',
                notes: notes || '',
                createdAt: new Date().toISOString()
            };
            newDb.clients.unshift(newClient);
        }

        try {
            if (setDatabase) setDatabase({ ...newDb });
            await saveFullDatabase(newDb);
            if (showToast) showToast(editingClient ? "Property Owner updated successfully!" : "Property Owner registered into directory!", "success");
            setIsAddModalOpen(false);
            setEditingClient(null);
        } catch (err) {
            console.error(err);
            if (showToast) showToast("Failed to save property owner details", "error");
        } finally {
            setIsSavingClient(false);
        }
    };

    // Delete Client handler
    const handleDeleteClient = async (client) => {
        if (!window.confirm(`Are you sure you want to remove property owner "${client.name}"?`)) return;
        const newDb = { ...database };
        newDb.clients = (newDb.clients || []).filter(c => c.id !== client.id && c.phone !== client.phone);
        try {
            if (setDatabase) setDatabase(newDb);
            await saveFullDatabase(newDb);
            if (showToast) showToast("Property Owner removed successfully", "success");
        } catch (err) {
            console.error(err);
            if (showToast) showToast("Failed to remove property owner", "error");
        }
    };

    // --- Property Management Handlers ---

    const handleAddPropertyClick = (client) => {
        setSelectedClientForProperty(client);
        setEditingProperty(null);
        setPropertyTypeTab('residential');
        setSelectedCategory('residential');
        setLatInputVal('');
        setLngInputVal('');
        setMediaItemsList([]);
        setShowAddLinkInput(false);
        setNewLinkText('');

        setInternalDocsList([]);
        setShowAddDocLinkInput(false);
        setNewDocLinkText('');
        setNewDocName('');
        setIsPropertyModalOpen(true);
    };

    const handleEditPropertyClick = (listing, client) => {
        setSelectedClientForProperty(client);
        setEditingProperty(listing);
        const COMMERCIAL_CATS = ['commercial', 'office', 'shop', 'warehouse', 'industrial', 'commercial_land', 'showroom'];
        const isComm = COMMERCIAL_CATS.some(c => (listing.category || '').toLowerCase().includes(c));
        setPropertyTypeTab(isComm ? 'commercial' : 'residential');
        setSelectedCategory(listing.category || (isComm ? 'commercial' : 'residential'));
        
        setLatInputVal(listing.lat ? String(listing.lat) : '');
        setLngInputVal(listing.lng ? String(listing.lng) : '');

        // Initialize media list
        const initialMedia = (listing.media && listing.media.length > 0) ? listing.media : [];
        setMediaItemsList(initialMedia);
        setShowAddLinkInput(false);
        setNewLinkText('');

        // Initialize internal documents
        setInternalDocsList(listing.internalDocuments || []);
        setShowAddDocLinkInput(false);
        setNewDocLinkText('');
        setNewDocName('');
        setIsPropertyModalOpen(true);
    };

    const handleToggleListingStatus = async (listing) => {
        const nextStatus = listing.status === 'available' ? 'disabled' : 'available';
        const newDb = { ...database };
        newDb.ownerListings = (newDb.ownerListings || []).map(o => {
            if (o.id === listing.id) {
                return { ...o, status: nextStatus };
            }
            return o;
        });
        
        try {
            if (setDatabase) setDatabase(newDb);
            await saveFullDatabase(newDb);
            if (showToast) showToast(`Listing status toggled to ${nextStatus === 'available' ? 'Active' : 'Disabled'}!`, "success");
        } catch (e) {
            console.error(e);
            if (showToast) showToast("Failed to update listing status", "error");
        }
    };

    const handleDeleteProperty = async (listing) => {
        if (!window.confirm(`Are you sure you want to delete property "${listing.title}"?`)) return;
        const newDb = { ...database };
        newDb.ownerListings = (newDb.ownerListings || []).filter(o => o.id !== listing.id);
        
        try {
            if (setDatabase) setDatabase(newDb);
            await saveFullDatabase(newDb);
            if (showToast) showToast("Property listing deleted successfully!", "success");
        } catch (e) {
            console.error(e);
            if (showToast) showToast("Failed to delete property listing", "error");
        }
    };

    const handleSaveProperty = async (e) => {
        e.preventDefault();
        const form = e.target;
        
        const title = form.pTitle.value.trim();
        const category = form.pCategory.value;
        const transactionType = form.pTxn.value;
        const price = selectedTxnType === 'for_sale' ? (parseFloat(form.pPrice?.value) || 0) : 0;
        const rentAmount = selectedTxnType === 'for_rent' ? (parseFloat(form.pRent?.value) || 0) : 0;
        const bogithuAmount = 0;
        const sqft = form.pSqft.value.trim();
        const landArea = form.pLandArea ? form.pLandArea.value.trim() : '';
        const beds = parseInt(form.pBeds?.value || 0, 10);
        const baths = parseInt(form.pBaths?.value || 0, 10);
        const floors = parseInt(form.pFloors?.value || 0, 10);
        const location = form.pLocation.value.trim();
        const street = form.pStreet.value.trim();
        const landmark = form.pLandmark.value.trim();
        const pincode = form.pPincode.value.trim();
        const locationPrivacy = form.pPrivacy.value;
        const description = form.pDesc.value.trim();
        const lat = parseFloat(latInputVal) || null;
        const lng = parseFloat(lngInputVal) || null;
        const status = form.pStatus.value;

        if (!title || !location) {
            if (showToast) showToast("Title and Location are required", "warning");
            return;
        }

        // Validate Pincode (Exactly 6 Digits)
        if (pincode && !validatePincode(pincode)) {
            if (showToast) showToast("Pincode must be exactly 6 digits", "error");
            return;
        }

        const newDb = { ...database };
        newDb.ownerListings = newDb.ownerListings || [];

        if (editingProperty) {
            newDb.ownerListings = newDb.ownerListings.map(o => {
                if (o.id === editingProperty.id) {
                    return {
                        ...o,
                        title, category, transactionType, price, rentAmount, bogithuAmount, sqft, landArea, beds, baths, floors,
                        location, street, landmark, pincode, locationPrivacy, description, lat, lng, status,
                        media: mediaItemsList,
                        internalDocuments: internalDocsList,
                        updatedAt: new Date().toISOString()
                    };
                }
                return o;
            });
        } else {
            const newProperty = {
                id: 'prop_' + Date.now(),
                title, category, transactionType, price, rentAmount, bogithuAmount, sqft, landArea, beds, baths, floors,
                location, street, landmark, pincode, locationPrivacy, description, lat, lng, status, 
                media: mediaItemsList,
                internalDocuments: internalDocsList,
                contactName: selectedClientForProperty.name,
                contactPhone: selectedClientForProperty.phone,
                ownerPhone: selectedClientForProperty.phone,
                ownerEmail: selectedClientForProperty.email,
                isFreeUpload: true,
                feePaid: 0,
                createdAt: new Date().toISOString()
            };
            newDb.ownerListings.unshift(newProperty);
        }

        try {
            if (setDatabase) setDatabase(newDb);
            await saveFullDatabase(newDb);
            if (showToast) showToast(editingProperty ? "Property updated successfully!" : "Property listed under owner successfully!", "success");
            setIsPropertyModalOpen(false);
            setEditingProperty(null);
        } catch (err) {
            console.error(err);
            if (showToast) showToast("Failed to save property listing", "error");
        }
    };

    return (
        <div className="clients-dashboard" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', background: 'var(--bg-main)' }}>
            
            {/* Header with Add Client Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={24} style={{ color: 'var(--primary)' }} /> Property Owners Directory
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Manage property owner contacts, alternative numbers, and listed properties.</p>
                </div>

                <button 
                    onClick={openAddClientModal}
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
                    <UserPlus size={16} /> Add Property Owner
                </button>
            </div>

            {/* Metrics block */}
            <div style={{ maxWidth: '260px' }}>
                <div className="metric-card" style={{ padding: '16px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <h3 style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total Property Owners</h3>
                    <div className="metric-value" style={{ fontSize: '1.8rem', marginTop: '6px', fontWeight: 800, color: 'var(--text-primary)' }}>{clients.length}</div>
                    <span className="metric-sub" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Registered Property Owners</span>
                </div>
            </div>

            {/* Filter controls */}
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                        type="text"
                        placeholder="Search property owners by name, primary/alternative phone, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '10px 10px 10px 36px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                </div>
            </div>

            {/* Property Owners Column / Data Table View */}
            {filteredClients.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: 'var(--bg-panel)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                    <Users size={40} style={{ opacity: 0.15 }} />
                    <h3>No property owners found</h3>
                    <p style={{ fontSize: '0.8rem' }}>Click "Add Property Owner" above to register a property owner into the directory.</p>
                </div>
            ) : (
                <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <th style={{ padding: '14px 16px' }}>Property Owner</th>
                                <th style={{ padding: '14px 16px' }}>Primary Mobile</th>
                                <th style={{ padding: '14px 16px' }}>Alternative Mobile</th>
                                <th style={{ padding: '14px 16px' }}>Email Address</th>
                                <th style={{ padding: '14px 16px' }}>Location / Address</th>
                                <th style={{ padding: '14px 16px' }}>Properties</th>
                                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.map((client) => {
                                const ownerListings = (database.ownerListings || []).filter(listing => {
                                    const listingPhoneCore = getCorePhone(listing.contactPhone || listing.ownerPhone);
                                    const clientPhoneCore = getCorePhone(client.phone);
                                    return listingPhoneCore && clientPhoneCore && listingPhoneCore === clientPhoneCore;
                                });

                                return (
                                    <tr key={client.id || client.phone} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}>
                                        {/* Owner Name */}
                                        <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                                                    {client.name ? client.name.charAt(0).toUpperCase() : 'O'}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span>{client.name}</span>
                                                    {client.notes && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{client.notes}"</span>}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Primary Phone */}
                                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                                                <span>{client.phone}</span>
                                            </div>
                                        </td>

                                        {/* Alternative Phone */}
                                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                            {client.alternatePhone ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Phone size={14} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                                                    <span>{client.alternatePhone}</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                                            )}
                                        </td>

                                        {/* Email */}
                                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                                            {client.email && client.email !== '—' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                                                    <span>{client.email}</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                                            )}
                                        </td>

                                        {/* Location / Address */}
                                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                                            {client.address ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                                                    <span>{client.address}</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                                            )}
                                        </td>

                                        {/* Properties Count Badge */}
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', background: ownerListings.length > 0 ? 'rgba(146, 18, 20, 0.12)' : 'var(--bg-main)', color: ownerListings.length > 0 ? '#921214' : 'var(--text-muted)', border: ownerListings.length > 0 ? '1px solid rgba(146, 18, 20, 0.3)' : '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                                                {ownerListings.length} {ownerListings.length === 1 ? 'Property' : 'Properties'}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                    onClick={() => setSelectedOwnerForPropertiesModal(client)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#921214',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontWeight: 700,
                                                        fontSize: '0.78rem',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        boxShadow: '0 2px 6px rgba(146, 18, 20, 0.2)',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    <Landmark size={14} /> View Properties ({ownerListings.length})
                                                </button>

                                                <button 
                                                    onClick={() => openEditClientModal(client)}
                                                    style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                                                    title="Edit Property Owner"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                
                                                <button 
                                                    onClick={() => handleDeleteClient(client)}
                                                    style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                                                    title="Delete Property Owner"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* View Owner Properties Popup Modal */}
            {selectedOwnerForPropertiesModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'var(--bg-panel)', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                        
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Landmark size={20} color="#921214" />
                                    {selectedOwnerForPropertiesModal.name}'s Listed Properties
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    📞 {selectedOwnerForPropertiesModal.phone} {selectedOwnerForPropertiesModal.alternatePhone ? `• Alt: ${selectedOwnerForPropertiesModal.alternatePhone}` : ''}
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button 
                                    onClick={() => handleAddPropertyClick(selectedOwnerForPropertiesModal)}
                                    style={{
                                        padding: '6px 12px',
                                        background: '#921214',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '0.78rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Plus size={14} /> Add Property
                                </button>

                                <button onClick={() => setSelectedOwnerForPropertiesModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    <X size={22} />
                                </button>
                            </div>
                        </div>

                        {/* Properties List */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                            {(() => {
                                const ownerListings = (database.ownerListings || []).filter(listing => {
                                    const listingPhoneCore = getCorePhone(listing.contactPhone || listing.ownerPhone);
                                    const clientPhoneCore = getCorePhone(selectedOwnerForPropertiesModal.phone);
                                    return listingPhoneCore && clientPhoneCore && listingPhoneCore === clientPhoneCore;
                                });

                                if (ownerListings.length === 0) {
                                    return (
                                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: 'var(--bg-main)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                                            <Landmark size={32} style={{ opacity: 0.2 }} />
                                            <p style={{ fontSize: '0.85rem', margin: 0 }}>No properties listed under this owner yet.</p>
                                            <button 
                                                onClick={() => handleAddPropertyClick(selectedOwnerForPropertiesModal)}
                                                style={{ padding: '8px 14px', background: '#921214', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', marginTop: '6px' }}
                                            >
                                                + Add First Property
                                            </button>
                                        </div>
                                    );
                                }

                                return ownerListings.map(listing => (
                                    <div key={listing.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', gap: '14px' }}>
                                        {/* Property Thumbnail Image */}
                                        <div style={{ width: '54px', height: '54px', borderRadius: '6px', overflow: 'hidden', background: '#f1f5f9', border: '1px solid var(--border-color)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {listing.media && listing.media[0] && listing.media[0].url ? (
                                                listing.media[0].type === 'video' || listing.media[0].url.match(/\.(mp4|webm|mov)($|\?)/i) ? (
                                                    <video src={listing.media[0].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <img src={listing.media[0].url} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                )
                                            ) : (
                                                <Landmark size={22} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflow: 'hidden' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{listing.title}</span>
                                            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                                📍 {listing.location || 'Location'} • {listing.category.toUpperCase().replace('_', ' ')}
                                            </span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#921214' }}>
                                                {listing.price ? `₹${Number(listing.price).toLocaleString('en-IN')}` : (listing.rentAmount ? `₹${Number(listing.rentAmount).toLocaleString('en-IN')}/m` : '—')}
                                            </span>
                                        </div>

                                        {/* Property Actions */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                            <button
                                                onClick={() => handleToggleListingStatus(listing)}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    fontSize: '0.68rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    background: listing.status === 'available' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                                                    color: listing.status === 'available' ? '#22c55e' : '#ef4444'
                                                }}
                                            >
                                                {listing.status === 'available' ? 'Active' : 'Disabled'}
                                            </button>
                                            
                                            <button 
                                                onClick={() => handleEditPropertyClick(listing, selectedOwnerForPropertiesModal)}
                                                style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '4px' }}
                                                title="Edit Property"
                                            >
                                                <Edit2 size={14} />
                                            </button>

                                            <button 
                                                onClick={() => handleDeleteProperty(listing)}
                                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '4px' }}
                                                title="Delete Property"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Add / Edit Client Modal */}
            {(isAddModalOpen || editingClient) && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--bg-surface)', padding: '28px', borderRadius: '12px', width: '90%', maxWidth: '480px', border: '1px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <UserPlus size={20} color="#921214" />
                                {editingClient ? 'Edit Property Owner Details' : 'Add Property Owner'}
                            </h3>
                            <button onClick={() => { setIsAddModalOpen(false); setEditingClient(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveClient} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Owner Full Name (Letters Only) <span style={{ color: '#ef4444' }}>*</span></label>
                                <input 
                                    type="text" 
                                    name="clientName" 
                                    value={clientNameVal} 
                                    onChange={(e) => setClientNameVal(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                                    placeholder="e.g. Anand Kumar" 
                                    required 
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} 
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Mobile Phone (Digits Only) <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input 
                                        type="tel" 
                                        name="clientPhone" 
                                        value={clientPhoneVal} 
                                        onChange={(e) => setClientPhoneVal(e.target.value.replace(/[^0-9+]/g, ''))}
                                        placeholder="+919876543210" 
                                        required 
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} 
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Alternative Mobile Phone</label>
                                    <input 
                                        type="tel" 
                                        name="clientAlternatePhone" 
                                        value={clientAltPhoneVal} 
                                        onChange={(e) => setClientAltPhoneVal(e.target.value.replace(/[^0-9+]/g, ''))}
                                        placeholder="+919876543210" 
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} 
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Email Address (Optional)</label>
                                <input 
                                    type="email" 
                                    name="clientEmail" 
                                    value={clientEmailVal} 
                                    onChange={(e) => setClientEmailVal(e.target.value.trim())}
                                    placeholder="anand@example.com (Optional)" 
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} 
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Location / Address</label>
                                <input 
                                    type="text" 
                                    name="clientAddress" 
                                    value={clientAddressVal} 
                                    onChange={(e) => setClientAddressVal(e.target.value)}
                                    placeholder="e.g. Vijayamangalam, Erode" 
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} 
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Notes / Requirements</label>
                                <textarea 
                                    name="clientNotes" 
                                    rows="2" 
                                    value={clientNotesVal} 
                                    onChange={(e) => setClientNotesVal(e.target.value)}
                                    placeholder="Property owner notes..." 
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', resize: 'none' }} 
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSavingClient}
                                style={{ width: '100%', padding: '12px', background: isSavingClient ? '#750d0f' : '#921214', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '0.95rem', cursor: isSavingClient ? 'not-allowed' : 'pointer', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {isSavingClient ? (
                                    <>
                                        <span className="spinner-loader" style={{ border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', width: '16px', height: '16px', animation: 'spin 0.8s linear infinite' }}></span>
                                        {editingClient ? 'Saving Changes...' : 'Registering Property Owner...'}
                                    </>
                                ) : (
                                    editingClient ? 'Save Property Owner Changes' : 'Register Property Owner'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add / Edit Client Property Modal */}
            {isPropertyModalOpen && selectedClientForProperty && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '20px 0' }}>
                    <div style={{ background: 'var(--bg-panel)', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '640px', border: '1px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', margin: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Landmark size={20} color="#921214" />
                                {editingProperty ? 'Edit Property Listing' : 'List Property under Owner'}
                            </h3>
                            <button onClick={() => { setIsPropertyModalOpen(false); setEditingProperty(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Top Property Type Mode Switcher */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'var(--bg-main)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setPropertyTypeTab('residential');
                                    setSelectedCategory('residential');
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: propertyTypeTab === 'residential' ? '#921214' : 'transparent',
                                    color: propertyTypeTab === 'residential' ? '#ffffff' : 'var(--text-secondary)',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Home size={16} /> 🏠 Residential Mode
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setPropertyTypeTab('commercial');
                                    setSelectedCategory('commercial');
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: propertyTypeTab === 'commercial' ? '#921214' : 'transparent',
                                    color: propertyTypeTab === 'commercial' ? '#ffffff' : 'var(--text-secondary)',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Building size={16} /> 🏢 Commercial Mode
                            </button>
                        </div>

                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', background: 'rgba(146, 18, 20, 0.04)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #921214' }}>
                            👤 <strong>Listing Owner:</strong> {selectedClientForProperty.name} ({selectedClientForProperty.phone})
                        </p>

                        <form onSubmit={handleSaveProperty} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Property Title / Name <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" name="pTitle" defaultValue={editingProperty ? editingProperty.title : ''} placeholder={propertyTypeTab === 'residential' ? 'e.g. Premium 3 BHK Gated Villa' : 'e.g. Property Docks Commercial Plaza'} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                        {propertyTypeTab === 'residential' ? 'Residential Type' : 'Commercial Type'} <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select 
                                        name="pCategory" 
                                        value={selectedCategory} 
                                        onChange={(e) => setSelectedCategory(e.target.value)} 
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
                                    >
                                        {propertyTypeTab === 'residential' ? (
                                            <>
                                                <option value="residential">House / Villa</option>
                                                <option value="apartment">Apartment / Flat</option>
                                                <option value="independent_floor">Independent Floor</option>
                                                <option value="land">Land / Plot</option>
                                                <option value="farm_house">Farm House</option>
                                                <option value="rental_house">Rental House</option>
                                                <option value="pg">PG Accommodation</option>
                                                <option value="room">Room</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="commercial">Commercial Building</option>
                                                <option value="office">Office Space</option>
                                                <option value="shop">Shop / Showroom</option>
                                                <option value="warehouse">Warehouse / Godown</option>
                                                <option value="industrial">Industrial Land</option>
                                                <option value="commercial_land">Commercial Land / Plot</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Transaction Type <span style={{ color: '#ef4444' }}>*</span></label>
                                    <select 
                                        name="pTxn" 
                                        value={selectedTxnType} 
                                        onChange={(e) => setSelectedTxnType(e.target.value)} 
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
                                    >
                                        <option value="for_sale">For Sale</option>
                                        <option value="for_rent">For Rent</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                {selectedTxnType === 'for_sale' ? (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Sale Price (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="number" name="pPrice" defaultValue={editingProperty ? editingProperty.price : ''} placeholder="e.g. 4500000" required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                ) : (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Monthly Rent (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="number" name="pRent" defaultValue={editingProperty ? editingProperty.rentAmount : ''} placeholder="e.g. 15000" required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                )}
                            </div>

                            {/* Dynamic Mode-Specific Fields */}
                            {propertyTypeTab === 'residential' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Built-up Area (Sqft) <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="text" name="pSqft" defaultValue={editingProperty ? editingProperty.sqft : ''} placeholder="e.g. 1,500" required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Bedrooms</label>
                                        <input type="number" name="pBeds" defaultValue={editingProperty ? editingProperty.beds : 3} placeholder="e.g. 3" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Bathrooms</label>
                                        <input type="number" name="pBaths" defaultValue={editingProperty ? editingProperty.baths : 2} placeholder="e.g. 2" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Building Size (Sqft) <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="text" name="pSqft" defaultValue={editingProperty ? editingProperty.sqft : ''} placeholder="e.g. 4,500" required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Land Area (Sqft / Acres)</label>
                                        <input type="text" name="pLandArea" defaultValue={editingProperty ? editingProperty.landArea : ''} placeholder="e.g. 5000" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Total Floors</label>
                                        <input type="number" name="pFloors" defaultValue={editingProperty ? editingProperty.floors : 3} placeholder="e.g. 3" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Location / City <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="text" name="pLocation" defaultValue={editingProperty ? editingProperty.location : ''} placeholder="e.g. Coimbatore" required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Street Name</label>
                                    <input type="text" name="pStreet" defaultValue={editingProperty ? editingProperty.street : ''} placeholder="e.g. Avinashi Road" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Landmark</label>
                                    <input type="text" name="pLandmark" defaultValue={editingProperty ? editingProperty.landmark : ''} placeholder="e.g. Opp. Tech Park" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Pincode (Exactly 6 Digits)</label>
                                    <input type="text" maxLength={6} name="pPincode" defaultValue={editingProperty ? editingProperty.pincode : ''} placeholder="e.g. 641014" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Location Privacy</label>
                                    <select name="pPrivacy" defaultValue={editingProperty ? editingProperty.locationPrivacy : 'exact'} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}>
                                        <option value="exact">Exact (Show Address)</option>
                                        <option value="approximate">Approximate (Hide Address)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Latitude & Longitude with Interactive Map Picker Button */}
                            <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Latitude</label>
                                        <input type="number" step="any" name="pLat" value={latInputVal} onChange={(e) => setLatInputVal(e.target.value)} placeholder="e.g. 11.0250" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Longitude</label>
                                        <input type="number" step="any" name="pLng" value={lngInputVal} onChange={(e) => setLngInputVal(e.target.value)} placeholder="e.g. 76.9950" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const curLat = parseFloat(latInputVal) || 11.3410;
                                        const curLng = parseFloat(lngInputVal) || 77.7172;
                                        setPickerCoords({ lat: curLat, lng: curLng });
                                        setIsMapPickerOpen(true);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: 'rgba(146, 18, 20, 0.08)',
                                        color: '#921214',
                                        border: '1px solid rgba(146, 18, 20, 0.3)',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <MapPin size={16} /> 📍 Click to Pick Precise Location on Map
                                </button>
                            </div>

                            {/* Showcase Media Gallery Manager */}
                            <div style={{ background: 'var(--bg-main)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                        Showcase Media (Photos, Videos & Links)
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            disabled={isUploadingMedia}
                                            onClick={() => mediaInputRef.current && mediaInputRef.current.click()}
                                            style={{
                                                padding: '6px 12px',
                                                background: '#921214',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontWeight: 700,
                                                fontSize: '0.78rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                opacity: isUploadingMedia ? 0.7 : 1
                                            }}
                                        >
                                            <Upload size={14} /> {isUploadingMedia ? 'Uploading...' : 'Upload File'}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowAddLinkInput(prev => !prev)}
                                            style={{
                                                padding: '6px 12px',
                                                background: 'var(--bg-surface)',
                                                color: 'var(--text-primary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                fontWeight: 700,
                                                fontSize: '0.78rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <LinkIcon size={14} /> + Add Link
                                        </button>
                                    </div>
                                </div>

                                {/* Hidden File Input for Cloudinary Upload */}
                                <input 
                                    type="file" 
                                    ref={mediaInputRef}
                                    accept="image/*,video/*"
                                    style={{ display: 'none' }}
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        setIsUploadingMedia(true);
                                        if (showToast) showToast("Uploading file to Cloudinary...", "info");
                                        try {
                                            let res;
                                            const isVid = file.type.startsWith('video/');
                                            if (isVid) {
                                                res = await uploadVideo(file);
                                            } else {
                                                res = await uploadImage(file);
                                            }
                                            if (res && res.url) {
                                                setMediaItemsList(prev => [...prev, { type: isVid ? 'video' : 'image', url: res.url }]);
                                                if (showToast) showToast("Media Uploaded Successfully!", "success");
                                            }
                                        } catch (err) {
                                            console.error(err);
                                            if (showToast) showToast("Upload failed: " + err.message, "error");
                                        } finally {
                                            setIsUploadingMedia(false);
                                            e.target.value = '';
                                        }
                                    }}
                                />

                                {/* Inline Add Link Form */}
                                {showAddLinkInput && (
                                    <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        <input 
                                            type="url"
                                            placeholder="Paste media image/video URL link here..."
                                            value={newLinkText}
                                            onChange={(e) => setNewLinkText(e.target.value)}
                                            style={{ flex: 1, padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!newLinkText.trim()) return;
                                                const url = newLinkText.trim();
                                                const isVid = url.match(/\.(mp4|webm|mov)($|\?)/i) || url.includes('video');
                                                setMediaItemsList(prev => [...prev, { type: isVid ? 'video' : 'image', url }]);
                                                setNewLinkText('');
                                                setShowAddLinkInput(false);
                                                if (showToast) showToast("Link added to showcase media!", "success");
                                            }}
                                            style={{ padding: '8px 14px', background: '#921214', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                                        >
                                            Confirm Link
                                        </button>
                                    </div>
                                )}

                                {/* Media Gallery Items Cards */}
                                {mediaItemsList.length === 0 ? (
                                    <div style={{ padding: '14px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px dashed var(--border-color)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        No showcase media added yet. Click "Upload File" or "+ Add Link" above.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                                        {mediaItemsList.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
                                                    {item.url.match(/\.(mp4|webm|mov)($|\?)/i) || item.type === 'video' || item.url.includes('video') ? (
                                                        <video src={item.url} style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '4px', background: '#000' }} />
                                                    ) : (
                                                        <img src={item.url} alt="Media thumbnail" style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '4px', background: '#f1f5f9' }} />
                                                    )}
                                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '2px' }}>
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                                                            {item.type === 'video' || item.url.includes('video') ? '🎬 Video' : '📷 Photo / Image Link'}
                                                        </span>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                            Showcase Asset #{idx + 1}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newUrl = window.prompt("Enter new URL or link to replace this media:", item.url);
                                                            if (newUrl && newUrl.trim()) {
                                                                setMediaItemsList(prev => prev.map((m, i) => i === idx ? { ...m, url: newUrl.trim() } : m));
                                                            }
                                                        }}
                                                        style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                                                    >
                                                        Change
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setMediaItemsList(prev => prev.filter((_, i) => i !== idx));
                                                        }}
                                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', padding: '4px 6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Internal Admin Confidential Documents (Patta, EC, Sale Deed, Survey Map) */}
                            <div style={{ background: 'rgba(245,158,11,0.05)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#d97706', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <FileText size={16} /> 🔒 Internal Admin Documents (Patta, EC, Sale Deed, Survey Maps)
                                        </label>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Only visible to Admins. Hidden from public website customers.</span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            disabled={isUploadingDoc}
                                            onClick={() => docInputRef.current && docInputRef.current.click()}
                                            style={{
                                                padding: '6px 12px',
                                                background: '#d97706',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontWeight: 700,
                                                fontSize: '0.78rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                opacity: isUploadingDoc ? 0.7 : 1
                                            }}
                                        >
                                            <Upload size={14} /> {isUploadingDoc ? 'Uploading...' : 'Upload Doc'}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowAddDocLinkInput(prev => !prev)}
                                            style={{
                                                padding: '6px 12px',
                                                background: 'var(--bg-surface)',
                                                color: 'var(--text-primary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                fontWeight: 700,
                                                fontSize: '0.78rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <LinkIcon size={14} /> + Add Link
                                        </button>
                                    </div>
                                </div>

                                {/* Hidden Doc Upload Input */}
                                <input 
                                    type="file" 
                                    ref={docInputRef}
                                    accept="application/pdf,image/*,.doc,.docx"
                                    style={{ display: 'none' }}
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        setIsUploadingDoc(true);
                                        if (showToast) showToast("Uploading document...", "info");
                                        try {
                                            const res = await uploadImage(file);
                                            if (res && res.url) {
                                                setInternalDocsList(prev => [...prev, { name: file.name, url: res.url, date: new Date().toLocaleDateString() }]);
                                                if (showToast) showToast("Internal Document Uploaded!", "success");
                                            }
                                        } catch (err) {
                                            console.error(err);
                                            if (showToast) showToast("Upload failed: " + err.message, "error");
                                        } finally {
                                            setIsUploadingDoc(false);
                                            e.target.value = '';
                                        }
                                    }}
                                />

                                {/* Inline Add Document Link Form */}
                                {showAddDocLinkInput && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        <input 
                                            type="text"
                                            placeholder="Document title (e.g. Patta Copy, EC 2024, Parent Deed)..."
                                            value={newDocName}
                                            onChange={(e) => setNewDocName(e.target.value)}
                                            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none' }}
                                        />
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input 
                                                type="url"
                                                placeholder="Document URL link..."
                                                value={newDocLinkText}
                                                onChange={(e) => setNewDocLinkText(e.target.value)}
                                                style={{ flex: 1, padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!newDocLinkText.trim()) return;
                                                    setInternalDocsList(prev => [...prev, { name: newDocName.trim() || 'Internal Document', url: newDocLinkText.trim(), date: new Date().toLocaleDateString() }]);
                                                    setNewDocLinkText('');
                                                    setNewDocName('');
                                                    setShowAddDocLinkInput(false);
                                                    if (showToast) showToast("Internal document link added!", "success");
                                                }}
                                                style={{ padding: '8px 14px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                                            >
                                                Confirm Doc
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Document Cards */}
                                {internalDocsList.length === 0 ? (
                                    <div style={{ padding: '10px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px dashed var(--border-color)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        No internal documents uploaded yet. (Patta, EC, Sale Deed)
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                                        {internalDocsList.map((doc, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                    <FileText size={16} style={{ color: '#d97706', flexShrink: 0 }} />
                                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{doc.name}</span>
                                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.68rem', color: 'var(--primary)', textDecoration: 'underline', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{doc.url}</a>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setInternalDocsList(prev => prev.filter((_, i) => i !== idx))}
                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Publish Status</label>
                                    <select name="pStatus" defaultValue={editingProperty ? editingProperty.status : 'available'} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}>
                                        <option value="available">Active (Show to Public)</option>
                                        <option value="disabled">Disabled (Hide from Public)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Property Description</label>
                                <textarea name="pDesc" rows="3" defaultValue={editingProperty ? editingProperty.description : ''} placeholder="Write details about flooring, water facilities, compound walls, legal documentation, road width, etc..." style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', resize: 'none' }} />
                            </div>

                            <button type="submit" style={{ width: '100%', padding: '12px', background: '#921214', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', marginTop: '6px' }}>
                                {editingProperty ? 'Save Property Changes' : 'List Property'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Interactive Map Location Picker Modal */}
            {isMapPickerOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '720px', height: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MapPin size={20} color="#921214" /> Pick Property Location on Map
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click anywhere on the map or drag the pin to set exact coordinates.</p>
                            </div>

                            <button onClick={() => setIsMapPickerOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={22} />
                            </button>
                        </div>

                        <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                            {isLoaded ? (
                                <GoogleMap
                                    mapContainerStyle={{ width: '100%', height: '100%' }}
                                    center={pickerCoords}
                                    zoom={13}
                                    onClick={(e) => {
                                        if (e.latLng) {
                                            setPickerCoords({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                                        }
                                    }}
                                >
                                    <Marker 
                                        position={pickerCoords}
                                        draggable={true}
                                        onDragEnd={(e) => {
                                            if (e.latLng) {
                                                setPickerCoords({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                                            }
                                        }}
                                    />
                                </GoogleMap>
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Loading Google Map...
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                                Selected Coordinates: <span style={{ color: '#921214' }}>{pickerCoords.lat.toFixed(6)}, {pickerCoords.lng.toFixed(6)}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setIsMapPickerOpen(false)}
                                    style={{ padding: '8px 14px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setLatInputVal(pickerCoords.lat.toFixed(6));
                                        setLngInputVal(pickerCoords.lng.toFixed(6));
                                        setIsMapPickerOpen(false);
                                        if (showToast) showToast(`Set coordinates to (${pickerCoords.lat.toFixed(4)}, ${pickerCoords.lng.toFixed(4)})`, "success");
                                    }}
                                    style={{ padding: '8px 16px', background: '#921214', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(146, 18, 20, 0.3)' }}
                                >
                                    Confirm Selected Location
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
