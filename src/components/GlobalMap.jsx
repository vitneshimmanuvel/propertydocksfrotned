import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polygon, Polyline } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629 // Center of India
};

const GOOGLE_MAPS_API_KEY = "AIzaSyDU7d-rl_p88O4tel70xd5UKPA3x8n5foU";
const libraries = ['places', 'drawing', 'geometry'];

export default function GlobalMap({ locations = [], center = defaultCenter, zoom = null, focusedLocation = null, onFilteredLocationsChange, clearBoundaryTrigger = 0, onContactOwner, authUser, onLoginReq, isFavorite, onToggleFavorite }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: libraries
    });

    const [selectedLocation, setSelectedLocation] = useState(null);
    const [drawingMode, setDrawingMode] = useState(false);
    const [polygonPath, setPolygonPath] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [filteredLocations, setFilteredLocations] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);

    // Sync focusedLocation prop with internal selectedLocation
    useEffect(() => {
        if (focusedLocation) {
            setSelectedLocation(focusedLocation);
            setActiveMediaIndex(0);
        }
    }, [focusedLocation]);

    const fallbackCenter = React.useMemo(() => {
        if (locations.length > 0) {
            return { lat: locations[0].lat, lng: locations[0].lng };
        }
        return defaultCenter;
    }, [locations]);

    useEffect(() => {
        if (clearBoundaryTrigger > 0) {
            setPolygonPath([]);
            setDrawingMode(false);
        }
    }, [clearBoundaryTrigger]);

    const handleMouseDown = useCallback((e) => {
        if (!drawingMode) return;
        setIsDragging(true);
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setCurrentPath([{ lat, lng }]);
    }, [drawingMode]);

    const handleMouseMove = useCallback((e) => {
        if (!drawingMode || !isDragging) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setCurrentPath(prev => [...prev, { lat, lng }]);
    }, [drawingMode, isDragging]);

    const handleMouseUp = useCallback(() => {
        if (!drawingMode || !isDragging) return;
        setIsDragging(false);
        if (currentPath.length >= 3) {
            setPolygonPath([...currentPath]);
            setDrawingMode(false);
        }
        setCurrentPath([]);
    }, [drawingMode, isDragging, currentPath]);

    useEffect(() => {
        if (polygonPath.length === 0) {
            setFilteredLocations(locations);
            if (onFilteredLocationsChange) onFilteredLocationsChange(locations);
            return;
        }
        if (!window.google || !window.google.maps.geometry) return;
        
        try {
            const poly = new window.google.maps.Polygon({ paths: polygonPath });
            const filtered = locations.filter(loc => {
                const point = new window.google.maps.LatLng(loc.lat, loc.lng);
                return window.google.maps.geometry.poly.containsLocation(point, poly);
            });
            setFilteredLocations(filtered);
            if (onFilteredLocationsChange) onFilteredLocationsChange(filtered);
        } catch (e) {
            console.error("Error filtering locations by polygon", e);
            setFilteredLocations(locations);
            if (onFilteredLocationsChange) onFilteredLocationsChange(locations);
        }
    }, [polygonPath, locations, isLoaded, onFilteredLocationsChange]);

    if (!isLoaded) return <div style={{ padding: '20px', color: 'var(--text-primary)' }}>Loading Google Maps...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'var(--bg-surface)' }}>
            <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Project Locations Map</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                        {filteredLocations.length} Locations Found {polygonPath.length > 0 && '(Filtered by Boundary)'}
                    </span>
                    {polygonPath.length > 0 && (
                        <button 
                            onClick={() => { setPolygonPath([]); setDrawingMode(false); }}
                            style={{ background: '#921214', color: '#ffffff', border: 'none', borderRadius: '16px', padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Clear Boundary Filter
                        </button>
                    )}
                </div>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
                
                {/* Custom Drawing Controls */}
                <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => {
                            if (drawingMode) {
                                // Cancel drawing
                                setCurrentPath([]);
                                setDrawingMode(false);
                            } else {
                                // Start drawing
                                setPolygonPath([]);
                                setCurrentPath([]);
                                setDrawingMode(true);
                            }
                        }}
                        style={{
                            background: drawingMode ? '#ef4444' : 'white',
                            color: drawingMode ? 'white' : '#333',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '2px',
                            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 1px 4px -1px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        {drawingMode ? 'Cancel Drawing' : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"/><path d="M7 3.34V5a3 3 0 0 0 3 3v0a2 2 0 0 1 2 2v0c0 1.1.9 2 2 2v0a2 2 0 0 0 2-2v0c0-1.1.9-2 2-2h1.66"/><path d="M11 21.95V18a2 2 0 0 0-2-2v0a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"/><circle cx="12" cy="12" r="10"/></svg>
                                Draw
                            </>
                        )}
                    </button>
                    
                    
                    {!drawingMode && polygonPath.length > 0 && (
                        <button 
                            onClick={() => { setPolygonPath([]); setDrawingMode(false); }}
                            style={{
                                background: '#115e59',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '24px',
                                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 2px 6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 600
                            }}
                        >
                            Remove Boundary
                        </button>
                    )}
                </div>

                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={center || fallbackCenter}
                    zoom={zoom || (locations.length > 0 ? 6 : 4)}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    options={{
                        draggableCursor: drawingMode ? 'crosshair' : 'grab',
                        draggingCursor: drawingMode ? 'crosshair' : 'grabbing',
                        gestureHandling: drawingMode ? 'none' : 'auto'
                    }}
                >
                    {drawingMode && currentPath.length > 0 && (
                        <Polyline 
                            path={currentPath}
                            options={{
                                strokeColor: '#ef4444',
                                strokeOpacity: 1.0,
                                strokeWeight: 2,
                                clickable: false
                            }}
                        />
                    )}

                    {!drawingMode && polygonPath.length > 0 && (
                        <Polygon 
                            paths={polygonPath}
                            options={{
                                fillColor: 'rgba(146, 18, 20, 0.12)',
                                fillOpacity: 0.12,
                                strokeWeight: 2,
                                strokeColor: '#921214',
                                clickable: false
                            }}
                        />
                    )}

                    {filteredLocations.map((loc, idx) => {
                        return (
                            <Marker 
                                key={loc.id} 
                                position={{ lat: loc.lat, lng: loc.lng }} 
                                onClick={() => {
                                    setSelectedLocation(loc);
                                    setActiveMediaIndex(0);
                                }}
                                icon={{
                                    path: 'M -15,-30 L 15,-30 A 6,6 0 0,1 21,-24 L 21,-6 A 6,6 0 0,1 15,0 L 4,0 L 0,6 L -4,0 L -15,0 A 6,6 0 0,1 -21,-6 L -21,-24 A 6,6 0 0,1 -15,-30 Z',
                                    fillColor: '#921214',
                                    fillOpacity: 1,
                                    strokeColor: '#ffffff',
                                    strokeWeight: 2,
                                    scale: 1,
                                    labelOrigin: { x: 0, y: -15 }
                                }}
                                label={{
                                    text: String(idx + 1),
                                    color: '#ffffff',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    fontFamily: 'Outfit, sans-serif'
                                }}
                            />
                        );
                    })}
                    
                    {selectedLocation && (
                        <InfoWindow
                            position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                            onCloseClick={() => setSelectedLocation(null)}
                        >
                            <div style={{ padding: 0, margin: '-1px', width: '260px', borderRadius: '8px', overflow: 'hidden', fontFamily: 'Outfit, sans-serif' }}>
                                {selectedLocation.isOwnerListing ? (
                                    <>
                                        {selectedLocation.media && selectedLocation.media.length > 0 ? (
                                            <div style={{ width: '100%', height: '160px', position: 'relative', background: '#e5e7eb' }}>
                                                {selectedLocation.media[activeMediaIndex].type === 'video' ? (
                                                    <video 
                                                        src={selectedLocation.media[activeMediaIndex].url} 
                                                        controls 
                                                        autoPlay 
                                                        muted 
                                                        loop 
                                                        playsInline
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                    />
                                                ) : (
                                                    <img src={selectedLocation.media[activeMediaIndex].url} alt="property" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                )}
                                                
                                                {selectedLocation.media.length > 1 && (
                                                    <>
                                                        <div 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMediaIndex(prev => (prev > 0 ? prev - 1 : selectedLocation.media.length - 1));
                                                            }}
                                                            style={{ position: 'absolute', top: '50%', left: '8px', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                                        </div>
                                                        <div 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMediaIndex(prev => (prev < selectedLocation.media.length - 1 ? prev + 1 : 0));
                                                            }}
                                                            style={{ position: 'absolute', top: '50%', right: '8px', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                        </div>
                                                    </>
                                                )}

                                                <div 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!authUser) {
                                                            onLoginReq && onLoginReq();
                                                            return;
                                                        }
                                                        onToggleFavorite && onToggleFavorite(selectedLocation.id);
                                                    }}
                                                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.95)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavorite && isFavorite(selectedLocation.id) ? "#921214" : "none"} stroke={isFavorite && isFavorite(selectedLocation.id) ? "#921214" : "#999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                                </div>
                                                <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {activeMediaIndex + 1}/{selectedLocation.media.length} Photos
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ width: '100%', height: '120px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
                                                No Image
                                            </div>
                                        )}
                                        
                                        <div style={{ padding: '12px' }}>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#921214', marginBottom: '6px' }}>
                                                {selectedLocation.category === 'bogithu' ? `₹${Number(selectedLocation.bogithuAmount).toLocaleString('en-IN')}` : `₹${Number(selectedLocation.rentAmount).toLocaleString('en-IN')}`}
                                                {selectedLocation.category === 'bogithu' && <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 500 }}> (for {selectedLocation.bogithuYears} Yrs)</span>}
                                                {selectedLocation.category !== 'bogithu' && <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 500 }}> / month</span>}
                                            </div>
                                            
                                            <h3 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 600, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {selectedLocation.name}
                                            </h3>
                                            
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#4b5563', lineHeight: '1.4' }}>
                                                {selectedLocation.displayAddress || selectedLocation.location}
                                            </p>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#921214' }}></span>
                                                    Just now
                                                </span>
                                                <span style={{ fontSize: '0.7rem', color: '#921214', background: 'rgba(146, 18, 20, 0.1)', padding: '2px 8px', borderRadius: '12px', textTransform: 'capitalize', fontWeight: 600 }}>
                                                    {selectedLocation.category.replace('_', ' ')}
                                                </span>
                                            </div>
                                            
                                            {onContactOwner && (
                                                <button 
                                                    style={{ 
                                                        width: '100%', 
                                                        marginTop: '12px', 
                                                        padding: '8px', 
                                                        background: '#921214', 
                                                        color: '#fff', 
                                                        border: 'none', 
                                                        borderRadius: '6px', 
                                                        fontWeight: '700',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => {
                                                        onContactOwner(selectedLocation);
                                                    }}
                                                >
                                                    Show Contact
                                                </button>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ padding: '12px' }}>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600 }}>{selectedLocation.name}</h3>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
                                            {[selectedLocation.area, selectedLocation.district, selectedLocation.state].filter(Boolean).join(", ")}
                                        </p>
                                        <div style={{ marginTop: '8px', fontSize: '0.8rem', fontWeight: 500 }}>
                                            Plots: {selectedLocation.plots ? selectedLocation.plots.length : 0}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>
            </div>
        </div>
    );
}
