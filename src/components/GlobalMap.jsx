import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polygon, Polyline } from '@react-google-maps/api';
import UniversalVideoPlayer from './UniversalVideoPlayer';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 11.3410,
  lng: 77.7172 // Default Erode / Tamil Nadu regionnn
};

const GOOGLE_MAPS_API_KEY = "AIzaSyDU7d-rl_p88O4tel70xd5UKPA3x8n5foU";
const libraries = ['places', 'drawing', 'geometry'];

const formatRelativeTime = (dateInput) => {
    if (!dateInput) return 'Recently listed';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Recently listed';

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getShortPriceLabel = (loc) => {
    if (!loc) return '₹45L';
    let amt = 4500000;
    if (loc.category === 'bogithu') {
        amt = Number(loc.bogithuAmount || 1500000);
    } else if (loc.rentAmount) {
        amt = Number(loc.rentAmount || 25000);
    } else if (loc.price) {
        amt = Number(loc.price || 4500000);
    }

    if (amt >= 10000000) {
        return `₹${(amt / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
    }
    if (amt >= 100000) {
        return `₹${(amt / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    }
    if (amt >= 1000) {
        return `₹${(amt / 1000).toFixed(0)}K`;
    }
    return `₹${amt}`;
};

export default function GlobalMap({ 
    locations = [], 
    center = null, 
    zoom = null, 
    focusedLocation = null, 
    onFilteredLocationsChange, 
    clearBoundaryTrigger = 0, 
    onContactOwner, 
    authUser, 
    onLoginReq, 
    isFavorite, 
    onToggleFavorite,
    onSelectDetail
}) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: libraries
    });

    const [selectedLocation, setSelectedLocation] = useState(null);
    const [hoveredLocation, setHoveredLocation] = useState(null);
    const [drawingMode, setDrawingMode] = useState(false);
    const [polygonPath, setPolygonPath] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [filteredLocations, setFilteredLocations] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);

    const mapRef = React.useRef(null);

    // Track active map center and zoom level so tab switching/filtering NEVER resets the map location
    const [mapCenterState, setMapCenterState] = useState(() => {
        if (center && center.lat && center.lng) return center;
        if (locations.length > 0 && locations[0].lat && locations[0].lng) return { lat: locations[0].lat, lng: locations[0].lng };
        return defaultCenter;
    });
    const [mapZoomState, setMapZoomState] = useState(() => zoom || 11);

    // Sync when user explicitly searches a location or clicks a specific property card
    useEffect(() => {
        if (focusedLocation && focusedLocation.lat && focusedLocation.lng) {
            setSelectedLocation(focusedLocation);
            setActiveMediaIndex(0);
            setMapCenterState({ lat: focusedLocation.lat, lng: focusedLocation.lng });
            setMapZoomState(14);
        } else if (center && center.lat && center.lng) {
            setMapCenterState(center);
            if (zoom) setMapZoomState(zoom);
        }
    }, [focusedLocation, center, zoom]);

    // Track map user panning and zooming
    const handleMapLoad = useCallback((map) => {
        mapRef.current = map;
    }, []);

    const handleIdle = useCallback(() => {
        if (mapRef.current) {
            const c = mapRef.current.getCenter();
            const z = mapRef.current.getZoom();
            if (c && z) {
                const newLat = c.lat();
                const newLng = c.lng();
                setMapCenterState({ lat: newLat, lng: newLng });
                setMapZoomState(z);
                
                // Auto-close open property popup when zoomed out past region level (zoom < 9)
                if (z < 9 && selectedLocation) {
                    setSelectedLocation(null);
                }
            }
        }
    }, [selectedLocation]);

    // Auto-dismiss InfoWindow popup if the selected location is no longer present in active locations or zoomed out
    useEffect(() => {
        if (selectedLocation) {
            const isStillPresent = locations.some(loc => String(loc.id) === String(selectedLocation.id));
            if (!isStillPresent || mapZoomState < 9) {
                setSelectedLocation(null);
            }
        }
    }, [locations, selectedLocation, mapZoomState]);

    const fallbackCenter = React.useMemo(() => {
        if (locations.length > 0) {
            return { lat: locations[0].lat, lng: locations[0].lng };
        }
        return defaultCenter;
    }, [locations]);

    useEffect(() => {
        if (clearBoundaryTrigger > 0) {
            setPolygonPath([]);
            setCurrentPath([]);
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

    // Helper to get media items array for any location type
    const getLocationMedia = (loc) => {
        if (!loc) return [];
        if (loc.media && Array.isArray(loc.media) && loc.media.length > 0) return loc.media;
        if (loc.image) return [{ type: 'image', url: loc.image }];
        return [{ type: 'image', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' }];
    };

    // Helper to format property price in INR
    const getFormattedPrice = (loc) => {
        if (!loc) return '₹45,00,000';
        if (loc.category === 'bogithu') {
            const amt = Number(loc.bogithuAmount || 1500000);
            return `₹${amt.toLocaleString('en-IN')}`;
        }
        if (loc.rentAmount) {
            return `₹${Number(loc.rentAmount).toLocaleString('en-IN')} / month`;
        }
        if (loc.price) {
            return `₹${Number(loc.price).toLocaleString('en-IN')}`;
        }
        return '₹45,00,000';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'var(--bg-surface)' }}>
            <div style={{ flex: 1, position: 'relative' }}>
                
                {/* Custom Drawing Controls */}
                <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => {
                            if (drawingMode) {
                                setCurrentPath([]);
                                setDrawingMode(false);
                            } else {
                                setPolygonPath([]);
                                setCurrentPath([]);
                                setDrawingMode(true);
                            }
                        }}
                        style={{
                            background: drawingMode ? '#ef4444' : 'white',
                            color: drawingMode ? 'white' : '#333',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '20px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        {drawingMode ? 'Cancel Drawing' : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"/><path d="M7 3.34V5a3 3 0 0 0 3 3v0a2 2 0 0 1 2 2v0c0 1.1.9 2 2 2v0a2 2 0 0 0 2-2v0c0-1.1.9-2 2-2h1.66"/><path d="M11 21.95V18a2 2 0 0 0-2-2v0a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"/><circle cx="12" cy="12" r="10"/></svg>
                                Draw Boundary Filter
                            </>
                        )}
                    </button>
                    
                    {!drawingMode && polygonPath.length > 0 && (
                        <button 
                            onClick={() => { setPolygonPath([]); setDrawingMode(false); }}
                            style={{
                                background: '#921214',
                                color: 'white',
                                border: 'none',
                                padding: '8px 14px',
                                borderRadius: '20px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 700
                            }}
                        >
                            Remove Boundary
                        </button>
                    )}
                </div>

                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={mapCenterState}
                    zoom={mapZoomState}
                    onLoad={handleMapLoad}
                    onIdle={handleIdle}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    options={{
                        draggableCursor: drawingMode ? 'crosshair' : 'grab',
                        draggingCursor: drawingMode ? 'crosshair' : 'grabbing',
                        gestureHandling: drawingMode ? 'none' : 'auto'
                    }}
                >
                    {drawingMode && currentPath.length >= 2 && (
                        <Polyline 
                            path={currentPath}
                            options={{
                                strokeColor: '#921214',
                                strokeOpacity: 0.9,
                                strokeWeight: 3,
                                clickable: false
                            }}
                        />
                    )}

                    {!drawingMode && polygonPath && polygonPath.length >= 3 && (
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

                    {filteredLocations.map((loc) => {
                        const isSelected = selectedLocation && selectedLocation.id === loc.id;
                        const isHovered = hoveredLocation && hoveredLocation.id === loc.id;
                        const propertyInitial = (loc.name || loc.title || 'P').trim().charAt(0).toUpperCase();

                        return (
                            <Marker 
                                key={loc.id} 
                                position={{ lat: loc.lat, lng: loc.lng }} 
                                onClick={() => {
                                    setSelectedLocation(isSelected ? null : loc);
                                    setActiveMediaIndex(0);
                                }}
                                onMouseOver={() => setHoveredLocation(loc)}
                                onMouseOut={() => setHoveredLocation(null)}
                                icon={{
                                    path: window.google.maps ? window.google.maps.SymbolPath.CIRCLE : 0,
                                    fillColor: isSelected ? '#5c0b0d' : (isHovered ? '#7f0e10' : '#921214'),
                                    fillOpacity: 1,
                                    strokeColor: '#ffffff',
                                    strokeWeight: isSelected ? 3 : 2,
                                    scale: isSelected ? 15 : (isHovered ? 14 : 12),
                                }}
                                label={{
                                    text: propertyInitial,
                                    color: '#ffffff',
                                    fontSize: isSelected ? '12px' : '11px',
                                    fontWeight: '800',
                                    fontFamily: 'Outfit, sans-serif'
                                }}
                            />
                        );
                    })}
                    
                    {/* InfoWindow appears ONLY when explicitly CLICKED */}
                    {selectedLocation && (
                        <InfoWindow
                            position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                            options={{ maxWidth: 300, pixelOffset: window.google && window.google.maps ? new window.google.maps.Size(0, -10) : undefined }}
                            onCloseClick={() => {
                                setSelectedLocation(null);
                            }}
                        >
                            <div style={{ padding: 0, margin: 0, width: '270px', borderRadius: '12px', overflow: 'hidden', fontFamily: 'Outfit, sans-serif', background: '#ffffff' }}>
                                {(() => {
                                    const mediaList = getLocationMedia(selectedLocation);
                                    const currentMedia = mediaList[activeMediaIndex] || mediaList[0];
                                    
                                    return (
                                        <>
                                            {/* Media Showcase Banner */}
                                            <div style={{ width: '100%', height: '140px', position: 'relative', background: '#0f172a' }}>
                                                {currentMedia && (currentMedia.type === 'video' || (currentMedia.url && (currentMedia.url.includes('.mp4') || currentMedia.url.includes('youtube') || currentMedia.url.includes('youtu.be')))) ? (
                                                    <UniversalVideoPlayer 
                                                        url={currentMedia.url} 
                                                        controls 
                                                        autoPlay 
                                                        muted 
                                                        loop 
                                                        playsInline
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                    />
                                                ) : (
                                                    <img 
                                                        src={currentMedia ? currentMedia.url : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'} 
                                                        alt={selectedLocation.name} 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                    />
                                                )}
                                                
                                                {/* Expander Icon Button (Top Left) */}
                                                <div 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onSelectDetail) onSelectDetail(selectedLocation);
                                                    }}
                                                    title="Expand Full Property Details"
                                                    style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(255,255,255,0.95)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', zIndex: 12 }}
                                                >
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#921214" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="15 3 21 3 21 9"></polyline>
                                                        <polyline points="9 21 3 21 3 15"></polyline>
                                                        <line x1="21" y1="3" x2="14" y2="10"></line>
                                                        <line x1="3" y1="21" x2="10" y2="14"></line>
                                                    </svg>
                                                </div>

                                                {mediaList.length > 1 && (
                                                    <>
                                                        <div 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMediaIndex(prev => (prev > 0 ? prev - 1 : mediaList.length - 1));
                                                            }}
                                                            style={{ position: 'absolute', top: '50%', left: '6px', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                                        </div>
                                                        <div 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMediaIndex(prev => (prev < mediaList.length - 1 ? prev + 1 : 0));
                                                            }}
                                                            style={{ position: 'absolute', top: '50%', right: '6px', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                        </div>
                                                    </>
                                                )}

                                                {/* Favorite Heart Button (Positioned cleanly beside Google close X) */}
                                                <div 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!authUser) {
                                                            onLoginReq && onLoginReq();
                                                            return;
                                                        }
                                                        onToggleFavorite && onToggleFavorite(selectedLocation.id);
                                                    }}
                                                    style={{ position: 'absolute', top: '8px', right: '42px', background: 'rgba(255,255,255,0.95)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', zIndex: 12 }}
                                                >
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill={isFavorite && isFavorite(selectedLocation.id) ? "#921214" : "none"} stroke={isFavorite && isFavorite(selectedLocation.id) ? "#921214" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                                </div>

                                                <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(15, 23, 42, 0.75)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '3px', backdropFilter: 'blur(4px)', fontWeight: 600 }}>
                                                    {activeMediaIndex + 1}/{mediaList.length} Photos
                                                </div>
                                            </div>
                                            
                                            {/* Details & Specs Body */}
                                            <div style={{ padding: '12px 14px', background: '#ffffff' }}>
                                                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#921214', marginBottom: '2px' }}>
                                                    {getFormattedPrice(selectedLocation)}
                                                </div>
                                                
                                                <h3 style={{ margin: '0 0 2px 0', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {selectedLocation.name || selectedLocation.title || 'Property Listing'}
                                                </h3>
                                                
                                                <p style={{ margin: '0 0 6px 0', fontSize: '0.76rem', color: '#64748b', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {selectedLocation.displayAddress || selectedLocation.area || `${selectedLocation.district || 'Erode'}, Tamil Nadu`}
                                                </p>

                                                {/* Specs badges */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#475569', margin: '6px 0', fontWeight: 600 }}>
                                                    <span>🛏️ {selectedLocation.beds || 3} Beds</span>
                                                    <span>🛁 {selectedLocation.baths || 2} Baths</span>
                                                    <span>📐 {selectedLocation.sqft || '1,200'} sqft</span>
                                                </div>
                                                
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                                                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#921214' }}></span>
                                                        {formatRelativeTime(selectedLocation.createdAt || selectedLocation.created_at)}
                                                    </span>
                                                    <span style={{ fontSize: '0.65rem', color: '#921214', background: 'rgba(146, 18, 20, 0.1)', padding: '1px 6px', borderRadius: '10px', textTransform: 'capitalize', fontWeight: 700 }}>
                                                        {(selectedLocation.category || 'residential').replace('_', ' ')}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                                    {onContactOwner && (
                                                        <button 
                                                            style={{ 
                                                                flex: 1, 
                                                                padding: '8px', 
                                                                background: '#921214', 
                                                                color: '#fff', 
                                                                border: 'none', 
                                                                borderRadius: '6px', 
                                                                fontWeight: '800',
                                                                fontSize: '0.78rem',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 2px 4px rgba(146, 18, 20, 0.2)'
                                                            }}
                                                            onClick={() => onContactOwner(selectedLocation)}
                                                        >
                                                            📞 Contact
                                                        </button>
                                                    )}

                                                    {onSelectDetail && (
                                                        <button 
                                                            style={{ 
                                                                flex: 1, 
                                                                padding: '8px', 
                                                                background: '#f1f5f9', 
                                                                color: '#0f172a', 
                                                                border: '1px solid #cbd5e1', 
                                                                borderRadius: '6px', 
                                                                fontWeight: '700',
                                                                fontSize: '0.78rem',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => onSelectDetail(selectedLocation)}
                                                        >
                                                            View Details
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>
            </div>
        </div>
    );
}
