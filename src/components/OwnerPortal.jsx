import React, { useState, useEffect } from 'react';
import { Home, PlusCircle, List, MapPin, MessageSquare, Phone, Calendar, Mail, Edit2, Trash2, Map, ShieldCheck, LogOut } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, StandaloneSearchBox } from '@react-google-maps/api';
import { saveFullDatabase } from '../utils/api';

const GOOGLE_MAPS_API_KEY = "AIzaSyDU7d-rl_p88O4tel70xd5UKPA3x8n5foU";
const libraries = ['places', 'drawing', 'geometry'];

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629 // Center of India
};

const SignaturePad = ({ onSign }) => {
    const canvasRef = React.useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        return {
            offsetX: (clientX - rect.left) * scaleX,
            offsetY: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e) => {
        const { offsetX, offsetY } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
        setIsEmpty(false);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const endDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        onSign(canvasRef.current.toDataURL());
    };

    const clear = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setIsEmpty(true);
        onSign(null);
    };

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                const x = (canvas.width / 2) - (img.width / 2) * scale;
                const y = (canvas.height / 2) - (img.height / 2) * scale;
                
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                setIsEmpty(false);
                onSign(canvas.toDataURL());
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: '#fff', overflow: 'hidden' }}>
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    style={{ width: '100%', height: '150px', touchAction: 'none' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                    <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
                    Upload Image Instead
                </label>
                <button type="button" onClick={clear} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Clear Signature</button>
            </div>
        </div>
    );
};


export default function OwnerPortal({ database, setDatabase, showToast, setRole, setIsAdminAuthenticated }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: libraries
    });

    const [searchBox, setSearchBox] = useState(null);
    const [mapCenter, setMapCenter] = useState(defaultCenter);
    const [mapZoom, setMapZoom] = useState(4);
    const [editingId, setEditingId] = useState(null);
    const [adminSearchQuery, setAdminSearchQuery] = useState('');
    const [adminCategoryFilter, setAdminCategoryFilter] = useState('all');
    const [inquirySearchQuery, setInquirySearchQuery] = useState('');

    const onSearchBoxLoad = ref => setSearchBox(ref);
    const onPlacesChanged = () => {
        if (searchBox) {
            const places = searchBox.getPlaces();
            if (places && places.length > 0) {
                const place = places[0];
                if (place.geometry && place.geometry.location) {
                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();
                    setMapCenter({ lat, lng });
                    setMapZoom(15);
                    setFormData(prev => ({ ...prev, lat, lng }));
                }
            }
        }
    };

    const handleCurrentLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setMapCenter({ lat, lng });
                    setMapZoom(15);
                    setFormData(prev => ({ ...prev, lat, lng }));
                },
                (error) => {
                    showToast("Could not get your location", "error");
                }
            );
        } else {
            showToast("Geolocation is not supported by your browser", "warning");
        }
    };

    const [activeTab, setActiveTab] = useState('post');
    const [uploading, setUploading] = useState(false);
    const [ownerSuggestions, setOwnerSuggestions] = useState([]);
    const [showOwnerSuggestions, setShowOwnerSuggestions] = useState(false);
    const [formData, setFormData] = useState({
        category: 'residential',
        transactionType: 'for_sale',
        title: '',
        location: '',
        street: '',
        pincode: '',
        locationPrivacy: 'exact',
        lat: null,
        lng: null,
        price: '',
        rentAmount: '',
        bogithuAmount: '',
        bogithuYears: '',
        sqft: '',
        beds: '',
        baths: '',
        floors: '',
        description: '',
        landmark: '',
        contactName: '',
        contactPhone: '',
        signature: null,
        media: [],
        paymentReceived: false
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        
        setUploading(true);
        const uploadedMedia = [...formData.media];

        for (const file of files) {
            const isVideo = file.type.startsWith('video/');
            const formDataPayload = new FormData();
            formDataPayload.append('file', file);
            
            try {
                const endpoint = isVideo ? '/api/upload/video' : '/api/upload/image';
                const res = await fetch(endpoint, {
                    method: 'POST',
                    body: formDataPayload
                });
                
                const data = await res.json();
                if (data.url) {
                    uploadedMedia.push({
                        type: isVideo ? 'video' : 'image',
                        url: data.url
                    });
                } else {
                    showToast(`Failed to upload ${file.name}`, 'error');
                }
            } catch (err) {
                console.error("Upload error:", err);
                showToast(`Error uploading ${file.name}`, 'error');
            }
        }
        
        setFormData(prev => ({ ...prev, media: uploadedMedia }));
        setUploading(false);
        e.target.value = ''; // reset file input
    };

    const removeMedia = (index) => {
        const newMedia = [...formData.media];
        newMedia.splice(index, 1);
        setFormData(prev => ({ ...prev, media: newMedia }));
    };
    
    const ownerListingsCount = formData.contactPhone ? (database.ownerListings || []).filter(l => l.ownerPhone === formData.contactPhone).length : 0;
    const isFree = ownerListingsCount < 25;

    const handleDeleteProperty = async (propId) => {
        if (!window.confirm("Are you sure you want to delete this property listing?")) return;
        const newDatabase = { ...database };
        newDatabase.ownerListings = (newDatabase.ownerListings || []).filter(p => p.id !== propId);
        try {
            setDatabase(newDatabase);
            await saveFullDatabase(newDatabase);
            showToast("Property deleted successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to delete property.", "error");
        }
    };

    const handleEditProperty = (prop) => {
        setEditingId(prop.id);
        setFormData({
            category: prop.category || 'residential',
            transactionType: prop.transactionType || 'for_sale',
            title: prop.title || '',
            location: prop.location || '',
            street: prop.street || '',
            pincode: prop.pincode || '',
            locationPrivacy: prop.locationPrivacy || 'exact',
            lat: prop.lat || null,
            lng: prop.lng || null,
            price: prop.price || '',
            rentAmount: prop.rentAmount || '',
            bogithuAmount: prop.bogithuAmount || '',
            bogithuYears: prop.bogithuYears || '',
            sqft: prop.sqft || '',
            beds: prop.beds || '',
            baths: prop.baths || '',
            floors: prop.floors || '',
            description: prop.description || '',
            landmark: prop.landmark || '',
            contactName: prop.contactName || '',
            contactPhone: prop.contactPhone || '',
            signature: prop.signature || null,
            media: prop.media || [],
            paymentReceived: true
        });
        if (prop.lat && prop.lng) {
            setMapCenter({ lat: prop.lat, lng: prop.lng });
            setMapZoom(15);
        }
        setActiveTab('post');
        showToast(`Editing listing "${prop.title}"`, "info");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.lat || !formData.lng) {
            showToast("Please pin the location on the map.", "warning");
            return;
        }

        if (!formData.signature) {
            showToast("Landlord signature is required.", "warning");
            return;
        }

        const newDatabase = { ...database };
        if (!newDatabase.ownerListings) {
            newDatabase.ownerListings = [];
        }

        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 3);

        if (editingId) {
            newDatabase.ownerListings = newDatabase.ownerListings.map(l => {
                if (l.id === editingId) {
                    return {
                        ...l,
                        ...formData,
                        updatedAt: new Date().toISOString()
                    };
                }
                return l;
            });
        } else {
            const newListing = {
                id: 'listing_' + Date.now(),
                ...formData,
                status: 'available',
                createdAt: new Date().toISOString(),
                isFreeUpload: isFree,
                feePaid: isFree ? 0 : 500,
                expiryDate: expiryDate.toISOString()
            };
            delete newListing.paymentReceived;
            newDatabase.ownerListings.push(newListing);
        }

        try {
            await saveFullDatabase(newDatabase);
            setDatabase(newDatabase);
            showToast(editingId ? "Property updated successfully!" : "Property posted successfully! It is now live on the map.", "success");
            
            setEditingId(null);
            setFormData({
                category: 'residential',
                transactionType: 'for_sale',
                title: '',
                location: '',
                street: '',
                pincode: '',
                locationPrivacy: 'exact',
                lat: null,
                lng: null,
                price: '',
                rentAmount: '',
                bogithuAmount: '',
                bogithuYears: '',
                sqft: '',
                beds: '',
                baths: '',
                floors: '',
                description: '',
                landmark: '',
                contactName: '',
                contactPhone: '',
                signature: null,
                media: [],
                paymentReceived: false
            });
            setActiveTab('list');
        } catch (err) {
            console.error(err);
            showToast("Failed to save property. Please try again.", "error");
        }
    };

    // Combine owner uploaded properties and layout verified locations into a unified list
    const verifiedListings = ((database.layouts || []).flatMap(layout => layout.verifiedLocations || []));
    const ownerListings = (database.ownerListings || []);

    const myProperties = [
        ...ownerListings,
        ...verifiedListings.filter(v => !ownerListings.some(o => o.id === v.id)).map(v => ({
            id: v.id || 'verified_' + Math.random(),
            title: v.name || v.title || 'Verified Property Listing',
            category: v.category || 'rental_house',
            status: v.status || 'available',
            rentAmount: v.price || 4500000,
            location: `${v.district || 'Erode'}, Tamil Nadu`,
            street: v.displayAddress || '',
            contactName: v.contactName || 'Property Representative',
            contactPhone: v.contactPhone || '+91 98765 43210',
            createdAt: v.createdAt || new Date().toISOString(),
            isVerified: true
        }))
    ];
    
    // Inquiries can be all inquiries across the system for staff visibility
    const myInquiries = (database.inquiries || []);

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
            <div className="nav-sidebar" style={{ width: '240px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={24} color="#921214" />
                        Admin CRM
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Property Uploader & CRM</p>
                </div>
                
                <div className="nav-links" style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <button className={`nav-item ${activeTab === 'post' ? 'active' : ''}`} onClick={() => setActiveTab('post')}>
                        <PlusCircle size={18} /><span>Post / Edit Property</span>
                    </button>
                    <button className={`nav-item ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
                        <List size={18} /><span>All Properties ({myProperties.length})</span>
                    </button>
                    <button className={`nav-item ${activeTab === 'inquiries' ? 'active' : ''}`} onClick={() => setActiveTab('inquiries')} style={{ position: 'relative' }}>
                        <MessageSquare size={18} /><span>Customer Inquiries ({myInquiries.length})</span>
                        {myInquiries.filter(i => i.status === 'unread').length > 0 && (
                            <span style={{ position: 'absolute', top: '4px', right: '8px', background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 800, borderRadius: '10px', padding: '1px 6px', minWidth: '16px', textAlign: 'center', lineHeight: '16px' }}>
                                {myInquiries.filter(i => i.status === 'unread').length}
                            </span>
                        )}
                    </button>

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        {setRole && (
                            <button className="nav-item" onClick={() => setRole('admin')} style={{ color: '#00a2bb' }}>
                                <Map size={18} /><span>Plot Vectorizer</span>
                            </button>
                        )}
                        <button className="nav-item" onClick={() => { if (setRole) setRole('user'); window.location.href = '/'; }}>
                            <Home size={18} /><span>Public Site</span>
                        </button>
                        <button className="nav-item" onClick={() => { 
                            if (setIsAdminAuthenticated) setIsAdminAuthenticated(false);
                            sessionStorage.removeItem("property_docs_admin_authenticated");
                            if (setRole) setRole('user'); 
                            window.location.href = '/'; 
                        }} style={{ color: '#ef4444' }}>
                            <LogOut size={18} /><span>Logout Admin</span>
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
                {activeTab === 'post' && (
                    <div style={{ maxWidth: '1200px', margin: '0 auto', background: 'var(--bg-surface)', padding: '32px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                        <h2 style={{ marginBottom: '16px', fontSize: '1.5rem', fontWeight: 800 }}>{editingId ? 'Edit Property & Owner Details' : 'Add Property & Owner Information'}</h2>
                        
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
                            {/* Left Column: Property Details */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ padding: '16px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>Property Owner & Contact Info</h3>
                                    <div className="form-row">
                                        <div className="form-group" style={{ position: 'relative' }}>
                                            <label>Property Owner Name <span style={{color: '#ef4444'}}>*</span></label>
                                            <input 
                                                type="text" 
                                                name="contactName" 
                                                value={formData.contactName} 
                                                onChange={(e) => {
                                                    handleInputChange(e);
                                                    const val = e.target.value.toLowerCase().trim();
                                                    if (val.length >= 2) {
                                                        const existing = (database.ownerListings || [])
                                                            .filter(l => l.contactName && l.contactName.toLowerCase().includes(val))
                                                            .reduce((acc, l) => {
                                                                if (!acc.find(a => a.contactName === l.contactName && a.contactPhone === l.contactPhone)) {
                                                                    acc.push({ contactName: l.contactName, contactPhone: l.contactPhone || '' });
                                                                }
                                                                return acc;
                                                            }, []);
                                                        setOwnerSuggestions(existing);
                                                        setShowOwnerSuggestions(existing.length > 0);
                                                    } else {
                                                        setShowOwnerSuggestions(false);
                                                    }
                                                }}
                                                onFocus={() => {
                                                    if (ownerSuggestions.length > 0) setShowOwnerSuggestions(true);
                                                }}
                                                placeholder="e.g. Ramesh Kumar (type to find existing)" 
                                                required 
                                                autoComplete="off"
                                            />
                                            {showOwnerSuggestions && ownerSuggestions.length > 0 && (
                                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0 0 6px 6px', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '150px', overflowY: 'auto' }}>
                                                    <div style={{ padding: '6px 10px', fontSize: '0.72rem', color: '#64748b', fontWeight: 700, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Existing Owners — Click to Select</div>
                                                    {ownerSuggestions.map((s, i) => (
                                                        <div 
                                                            key={i}
                                                            onClick={() => {
                                                                setFormData(prev => ({ ...prev, contactName: s.contactName, contactPhone: s.contactPhone }));
                                                                setShowOwnerSuggestions(false);
                                                            }}
                                                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}
                                                            onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                                                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                        >
                                                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{s.contactName}</span>
                                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.contactPhone}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="form-group">
                                            <label>Owner Mobile / Phone <span style={{color: '#ef4444'}}>*</span></label>
                                            <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleInputChange} placeholder="e.g. +91 98765 43210" required />
                                        </div>
                                    </div>
                                    
                                    <div className="form-group" style={{ marginTop: '16px' }}>
                                        <label>Landlord/Promoter Signature <span style={{color: '#ef4444'}}>*</span></label>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Please provide your digital signature below to authorize this property upload.</p>
                                        <SignaturePad onSign={(val) => setFormData(prev => ({ ...prev, signature: val }))} />
                                    </div>

                                    {!isFree && formData.contactPhone && (
                                        <div style={{ marginTop: '12px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(234, 179, 8, 0.1)', padding: '12px', borderRadius: '6px', border: '1px solid #eab308' }}>
                                                <input type="checkbox" name="paymentReceived" checked={formData.paymentReceived} onChange={handleInputChange} style={{ width: '18px', height: '18px' }} />
                                                <span style={{ fontWeight: 600, color: '#b45309' }}>I confirm that payment has been received for this listing.</span>
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Property Category */}
                                <div className="form-group">
                                    <label>Property Category <span style={{color: '#ef4444'}}>*</span></label>
                                    <select name="category" value={formData.category} onChange={handleInputChange} required>
                                        <optgroup label="🏠 Residential">
                                            <option value="residential">House / Villa</option>
                                            <option value="apartment">Apartment / Flat</option>
                                            <option value="independent_floor">Independent Floor</option>
                                            <option value="land">Land / Plot</option>
                                            <option value="farm_house">Farm House</option>
                                            <option value="rental_house">Rental House</option>
                                            <option value="pg">PG Accommodation</option>
                                            <option value="room">Room</option>
                                            <option value="bogithu">Bogithu (Lease)</option>
                                        </optgroup>
                                        <optgroup label="🏢 Commercial">
                                            <option value="commercial">Commercial Building</option>
                                            <option value="office">Office Space</option>
                                            <option value="shop">Shop / Showroom</option>
                                            <option value="warehouse">Warehouse / Godown</option>
                                            <option value="industrial">Industrial Land</option>
                                            <option value="commercial_land">Commercial Land / Plot</option>
                                        </optgroup>
                                    </select>
                                </div>

                                {/* Transaction Type */}
                                <div className="form-group">
                                    <label>Transaction Type <span style={{color: '#ef4444'}}>*</span></label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {[
                                            { value: 'for_sale', label: '🏷️ For Sale' },
                                            { value: 'for_rent', label: '🔑 For Rent' },
                                            { value: 'lease', label: '📋 Lease (Bogithu)' }
                                        ].map(opt => (
                                            <button 
                                                type="button" 
                                                key={opt.value}
                                                onClick={() => setFormData(prev => ({ ...prev, transactionType: opt.value }))}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px 8px',
                                                    border: formData.transactionType === opt.value ? '2px solid #921214' : '1px solid var(--border-color)',
                                                    borderRadius: 'var(--radius-md)',
                                                    background: formData.transactionType === opt.value ? 'rgba(146,18,20,0.08)' : 'var(--bg-main)',
                                                    color: formData.transactionType === opt.value ? '#921214' : 'var(--text-secondary)',
                                                    fontWeight: formData.transactionType === opt.value ? 700 : 500,
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Property Title */}
                                <div className="form-group">
                                    <label>Property Title <span style={{color: '#ef4444'}}>*</span></label>
                                    <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. 2BHK House in Main City" required />
                                </div>
                                
                                {/* Price Fields — Conditional based on transaction type */}
                                {formData.transactionType === 'for_sale' && (
                                    <div className="form-group">
                                        <label>Sale Price (₹) <span style={{color: '#ef4444'}}>*</span></label>
                                        <input type="number" name="price" value={formData.price} onChange={handleInputChange} placeholder="e.g. 4500000" required />
                                    </div>
                                )}

                                {formData.transactionType === 'for_rent' && (
                                    <div className="form-group">
                                        <label>Monthly Rent (₹) <span style={{color: '#ef4444'}}>*</span></label>
                                        <input type="number" name="rentAmount" value={formData.rentAmount} onChange={handleInputChange} placeholder="e.g. 15000" required />
                                    </div>
                                )}

                                {formData.transactionType === 'lease' && (
                                    <div className="form-row">
                                        <div className="form-group"><label>Lease/Bogithu Amount (₹)</label><input type="number" name="bogithuAmount" value={formData.bogithuAmount} onChange={handleInputChange} required /></div>
                                        <div className="form-group"><label>Duration (Years)</label><input type="number" name="bogithuYears" value={formData.bogithuYears} onChange={handleInputChange} required /></div>
                                    </div>
                                )}

                                {/* Property Specs */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Built-up Area (sqft)</label>
                                        <input type="text" name="sqft" value={formData.sqft} onChange={handleInputChange} placeholder="e.g. 1200" />
                                    </div>
                                    {!['land', 'commercial_land', 'industrial'].includes(formData.category) && (
                                        <>
                                            <div className="form-group">
                                                <label>Bedrooms</label>
                                                <input type="number" name="beds" value={formData.beds} onChange={handleInputChange} placeholder="e.g. 3" />
                                            </div>
                                            <div className="form-group">
                                                <label>Bathrooms</label>
                                                <input type="number" name="baths" value={formData.baths} onChange={handleInputChange} placeholder="e.g. 2" />
                                            </div>
                                        </>
                                    )}
                                    {['commercial', 'office', 'shop', 'warehouse', 'commercial_building'].includes(formData.category) && (
                                        <div className="form-group">
                                            <label>Floors</label>
                                            <input type="number" name="floors" value={formData.floors} onChange={handleInputChange} placeholder="e.g. 2" />
                                        </div>
                                    )}
                                </div>

                                <div className="form-group"><label>Description <span style={{color: '#ef4444'}}>*</span></label><textarea name="description" value={formData.description} onChange={handleInputChange} rows="4" required style={{ resize: 'vertical' }} /></div>
                            </div>

                            {/* Right Column: Location & Map */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-group">
                                    <label>City / Area / District</label>
                                    <input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="e.g. Erode" required />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Street Address</label>
                                        <input type="text" name="street" value={formData.street} onChange={handleInputChange} placeholder="e.g. 15th Cross, Main Road" />
                                    </div>
                                    <div className="form-group">
                                        <label>Landmark</label>
                                        <input type="text" name="landmark" value={formData.landmark} onChange={handleInputChange} placeholder="e.g. Near Apollo Hospital" />
                                    </div>
                                    <div className="form-group">
                                        <label>Pincode</label>
                                        <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} placeholder="e.g. 638056" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Location Privacy</label>
                                    <select name="locationPrivacy" value={formData.locationPrivacy} onChange={handleInputChange} required>
                                        <option value="exact">Share Exact Address (Street, Pincode & Map Pin)</option>
                                        <option value="approximate">Share Approximate Location (Hide Street, offset map pin)</option>
                                    </select>
                                </div>
                                
                                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label>Pin Location on Map (Required)</label>
                                    <div style={{ marginBottom: '12px' }}>
                                        {isLoaded && (
                                            <StandaloneSearchBox
                                                onLoad={onSearchBoxLoad}
                                                onPlacesChanged={onPlacesChanged}
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="Search location to pin..."
                                                    style={{
                                                        boxSizing: 'border-box',
                                                        border: '1px solid var(--border-color)',
                                                        width: '100%',
                                                        height: '42px',
                                                        padding: '0 16px',
                                                        borderRadius: 'var(--radius-md)',
                                                        fontSize: '14px',
                                                        outline: 'none',
                                                        background: 'var(--bg-main)',
                                                        color: 'var(--text-primary)'
                                                    }}
                                                />
                                            </StandaloneSearchBox>
                                        )}
                                    </div>
                                    <div style={{ minHeight: '300px', flex: 1, width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                                        {isLoaded ? (
                                            <GoogleMap
                                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                                center={mapCenter}
                                                zoom={mapZoom}
                                                options={{
                                                    mapTypeControl: false,
                                                    streetViewControl: false,
                                                    fullscreenControl: false
                                                }}
                                                onClick={(e) => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        lat: e.latLng.lat(),
                                                        lng: e.latLng.lng()
                                                    }));
                                                }}
                                            >
                                                <button 
                                                    type="button" 
                                                    onClick={handleCurrentLocation}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '10px',
                                                        top: '10px',
                                                        background: 'white',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px',
                                                        padding: '8px',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'var(--primary)',
                                                        zIndex: 5
                                                    }}
                                                    title="Use Current Location"
                                                >
                                                    <MapPin size={20} />
                                                </button>
                                                {formData.lat && formData.lng && (
                                                    <Marker position={{ lat: formData.lat, lng: formData.lng }} />
                                                )}
                                            </GoogleMap>
                                        ) : (
                                            <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Loading Map...</div>
                                        )}
                                    </div>
                                    {!formData.lat && <span style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>Please click on the map to drop a pin.</span>}
                                </div>
                                <div className="form-group">
                                    <label>Property Images & Videos</label>
                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {formData.media.map((item, idx) => (
                                            <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000' }}>
                                                {item.type === 'video' ? (
                                                    <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <img src={item.url} alt="upload" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                )}
                                                <button type="button" onClick={() => removeMedia(idx)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>&times;</button>
                                            </div>
                                        ))}
                                        
                                        <label style={{ width: '80px', height: '80px', borderRadius: '8px', border: '2px dashed var(--primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary)', background: 'var(--bg-main)' }}>
                                            <PlusCircle size={20} />
                                            <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Add Media</span>
                                            <input type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
                                        </label>
                                        {uploading && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Uploading...</span>}
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary" style={{ marginTop: 'auto', padding: '14px', fontSize: '1.1rem' }} disabled={uploading}>
                                    {uploading ? 'Uploading...' : 'Post Property to Map'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                {activeTab === 'list' && (
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Property Management</h2>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Search by Owner Name, Title, or Location to edit or manage properties</p>
                            </div>
                            <button className="btn-primary" onClick={() => { setEditingId(null); setActiveTab('post'); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <PlusCircle size={16} /> Add New Property
                            </button>
                        </div>

                        {/* Search & Filter Controls */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', background: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <input 
                                type="text" 
                                placeholder="Search by Owner Name, Phone, Property Title, or Location..."
                                value={adminSearchQuery}
                                onChange={(e) => setAdminSearchQuery(e.target.value)}
                                style={{ flex: 2, minWidth: '240px', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                            />
                            <select 
                                value={adminCategoryFilter} 
                                onChange={(e) => setAdminCategoryFilter(e.target.value)}
                                style={{ flex: 1, minWidth: '160px', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                            >
                                <option value="all">All Categories</option>
                                <optgroup label="🏠 Residential">
                                    <option value="residential">House / Villa</option>
                                    <option value="apartment">Apartment / Flat</option>
                                    <option value="independent_floor">Independent Floor</option>
                                    <option value="land">Land / Plot</option>
                                    <option value="farm_house">Farm House</option>
                                    <option value="rental_house">Rental House</option>
                                    <option value="pg">PG Accommodation</option>
                                    <option value="room">Room</option>
                                    <option value="bogithu">Bogithu (Lease)</option>
                                </optgroup>
                                <optgroup label="🏢 Commercial">
                                    <option value="commercial">Commercial Building</option>
                                    <option value="office">Office Space</option>
                                    <option value="shop">Shop / Showroom</option>
                                    <option value="warehouse">Warehouse / Godown</option>
                                    <option value="industrial">Industrial Land</option>
                                    <option value="commercial_land">Commercial Land / Plot</option>
                                </optgroup>
                            </select>
                            {(adminSearchQuery || adminCategoryFilter !== 'all') && (
                                <button 
                                    onClick={() => { setAdminSearchQuery(''); setAdminCategoryFilter('all'); }}
                                    style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: '#ef4444' }}
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>

                        {(() => {
                            const filteredProperties = (database.ownerListings || []).filter(prop => {
                                const q = adminSearchQuery.toLowerCase().trim();
                                const matchQuery = !q || 
                                    (prop.title && prop.title.toLowerCase().includes(q)) ||
                                    (prop.contactName && prop.contactName.toLowerCase().includes(q)) ||
                                    (prop.contactPhone && prop.contactPhone.toLowerCase().includes(q)) ||
                                    (prop.location && prop.location.toLowerCase().includes(q)) ||
                                    (prop.street && prop.street.toLowerCase().includes(q));

                                const matchCategory = adminCategoryFilter === 'all' || prop.category === adminCategoryFilter;
                                return matchQuery && matchCategory;
                            });

                            if (filteredProperties.length === 0) {
                                return (
                                    <div className="empty-selection-state" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
                                        <List size={48} opacity={0.5} />
                                        <p>No properties match your filter criteria.</p>
                                        <button className="btn-primary" onClick={() => { setAdminSearchQuery(''); setAdminCategoryFilter('all'); setEditingId(null); setActiveTab('post'); }} style={{ marginTop: '16px' }}>Add New Property</button>
                                    </div>
                                );
                            }

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {filteredProperties.map(prop => (
                                        <div key={prop.id} style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{prop.title}</h3>
                                                    <span className={`status-indicator status-${prop.category}`}>{prop.category.replace('_', ' ')}</span>
                                                    <span className="status-indicator" style={{ background: 'rgba(255,255,255,0.1)' }}>{prop.status.replace('_', ' ')}</span>
                                                    {prop.media && prop.media.length > 0 && (
                                                        <span className="status-indicator" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                                                            {prop.media.length} Media File{prop.media.length !== 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>
                                                    {prop.locationPrivacy === 'exact' ? [prop.street, prop.landmark, prop.location, prop.pincode].filter(Boolean).join(", ") : [prop.location, prop.pincode].filter(Boolean).join(", ")}
                                                </p>
                                                <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', background: 'var(--bg-main)', padding: '8px', borderRadius: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <div><strong style={{ color: '#921214' }}>Owner Name:</strong> {prop.contactName || 'N/A'}</div>
                                                    <div><strong style={{ color: '#00a2bb' }}>Owner Phone:</strong> {prop.contactPhone || 'N/A'}</div>
                                                    <div><strong>Added:</strong> {new Date(prop.createdAt).toLocaleDateString()}</div>
                                                    {prop.signature && (
                                                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <strong>Signature:</strong>
                                                            <img src={prop.signature} alt="Landlord Signature" style={{ height: '30px', background: '#fff', borderRadius: '4px', padding: '2px' }} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                                                    {prop.category === 'bogithu' ? `₹${Number(prop.bogithuAmount).toLocaleString('en-IN')} for ${prop.bogithuYears} Years` : `₹${Number(prop.rentAmount || prop.price || 4500000).toLocaleString('en-IN')}`}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <button 
                                                    onClick={() => handleEditProperty(prop)}
                                                    style={{ padding: '8px 14px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}
                                                >
                                                    <Edit2 size={14} /> Edit Property
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteProperty(prop.id)}
                                                    style={{ padding: '8px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#ef4444' }}
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                )}
                {activeTab === 'inquiries' && (
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    Customer Inquiries
                                    {myInquiries.filter(i => i.status === 'unread').length > 0 && (
                                        <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 800, borderRadius: '12px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            🔔 {myInquiries.filter(i => i.status === 'unread').length} New
                                        </span>
                                    )}
                                </h2>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Customer inquiries and showcase requests from the public site</p>
                            </div>
                            <button 
                                onClick={async () => {
                                    const newDb = { ...database };
                                    newDb.inquiries = (newDb.inquiries || []).map(i => ({ ...i, status: 'read' }));
                                    setDatabase(newDb);
                                    try { await saveFullDatabase(newDb); } catch(e) {}
                                    showToast("All inquiries marked as read", "success");
                                }}
                                style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: '#334155' }}
                            >
                                ✓ Mark All as Read
                            </button>
                        </div>

                        {/* Search & Filter */}
                        <div style={{ marginBottom: '20px', background: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <input 
                                type="text" 
                                placeholder="Search by customer name, email, phone, or property..."
                                value={inquirySearchQuery}
                                onChange={(e) => setInquirySearchQuery(e.target.value)}
                                style={{ flex: 2, minWidth: '240px', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {(() => {
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

                            const filteredInquiries = (database.inquiries || []).filter(inq => {
                                const q = inquirySearchQuery.toLowerCase().trim();
                                if (!q) return true;
                                return (inq.userName && inq.userName.toLowerCase().includes(q)) ||
                                       (inq.userPhone && inq.userPhone.toLowerCase().includes(q)) ||
                                       (inq.userEmail && inq.userEmail.toLowerCase().includes(q)) ||
                                       (inq.listingTitle && inq.listingTitle.toLowerCase().includes(q)) ||
                                       (inq.message && inq.message.toLowerCase().includes(q));
                            });

                            if (filteredInquiries.length === 0) {
                                return (
                                    <div className="empty-selection-state" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
                                        <MessageSquare size={48} opacity={0.5} />
                                        <p>No customer inquiries found.</p>
                                    </div>
                                );
                            }

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {filteredInquiries.map(inq => {
                                        const isUnread = inq.status === 'unread';
                                        return (
                                            <div key={inq.id} style={{ 
                                                background: 'var(--bg-surface)', 
                                                padding: '20px', 
                                                borderRadius: 'var(--radius-md)', 
                                                border: isUnread ? '2px solid #921214' : '1px solid var(--border-color)',
                                                boxShadow: isUnread ? '0 0 0 3px rgba(146,18,20,0.08)' : 'none',
                                                transition: 'all 0.2s ease'
                                            }}>
                                                {/* Top Row: Customer + Time */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isUnread ? '#921214' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                                                            {(inq.userName || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{inq.userName || 'Unknown'}</h3>
                                                                {isUnread && (
                                                                    <span style={{ background: '#fef2f2', color: '#ef4444', fontSize: '0.68rem', fontWeight: 800, borderRadius: '4px', padding: '2px 6px', border: '1px solid #fecaca' }}>NEW</span>
                                                                )}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px', flexWrap: 'wrap' }}>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Phone size={12} color="#921214" /> <a href={`tel:${inq.userPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{inq.userPhone}</a>
                                                                </span>
                                                                {inq.userEmail && (
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <Mail size={12} color="#00a2bb" /> {inq.userEmail}
                                                                    </span>
                                                                )}
                                                                {inq.contactMethod && (
                                                                    <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize' }}>
                                                                        Prefers: {inq.contactMethod}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                                                        <Calendar size={12} /> {getRelativeTime(inq.createdAt)}
                                                    </div>
                                                </div>

                                                {/* Message */}
                                                {inq.message && (
                                                    <div style={{ padding: '12px 14px', background: 'var(--bg-main)', borderRadius: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5', borderLeft: '3px solid #921214' }}>
                                                        {inq.message}
                                                    </div>
                                                )}
                                                {/* Legacy userAddress field */}
                                                {!inq.message && inq.userAddress && (
                                                    <div style={{ padding: '12px 14px', background: 'var(--bg-main)', borderRadius: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5', borderLeft: '3px solid #921214' }}>
                                                        {inq.userAddress}
                                                    </div>
                                                )}

                                                {/* Plan To + Property Info */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                        <span><strong>Property:</strong> {inq.listingTitle || `ID: ${inq.listingId}`}</span>
                                                        {inq.listingAddress && <span style={{ color: '#64748b' }}>• {inq.listingAddress}</span>}
                                                        {inq.planTo && (
                                                            <span style={{ background: 'rgba(146,18,20,0.08)', color: '#921214', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem' }}>
                                                                Plans to: {inq.planTo}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        {isUnread && (
                                                            <button 
                                                                onClick={async () => {
                                                                    const newDb = { ...database };
                                                                    newDb.inquiries = (newDb.inquiries || []).map(i => i.id === inq.id ? { ...i, status: 'contacted' } : i);
                                                                    setDatabase(newDb);
                                                                    try { await saveFullDatabase(newDb); } catch(e) {}
                                                                    showToast(`Marked ${inq.userName} as contacted`, "success");
                                                                }}
                                                                style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                                                            >
                                                                ✓ Mark Contacted
                                                            </button>
                                                        )}
                                                        <a 
                                                            href={`tel:${inq.userPhone}`}
                                                            style={{ padding: '6px 12px', background: '#921214', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            <Phone size={12} /> Call
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
}
