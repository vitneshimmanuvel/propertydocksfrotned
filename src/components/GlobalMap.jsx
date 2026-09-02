import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polygon, Polyline, DirectionsRenderer } from '@react-google-maps/api';
import UniversalVideoPlayer from './UniversalVideoPlayer';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 11.3410,
  lng: 77.7172 // Default Erode / Tamil Nadu region
};

const GOOGLE_MAPS_API_KEY = "AIzaSyDU7d-rl_p88O4tel70xd5UKPA3x8n5foU";
const libraries = ['drawing', 'geometry'];

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
    if (!loc) return null;
    let amt = null;
    if (loc.category === 'bogithu' && loc.bogithuAmount && Number(loc.bogithuAmount) > 0) {
        amt = Number(loc.bogithuAmount);
    } else if (loc.rentAmount && Number(loc.rentAmount) > 0) {
        amt = Number(loc.rentAmount);
    } else if (loc.price && Number(loc.price) > 0) {
        amt = Number(loc.price);
    }

    if (!amt || isNaN(amt) || amt <= 0) {
        return null;
    }

    if (amt >= 10000000) {
        return `₹${(amt / 10000000).toFixed(2).replace(/\.00$/, '').replace(/\.0$/, '')}Cr`;
    }
    if (amt >= 100000) {
        return `₹${(amt / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    }
    if (amt >= 1000) {
        return `₹${(amt / 1000).toFixed(0)}K`;
    }
    return `₹${amt.toLocaleString('en-IN')}`;
};

// Open Google Maps driving navigation from user's current GPS location or direct to destination in external tab/app
export const openDirectionsToLocation = (loc, e) => {
    if (e) {
        if (e.stopPropagation) e.stopPropagation();
        if (e.preventDefault) e.preventDefault();
    }
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
        alert("Location coordinates not available for this property.");
        return;
    }

    const destLat = loc.lat;
    const destLng = loc.lng;

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const userLat = pos.coords.latitude;
                const userLng = pos.coords.longitude;
                const dirUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destLat},${destLng}&travelmode=driving`;
                window.open(dirUrl, '_blank', 'noopener,noreferrer');
            },
            (err) => {
                console.warn("Geolocation permission error or unavailable:", err);
                const destUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
                window.open(destUrl, '_blank', 'noopener,noreferrer');
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
    } else {
        const destUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
        window.open(destUrl, '_blank', 'noopener,noreferrer');
    }
};

export default function GlobalMap({ 
    locations = [], 
    database = null,
    center = null, 
    zoom = null, 
    focusedLocation = null, 
    activeRouteDestination = null,
    onFilteredLocationsChange, 
    clearBoundaryTrigger = 0, 
    onContactOwner, 
    authUser, 
    onLoginReq, 
    isFavorite, 
    onToggleFavorite,
    onSelectDetail,
    onShowAllProperties,
    onCopyLink
}) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: libraries
    });

    // Derive effective locations array from either explicit locations prop or raw database object
    const effectiveLocations = React.useMemo(() => {
        if (locations && locations.length > 0) return locations;
        if (!database) return [];
        
        const ownerResults = (database.ownerListings || []).filter(l => l.status !== 'disabled').map((listing, idx) => ({
            ...listing,
            name: listing.title || listing.name || 'Property Listing',
            displayAddress: [listing.street, listing.landmark, listing.location, listing.pincode].filter(Boolean).join(", "),
            lat: typeof listing.lat === 'number' ? listing.lat : 11.3410,
            lng: typeof listing.lng === 'number' ? listing.lng : 77.7172,
            isOwnerListing: true
        }));
        const layoutResults = (database.layouts || []).map((layout, idx) => ({
            id: layout.id || `layout_${idx}`,
            name: layout.name || 'Property Layout',
            displayAddress: `${layout.name || 'Property Layout'}, ${layout.area || ''}, ${layout.district || 'Erode'}`,
            lat: typeof layout.lat === 'number' ? layout.lat : 11.2333,
            lng: typeof layout.lng === 'number' ? layout.lng : 77.5333,
            isOwnerListing: false,
            category: 'residential',
            price: layout.plots && layout.plots.length > 0 && layout.plots[0].price ? layout.plots[0].price * (layout.plots[0].area || 1200) : null
        }));
        return [...ownerResults, ...layoutResults];
    }, [locations, database]);

    const [selectedLocation, setSelectedLocation] = useState(null);
    const [hoveredLocation, setHoveredLocation] = useState(null);
    const [drawingMode, setDrawingMode] = useState(false);
    const [polygonPath, setPolygonPath] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [filteredLocations, setFilteredLocations] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [copiedLocId, setCopiedLocId] = useState(null);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);

    // In-App driving navigation state
    const [directionsResponse, setDirectionsResponse] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [routeSteps, setRouteSteps] = useState([]);
    const [showSteps, setShowSteps] = useState(false);
    const [activeRouteInfo, setActiveRouteInfo] = useState(null);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [userLiveLocation, setUserLiveLocation] = useState(null);

    const handleCopyLink = useCallback((loc, e) => {
        if (e) {
            if (e.stopPropagation) e.stopPropagation();
            if (e.preventDefault) e.preventDefault();
            if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                e.nativeEvent.stopImmediatePropagation();
            }
        }
        if (!loc || !loc.id) return;

        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        const shareUrl = `${baseUrl}?property=${encodeURIComponent(loc.id)}`;

        setCopiedLocId(loc.id);
        setTimeout(() => setCopiedLocId(null), 2500);

        const notifySuccess = () => {
            if (onCopyLink) onCopyLink(loc);
        };

        if (navigator.clipboard && window.isSecureContext !== false) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                notifySuccess();
            }).catch(() => {
                fallbackCopyText(loc, shareUrl, notifySuccess);
            });
        } else {
            fallbackCopyText(loc, shareUrl, notifySuccess);
        }
    }, [onCopyLink]);

    const fallbackCopyText = (loc, shareUrl, onSuccess) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = shareUrl;
            textArea.style.position = "fixed";
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.width = "2em";
            textArea.style.height = "2em";
            textArea.style.padding = "0";
            textArea.style.border = "none";
            textArea.style.outline = "none";
            textArea.style.boxShadow = "none";
            textArea.style.background = "transparent";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            textArea.setSelectionRange(0, 99999);
            const successful = document.execCommand("copy");
            document.body.removeChild(textArea);
            if (successful) {
                onSuccess();
            } else {
                window.prompt("Copy direct property link:", shareUrl);
                onSuccess();
            }
        } catch (err) {
            window.prompt("Copy direct property link:", shareUrl);
            onSuccess();
        }
    };

    const mapRef = React.useRef(null);

    // Track active map center and zoom level so tab switching/filtering NEVER resets the map location
    const [mapCenterState, setMapCenterState] = useState(() => {
        if (center && center.lat && center.lng) return center;
        if (effectiveLocations.length > 0 && effectiveLocations[0].lat && effectiveLocations[0].lng) return { lat: effectiveLocations[0].lat, lng: effectiveLocations[0].lng };
        return defaultCenter;
    });
    const [mapZoomState, setMapZoomState] = useState(() => zoom || 11);

    // Bulletproof In-App Road Route Calculation (100% inside our own website without ever opening external tabs)
    const calculateInAppRoute = useCallback((destLoc, e) => {
        if (e) {
            if (e.stopPropagation) e.stopPropagation();
            if (e.preventDefault) e.preventDefault();
        }
        if (!destLoc || typeof destLoc.lat !== 'number' || typeof destLoc.lng !== 'number') {
            alert("Location coordinates not available for this property.");
            return;
        }

        // Close any open InfoWindow card immediately so the route is clearly visible
        setSelectedLocation(null);
        setIsCalculatingRoute(true);

        const zoomAndFitRoute = (points, originCoords, destLocation) => {
            if (!mapRef.current || !window.google || !window.google.maps) return;
            const bounds = new window.google.maps.LatLngBounds();
            if (points && points.length > 0) {
                points.forEach(pt => {
                    if (pt && typeof pt.lat === 'number' && typeof pt.lng === 'number') {
                        bounds.extend(new window.google.maps.LatLng(pt.lat, pt.lng));
                    }
                });
            }
            if (originCoords && typeof originCoords.lat === 'number') {
                bounds.extend(new window.google.maps.LatLng(originCoords.lat, originCoords.lng));
            }
            if (destLocation && typeof destLocation.lat === 'number') {
                bounds.extend(new window.google.maps.LatLng(destLocation.lat, destLocation.lng));
            }

            // Apply fitBounds with padding to comfortably frame and zoom into the route
            mapRef.current.fitBounds(bounds, {
                top: 100,
                bottom: 60,
                left: 60,
                right: 60
            });

            const centerPoint = bounds.getCenter();
            if (centerPoint) {
                setMapCenterState({ lat: centerPoint.lat(), lng: centerPoint.lng() });
            }
        };

        const fetchOSRMRoute = async (originCoords, destLocation) => {
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${originCoords.lng},${originCoords.lat};${destLocation.lng},${destLocation.lat}?overview=full&geometries=geojson&steps=true`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    const rawCoords = route.geometry.coordinates; // [[lng, lat], ...]
                    const polyPoints = rawCoords.map(c => ({ lat: c[1], lng: c[0] }));
                    
                    const distKm = (route.distance / 1000).toFixed(1);
                    const durationMins = Math.ceil(route.duration / 60);
                    const durationText = durationMins > 60 
                        ? `${Math.floor(durationMins / 60)} hr ${durationMins % 60} mins` 
                        : `${durationMins} mins`;

                    const steps = [];
                    if (route.legs && route.legs[0] && route.legs[0].steps) {
                        route.legs[0].steps.forEach(st => {
                            if (st.maneuver && st.name) {
                                steps.push({
                                    instruction: `${st.maneuver.type ? st.maneuver.type.charAt(0).toUpperCase() + st.maneuver.type.slice(1) : 'Drive'} on ${st.name}`,
                                    distance: st.distance > 1000 ? `${(st.distance / 1000).toFixed(1)} km` : `${Math.round(st.distance)} m`,
                                    duration: `${Math.ceil(st.duration / 60)} min`
                                });
                            }
                        });
                    }

                    setDirectionsResponse(null);
                    setRouteCoordinates(polyPoints);
                    setRouteSteps(steps);
                    setActiveRouteInfo({
                        distance: `${distKm} km`,
                        duration: durationText,
                        startAddress: 'Your Current Location',
                        destination: destLocation,
                        userOrigin: originCoords
                    });

                    zoomAndFitRoute(polyPoints, originCoords, destLocation);
                } else {
                    fallbackDirectPath(originCoords, destLocation);
                }
            } catch (err) {
                console.warn("OSRM routing fetch error:", err);
                fallbackDirectPath(originCoords, destLocation);
            } finally {
                setIsCalculatingRoute(false);
            }
        };

        const fallbackDirectPath = (originCoords, destLocation) => {
            const polyPoints = [
                { lat: originCoords.lat, lng: originCoords.lng },
                { lat: destLocation.lat, lng: destLocation.lng }
            ];
            const R = 6371;
            const dLat = (destLocation.lat - originCoords.lat) * Math.PI / 180;
            const dLon = (destLocation.lng - originCoords.lng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(originCoords.lat * Math.PI / 180) * Math.cos(destLocation.lat * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distKm = (R * c).toFixed(1);
            const mins = Math.max(1, Math.ceil(distKm * 1.8));

            setDirectionsResponse(null);
            setRouteCoordinates(polyPoints);
            setRouteSteps([]);
            setActiveRouteInfo({
                distance: `${distKm} km`,
                duration: `${mins} mins`,
                startAddress: 'Your Current Location',
                destination: destLocation,
                userOrigin: originCoords
            });

            zoomAndFitRoute(polyPoints, originCoords, destLocation);
            setIsCalculatingRoute(false);
        };

        const computeRoute = (originCoords) => {
            setUserLiveLocation(originCoords);

            // Try Google Maps DirectionsService first if available
            if (window.google && window.google.maps && window.google.maps.DirectionsService) {
                try {
                    const directionsService = new window.google.maps.DirectionsService();
                    directionsService.route(
                        {
                            origin: new window.google.maps.LatLng(originCoords.lat, originCoords.lng),
                            destination: new window.google.maps.LatLng(destLoc.lat, destLoc.lng),
                            travelMode: window.google.maps.TravelMode.DRIVING
                        },
                        (result, status) => {
                            if (status === window.google.maps.DirectionsStatus.OK && result) {
                                setDirectionsResponse(result);
                                setRouteCoordinates([]);
                                const leg = result.routes[0].legs[0];
                                const steps = (leg.steps || []).map(s => ({
                                    instruction: s.instructions ? s.instructions.replace(/<[^>]*>?/gm, '') : 'Continue on road',
                                    distance: s.distance ? s.distance.text : '',
                                    duration: s.duration ? s.duration.text : ''
                                }));
                                setRouteSteps(steps);
                                setActiveRouteInfo({
                                    distance: leg.distance.text,
                                    duration: leg.duration.text,
                                    startAddress: leg.start_address || 'Your Location',
                                    destination: destLoc,
                                    userOrigin: originCoords
                                });
                                setIsCalculatingRoute(false);

                                const routePathPoints = (result.routes[0].overview_path || []).map(p => ({ lat: p.lat(), lng: p.lng() }));
                                zoomAndFitRoute(routePathPoints, originCoords, destLoc);
                            } else {
                                console.info("Using real-time road routing engine (OSRM)...");
                                fetchOSRMRoute(originCoords, destLoc);
                            }
                        }
                    );
                    return;
                } catch (err) {
                    console.info("Falling back to road routing engine (OSRM):", err);
                    fetchOSRMRoute(originCoords, destLoc);
                    return;
                }
            } else {
                fetchOSRMRoute(originCoords, destLoc);
            }
        };

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    computeRoute({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => {
                    console.warn("Geolocation permission error or unavailable, using fallback:", err);
                    computeRoute(defaultCenter);
                },
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
            );
        } else {
            computeRoute(defaultCenter);
        }
    }, []);

    const clearInAppRoute = useCallback(() => {
        setDirectionsResponse(null);
        setRouteCoordinates([]);
        setRouteSteps([]);
        setShowSteps(false);
        setActiveRouteInfo(null);
        setUserLiveLocation(null);
    }, []);

    // Sync external activeRouteDestination
    useEffect(() => {
        if (activeRouteDestination && activeRouteDestination.lat && activeRouteDestination.lng) {
            calculateInAppRoute(activeRouteDestination);
        }
    }, [activeRouteDestination, calculateInAppRoute]);

    // Sync when user explicitly searches a location, changes district or clicks a specific property card
    useEffect(() => {
        if (focusedLocation && focusedLocation.lat && focusedLocation.lng) {
            setSelectedLocation(focusedLocation);
            setActiveMediaIndex(0);
            setMapCenterState({ lat: focusedLocation.lat, lng: focusedLocation.lng });
            setMapZoomState(14);
            if (mapRef.current) {
                mapRef.current.panTo({ lat: focusedLocation.lat, lng: focusedLocation.lng });
                mapRef.current.setZoom(14);
            }
        } else if (center && center.lat && center.lng) {
            setMapCenterState(center);
            const targetZoom = zoom || 12;
            setMapZoomState(targetZoom);
            if (mapRef.current) {
                mapRef.current.panTo(center);
                mapRef.current.setZoom(targetZoom);
            }
        }
    }, [focusedLocation, center, zoom]);

    // Initial load handler
    const handleMapLoad = useCallback((map) => {
        mapRef.current = map;
        if (center && center.lat && center.lng) {
            map.panTo(center);
            map.setZoom(zoom || 12);
            return;
        }
        if (effectiveLocations && effectiveLocations.length > 0 && window.google && window.google.maps) {
            if (effectiveLocations.length === 1 && effectiveLocations[0].lat && effectiveLocations[0].lng) {
                map.panTo({ lat: effectiveLocations[0].lat, lng: effectiveLocations[0].lng });
                map.setZoom(14);
            } else {
                const bounds = new window.google.maps.LatLngBounds();
                let count = 0;
                effectiveLocations.forEach(loc => {
                    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
                        bounds.extend({ lat: loc.lat, lng: loc.lng });
                        count++;
                    }
                });
                if (count > 0) {
                    map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
                }
            }
        }
    }, [effectiveLocations, center, zoom]);

    // Auto-sync bounds if locations loaded for first time without search coordinates
    useEffect(() => {
        if (!mapRef.current || !effectiveLocations || effectiveLocations.length === 0 || !window.google || !window.google.maps) return;

        if (focusedLocation && focusedLocation.lat && focusedLocation.lng) {
            mapRef.current.panTo({ lat: focusedLocation.lat, lng: focusedLocation.lng });
            mapRef.current.setZoom(14);
            return;
        }

        if (center && center.lat && center.lng) {
            mapRef.current.panTo(center);
            if (zoom) mapRef.current.setZoom(zoom);
            return;
        }

        if (effectiveLocations.length === 1 && effectiveLocations[0].lat && effectiveLocations[0].lng) {
            mapRef.current.panTo({ lat: effectiveLocations[0].lat, lng: effectiveLocations[0].lng });
            mapRef.current.setZoom(14);
        } else {
            const bounds = new window.google.maps.LatLngBounds();
            let validPointsCount = 0;
            effectiveLocations.forEach(loc => {
                if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
                    bounds.extend({ lat: loc.lat, lng: loc.lng });
                    validPointsCount++;
                }
            });
            if (validPointsCount > 0) {
                mapRef.current.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
            }
        }
    }, [effectiveLocations, focusedLocation]);

    const handleIdle = useCallback(() => {
        if (mapRef.current) {
            const c = mapRef.current.getCenter();
            const z = mapRef.current.getZoom();
            if (c && z) {
                const newLat = c.lat();
                const newLng = c.lng();
                setMapCenterState({ lat: newLat, lng: newLng });
                setMapZoomState(z);
                
                // Auto-close open property popup when zoomed out past region level (zoom < 8)
                if (z < 8 && selectedLocation) {
                    setSelectedLocation(null);
                }
            }
        }
    }, [selectedLocation]);

    // Auto-dismiss InfoWindow popup if the selected location is no longer present in active locations
    useEffect(() => {
        if (selectedLocation) {
            const isStillPresent = effectiveLocations.some(loc => String(loc.id) === String(selectedLocation.id));
            if (!isStillPresent) {
                setSelectedLocation(null);
            }
        }
    }, [effectiveLocations, selectedLocation]);

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
            setFilteredLocations(effectiveLocations);
            if (onFilteredLocationsChange) onFilteredLocationsChange(effectiveLocations);
            return;
        }
        if (!window.google || !window.google.maps.geometry) return;
        
        try {
            const poly = new window.google.maps.Polygon({ paths: polygonPath });
            const filtered = effectiveLocations.filter(loc => {
                const point = new window.google.maps.LatLng(loc.lat, loc.lng);
                return window.google.maps.geometry.poly.containsLocation(point, poly);
            });
            setFilteredLocations(filtered);
            if (onFilteredLocationsChange) onFilteredLocationsChange(filtered);
        } catch (e) {
            console.error("Error filtering locations by polygon", e);
            setFilteredLocations(effectiveLocations);
            if (onFilteredLocationsChange) onFilteredLocationsChange(effectiveLocations);
        }
    }, [polygonPath, effectiveLocations, isLoaded, onFilteredLocationsChange]);

    if (!isLoaded) return <div style={{ padding: '20px', color: 'var(--text-primary)' }}>Loading Google Maps...</div>;

    // Helper to get media items array for any location type
    const getLocationMedia = (loc) => {
        if (!loc) return [];
        if (loc.media && Array.isArray(loc.media) && loc.media.length > 0) return loc.media;
        if (loc.image) return [{ type: 'image', url: loc.image }];
        return [{ type: 'image', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' }];
    };

    // Helper to format property price accurately in INR without fake fallbacks (returns null if empty)
    const getFormattedPrice = (loc) => {
        if (!loc) return null;
        if (loc.category === 'bogithu' && loc.bogithuAmount && Number(loc.bogithuAmount) > 0) {
            const amt = Number(loc.bogithuAmount);
            const yrs = loc.bogithuYears ? ` for ${loc.bogithuYears} Years` : '';
            return `₹${amt.toLocaleString('en-IN')}${yrs} (Lease)`;
        }
        if (loc.rentAmount && Number(loc.rentAmount) > 0) {
            return `₹${Number(loc.rentAmount).toLocaleString('en-IN')} / month`;
        }
        if (loc.price && Number(loc.price) > 0) {
            return `₹${Number(loc.price).toLocaleString('en-IN')}`;
        }
        return null;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'var(--bg-surface)' }}>
            <div style={{ flex: 1, position: 'relative' }}>
                
                {/* Floating "Show All Properties" Button directly inside Map overlay (Top Right) */}
                <button 
                    onClick={() => {
                        if (onShowAllProperties) {
                            onShowAllProperties();
                        } else {
                            setPolygonPath([]);
                            setCurrentPath([]);
                        }
                    }}
                    style={{
                        position: 'absolute',
                        top: '58px',
                        right: '12px',
                        zIndex: 100,
                        background: '#ffffff',
                        color: '#921214',
                        border: '2px solid #921214',
                        borderRadius: '24px',
                        padding: '7px 14px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}
                    title="Show all available properties on the map"
                >
                    🌐 Show All Properties
                </button>

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

                {/* In-App Live Navigation Route HUD Banner */}
                {activeRouteInfo && (
                    <div style={{
                        position: 'absolute',
                        top: '16px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 200,
                        background: '#0f172a',
                        color: '#ffffff',
                        padding: '12px 18px',
                        borderRadius: '16px',
                        boxShadow: '0 12px 35px rgba(0,0,0,0.45)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        maxWidth: '94%',
                        width: 'auto',
                        minWidth: '320px',
                        border: '1.5px solid rgba(2, 132, 199, 0.5)',
                        backdropFilter: 'blur(10px)',
                        animation: 'slideDown 0.3s ease-out'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: '#0284c7', borderRadius: '10px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                            </div>
                            <div style={{ minWidth: '150px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#38bdf8' }}>{activeRouteInfo.duration}</span>
                                    <span style={{ color: '#64748b' }}>•</span>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>{activeRouteInfo.distance}</span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    To: <strong style={{ color: '#ffffff' }}>{activeRouteInfo.destination.name || activeRouteInfo.destination.title || 'Selected Plot'}</strong>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                {routeSteps.length > 0 && (
                                    <button
                                        onClick={() => setShowSteps(prev => !prev)}
                                        style={{
                                            background: showSteps ? '#0284c7' : 'rgba(255,255,255,0.12)',
                                            color: '#ffffff',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            borderRadius: '8px',
                                            padding: '7px 11px',
                                            fontSize: '0.76rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        📋 {showSteps ? 'Hide' : 'Steps'}
                                    </button>
                                )}
                                <button
                                    onClick={clearInAppRoute}
                                    title="Exit live route navigation mode"
                                    style={{
                                        background: '#ef4444',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '7px 12px',
                                        fontSize: '0.76rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    ✕ Exit
                                </button>
                            </div>
                        </div>

                        {/* Turn-By-Turn Steps List Dropdown */}
                        {showSteps && routeSteps.length > 0 && (
                            <div style={{
                                maxHeight: '180px',
                                overflowY: 'auto',
                                background: 'rgba(15, 23, 42, 0.85)',
                                borderRadius: '8px',
                                padding: '8px 10px',
                                borderTop: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}>
                                {routeSteps.map((st, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#cbd5e1', borderBottom: idx < routeSteps.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingBottom: '4px' }}>
                                        <span>📍 {st.instruction}</span>
                                        <span style={{ color: '#38bdf8', fontWeight: 700, marginLeft: '8px' }}>{st.distance}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

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
                    {/* In-App Route Polyline (Google Directions) */}
                    {directionsResponse && (
                        <DirectionsRenderer 
                            directions={directionsResponse}
                            options={{
                                suppressMarkers: false,
                                polylineOptions: {
                                    strokeColor: '#0284c7',
                                    strokeWeight: 6,
                                    strokeOpacity: 0.95
                                }
                            }}
                        />
                    )}

                    {/* In-App Road Route Polyline (Real-Time Road Engine / OSRM) */}
                    {routeCoordinates && routeCoordinates.length > 0 && (
                        <Polyline 
                            path={routeCoordinates}
                            options={{
                                strokeColor: '#0284c7',
                                strokeOpacity: 0.95,
                                strokeWeight: 6,
                                clickable: false
                            }}
                        />
                    )}

                    {/* User Origin Pin */}
                    {userLiveLocation && (
                        <Marker 
                            position={userLiveLocation}
                            title="Your Live Location"
                            icon={{
                                path: window.google && window.google.maps ? window.google.maps.SymbolPath.CIRCLE : 0,
                                fillColor: '#0284c7',
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
                                strokeWeight: 3.5,
                                scale: 10
                            }}
                        />
                    )}

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
                        const isSelected = selectedLocation && String(selectedLocation.id) === String(loc.id);
                        const isHovered = hoveredLocation && String(hoveredLocation.id) === String(loc.id);
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
                                    path: window.google && window.google.maps ? window.google.maps.SymbolPath.CIRCLE : 0,
                                    fillColor: isSelected ? '#5c0b0d' : (isHovered ? '#7f0e10' : '#921214'),
                                    fillOpacity: 1,
                                    strokeColor: '#ffffff',
                                    strokeWeight: isSelected ? 3 : 2,
                                    scale: isSelected ? 15 : (isHovered ? 14 : 12),
                                    labelOrigin: window.google && window.google.maps ? new window.google.maps.Point(0, 0) : undefined
                                }}
                                label={{
                                    text: propertyInitial,
                                    color: '#ffffff',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                }}
                            />
                        );
                    })}
                    
                    {/* InfoWindow appears ONLY when explicitly CLICKED */}
                    {selectedLocation && (
                        <InfoWindow
                            position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                            onCloseClick={() => {
                                setSelectedLocation(null);
                                setActiveMediaIndex(0);
                            }}
                            options={{
                                pixelOffset: window.google && window.google.maps ? new window.google.maps.Size(0, -20) : undefined,
                                maxWidth: 300
                            }}
                        >
                            <div 
                                style={{ width: '270px', padding: '0', overflow: 'hidden', borderRadius: '8px', cursor: 'pointer' }}
                                onDoubleClick={(e) => {
                                    if (onSelectDetail) {
                                        onSelectDetail(selectedLocation);
                                    }
                                }}
                                onClick={() => {
                                    if (window.innerWidth <= 768 && onSelectDetail) {
                                        onSelectDetail(selectedLocation);
                                    }
                                }}
                            >
                                {(() => {
                                    const mediaList = getLocationMedia(selectedLocation);
                                    const currentMedia = mediaList[activeMediaIndex] || mediaList[0];
                                    const isCurrentVideo = (typeof currentMedia === 'object' && currentMedia.type === 'video') || 
                                        (typeof currentMedia === 'string' && (currentMedia.includes('.mp4') || currentMedia.includes('youtube') || currentMedia.includes('youtu.be')));
                                    const currentUrl = typeof currentMedia === 'string' ? currentMedia : (currentMedia && currentMedia.url ? currentMedia.url : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80');
                                    const formattedPrice = getFormattedPrice(selectedLocation);

                                    return (
                                        <>
                                            {/* Media Carousel Header */}
                                            <div style={{ position: 'relative', width: '100%', height: '140px', background: '#0f172a' }}>
                                                {isCurrentVideo ? (
                                                    <UniversalVideoPlayer 
                                                        url={currentUrl} 
                                                        autoPlay={false} 
                                                        controls={true} 
                                                        style={{ width: '100%', height: '100%', borderRadius: '0' }} 
                                                    />
                                                ) : (
                                                    <img 
                                                        src={currentUrl} 
                                                        alt={selectedLocation.name} 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'; }}
                                                    />
                                                )}

                                                {/* Left / Right Carousel Controls if multiple media */}
                                                {mediaList.length > 1 && (
                                                    <>
                                                        <button 
                                                            style={{ position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMediaIndex(prev => (prev > 0 ? prev - 1 : mediaList.length - 1));
                                                            }}
                                                        >
                                                            ‹
                                                        </button>
                                                        <button 
                                                            style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMediaIndex(prev => (prev < mediaList.length - 1 ? prev + 1 : 0));
                                                            }}
                                                        >
                                                            ›
                                                        </button>
                                                    </>
                                                )}

                                                {/* Favorite Toggle Button */}
                                                <div 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!authUser) {
                                                            onLoginReq && onLoginReq();
                                                            return;
                                                        }
                                                        onToggleFavorite && onToggleFavorite(selectedLocation.id);
                                                    }}
                                                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.95)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', zIndex: 12 }}
                                                >
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill={isFavorite && isFavorite(selectedLocation.id) ? "#921214" : "none"} stroke={isFavorite && isFavorite(selectedLocation.id) ? "#921214" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                                </div>

                                                <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(15, 23, 42, 0.75)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '3px', backdropFilter: 'blur(4px)', fontWeight: 600 }}>
                                                    {activeMediaIndex + 1}/{mediaList.length} Photos
                                                </div>
                                            </div>
                                            
                                            {/* Details & Specs Body */}
                                            <div style={{ padding: '12px 14px', background: '#ffffff' }}>
                                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {selectedLocation.name || selectedLocation.title || 'Property Listing'}
                                                </h3>

                                                {formattedPrice && (
                                                    <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#921214', marginBottom: '4px' }}>
                                                        {formattedPrice}
                                                    </div>
                                                )}
                                                
                                                <p style={{ margin: '0 0 6px 0', fontSize: '0.78rem', color: '#64748b', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {selectedLocation.displayAddress || selectedLocation.area || `${selectedLocation.district || 'Erode'}, Tamil Nadu`}
                                                </p>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#475569', margin: '4px 0 6px 0', fontWeight: 600 }}>
                                                    <span>🛏️ {selectedLocation.beds || 3} Beds</span>
                                                    <span>🛁 {selectedLocation.baths || 2} Baths</span>
                                                    <span>📐 {selectedLocation.sqft || '1,200'} sqft</span>
                                                </div>
                                                
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                                                    <span style={{ fontSize: '0.68rem', color: '#921214', background: 'rgba(146, 18, 20, 0.08)', padding: '2px 8px', borderRadius: '10px', textTransform: 'capitalize', fontWeight: 700 }}>
                                                        {(selectedLocation.category || 'residential').replace('_', ' ')}
                                                    </span>
                                                </div>

                                                {/* Action Buttons Row including In-App Drive Route */}
                                                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                                                    <button 
                                                        style={{ 
                                                            flex: 1.2, 
                                                            padding: '8px 4px', 
                                                            background: '#0284c7', 
                                                            color: '#fff', 
                                                            border: 'none', 
                                                            borderRadius: '6px', 
                                                            fontWeight: '800',
                                                            fontSize: '0.78rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '4px',
                                                            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
                                                        }}
                                                        onClick={(e) => calculateInAppRoute(selectedLocation, e)}
                                                        title="Draw live driving route right on our map"
                                                    >
                                                        🧭 {isCalculatingRoute ? 'Routing...' : 'Drive Route'}
                                                    </button>

                                                    {onContactOwner && (
                                                        <button 
                                                            style={{ 
                                                                flex: 1, 
                                                                padding: '8px 4px', 
                                                                background: '#921214', 
                                                                color: '#fff', 
                                                                border: 'none', 
                                                                borderRadius: '6px', 
                                                                fontWeight: '800',
                                                                fontSize: '0.78rem',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 2px 4px rgba(146, 18, 20, 0.2)'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onContactOwner(selectedLocation);
                                                            }}
                                                        >
                                                            📞 Contact
                                                        </button>
                                                    )}

                                                    {onSelectDetail && (
                                                        <button 
                                                            style={{ 
                                                                flex: 1, 
                                                                padding: '8px 4px', 
                                                                background: '#f1f5f9', 
                                                                color: '#0f172a', 
                                                                border: '1px solid #cbd5e1', 
                                                                borderRadius: '6px', 
                                                                fontWeight: '700',
                                                                fontSize: '0.78rem',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelectDetail(selectedLocation);
                                                            }}
                                                        >
                                                            Details
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Full Copy Property Link Button */}
                                                <button 
                                                    style={{ 
                                                        width: '100%',
                                                        marginTop: '8px',
                                                        padding: '7px 10px', 
                                                        background: copiedLocId === selectedLocation.id ? '#16a34a' : '#ffffff', 
                                                        color: copiedLocId === selectedLocation.id ? '#ffffff' : '#921214', 
                                                        border: copiedLocId === selectedLocation.id ? '1.5px solid #16a34a' : '1.5px solid #921214', 
                                                        borderRadius: '6px', 
                                                        fontWeight: '800',
                                                        fontSize: '0.76rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onClick={(e) => handleCopyLink(selectedLocation, e)}
                                                >
                                                    {copiedLocId === selectedLocation.id ? (
                                                        <>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                            ✓ Link Copied!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#921214" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                                            Copy Share Link
                                                        </>
                                                    )}
                                                </button>
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
