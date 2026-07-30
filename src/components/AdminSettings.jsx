import React, { useState, useRef } from 'react';
import { Settings, Save, Download, Upload, RefreshCw, Phone, Mail, MapPin, CreditCard } from 'lucide-react';
import INITIAL_MAP_DATA from '../utils/initialMapData';

export default function AdminSettings({ 
    database, 
    setDatabase, 
    showToast 
}) {
    const settings = database.settings || {
        bookingAdvance: 50000,
        supportPhone: "+91 98765 43210",
        supportEmail: "support@propertydocsdevelopers.in",
        officeAddress: "Property Docs Plaza, Highway Road, Vijayamangalam, Erode, Tamil Nadu - 638056"
    };

    const [form, setForm] = useState({
        bookingAdvance: settings.bookingAdvance,
        supportPhone: settings.supportPhone,
        supportEmail: settings.supportEmail,
        officeAddress: settings.officeAddress
    });

    const fileInputRef = useRef(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    // Save global settings
    const handleSaveSettings = (e) => {
        e.preventDefault();
        setDatabase(prev => ({
            ...prev,
            settings: {
                bookingAdvance: Number(form.bookingAdvance) || 50000,
                supportPhone: form.supportPhone.trim(),
                supportEmail: form.supportEmail.trim(),
                officeAddress: form.officeAddress.trim()
            }
        }));
        showToast("System configurations updated successfully.", "success");
    };

    // Export entire database JSON
    const handleExportBackup = () => {
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(database, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `Property Docs_Database_Backup_${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            document.body.removeChild(downloadAnchor);
            showToast("Database backup downloaded successfully.", "success");
        } catch (e) {
            showToast("Failed to export database backup.", "error");
        }
    };

    // Import database JSON file
    const handleImportBackup = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (importedData && Array.isArray(importedData.layouts) && Array.isArray(importedData.bookings)) {
                    setDatabase(importedData);
                    showToast("Database backup restored successfully!", "success");
                } else {
                    showToast("Invalid backup file. Missing layouts or bookings data.", "error");
                }
            } catch (err) {
                showToast("Failed to parse backup JSON file.", "error");
            }
        };
        reader.readAsText(file);
    };

    // Reset database to initial state
    const handleResetSystem = () => {
        if (!window.confirm("CRITICAL WARNING: Are you sure you want to restore the database to its default factory state? This will delete all client bookings, custom video uploads, and layout modifications!")) {
            return;
        }

        // Default drone videos
        const defaultVideos = [
            {
                id: "vid-1",
                title: "Property Docs Prime Meadows - Aerial Drone Tour",
                description: "Watch a high-definition 4K drone walkthrough of our flagship Vijayamangalam project, showcasing internal sub-roads, ready-to-build subplots, and highway connections.",
                url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                duration: "0:15",
                tag: "Vijayamangalam"
            },
            {
                id: "vid-2",
                title: "Gated Community Site Walkthrough",
                description: "Explore the internal infrastructure, including concrete drainage systems, water supply piping, street lights, and common green parks for residents.",
                url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                duration: "0:15",
                tag: "Coimbatore"
            },
            {
                id: "vid-3",
                title: "Future Residential Layout Launch",
                description: "Sneak peek into our upcoming scenic layout project in Madurai, offering rich groundwater, calm surroundings, and quick access to schools and hospitals.",
                url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
                duration: "0:15",
                tag: "Madurai Launch"
            }
        ];

        const defaultSettings = {
            bookingAdvance: 50000,
            supportPhone: "+91 98765 43210",
            supportEmail: "support@propertydocsdevelopers.in",
            officeAddress: "Property Docs Plaza, Highway Road, Vijayamangalam, Erode, Tamil Nadu - 638056"
        };

        setDatabase({
            activeLayoutId: "default",
            layouts: [
                {
                    id: "default",
                    name: "Property Docs Layout Sheet",
                    state: "Tamil Nadu",
                    district: "Erode",
                    area: "Vijayamangalam",
                    ...INITIAL_MAP_DATA
                }
            ],
            bookings: [],
            videos: defaultVideos,
            settings: defaultSettings
        });

        showToast("System database has been reset to default state.", "warning");
    };

    return (
        <div className="settings-dashboard" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', background: 'var(--bg-main)' }}>
            
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Settings size={24} style={{ color: 'var(--primary)' }} /> Global System Settings
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Configure user portal reservation advance, support contact channels, and manage backups.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'start' }}>
                
                {/* Configuration form */}
                <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                        Portal Configurations
                    </h3>

                    <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                        
                        {/* Advance Amount */}
                        <div className="form-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CreditCard size={14} /> Default Booking Token Advance (₹)
                            </label>
                            <input 
                                type="number" 
                                name="bookingAdvance"
                                required
                                value={form.bookingAdvance}
                                onChange={handleInputChange}
                                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            />
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Initial token payment deposit requested when a user books a plot.</span>
                        </div>

                        {/* Support phone */}
                        <div className="form-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={14} /> Helpdesk Contact Phone
                            </label>
                            <input 
                                type="text" 
                                name="supportPhone"
                                required
                                value={form.supportPhone}
                                onChange={handleInputChange}
                                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* Support email */}
                        <div className="form-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Mail size={14} /> Helpdesk Support Email
                            </label>
                            <input 
                                type="email" 
                                name="supportEmail"
                                required
                                value={form.supportEmail}
                                onChange={handleInputChange}
                                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* Office Address */}
                        <div className="form-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={14} /> Corporate Office Address
                            </label>
                            <textarea 
                                name="officeAddress"
                                required
                                rows="3"
                                value={form.officeAddress}
                                onChange={handleInputChange}
                                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', resize: 'vertical' }}
                            />
                        </div>

                        {/* Submit */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                            <button type="submit" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)', gap: '6px' }}>
                                <Save size={16} /> Save Configurations
                            </button>
                        </div>

                    </form>
                </div>

                {/* Database utility cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Database Backup Card */}
                    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Backup and Restore</h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            Download a full JSON database backup containing all custom layout sheets, vectors, registered bookings, and videos. You can restore this backup file on any instance of the Property Docs app.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn-secondary" onClick={handleExportBackup} style={{ flex: 1, padding: '10px', fontSize: '0.8rem', gap: '6px' }}>
                                <Download size={14} /> Export Backup
                            </button>
                            
                            <button className="btn-secondary" onClick={() => fileInputRef.current.click()} style={{ flex: 1, padding: '10px', fontSize: '0.8rem', gap: '6px' }}>
                                <Upload size={14} /> Restore Backup
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                accept=".json" 
                                style={{ display: 'none' }} 
                                onChange={handleImportBackup} 
                            />
                        </div>
                    </div>

                    {/* Reset Database Card */}
                    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', color: '#ef4444' }}>Factory Reset</h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            Restore the system to its initial sample state. This will erase all booking logs, custom layout map sheets, upload assets, and video configurations.
                        </p>
                        
                        <button className="btn-secondary" onClick={handleResetSystem} style={{ padding: '10px', fontSize: '0.8rem', gap: '6px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', width: '100%' }}>
                            <RefreshCw size={14} /> Reset System Database
                        </button>
                    </div>

                </div>

            </div>

        </div>
    );
}
