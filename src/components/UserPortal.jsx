import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
    Home, 
    Map, 
    MapPin, 
    Sliders, 
    User, 
    Search, 
    ChevronRight, 
    ChevronLeft,
    ClipboardCheck, 
    ArrowLeft, 
    Phone, 
    Mail, 
    CreditCard, 
    CheckCircle, 
    HelpCircle, 
    Ticket, 
    Info, 
    LayoutGrid, 
    Calendar, 
    Filter, 
    Percent, 
    ArrowRight, 
    ShieldCheck, 
    Building2,
    LogOut,
    Video,
    X,
    Heart,
    Users,
    FileText
} from 'lucide-react';
import Header from './Header';
import MapWorkspace from './MapWorkspace';
import GlobalMap from './GlobalMap';
import AdvancedFilterModal from './AdvancedFilterModal';
import PropertyDetailModal from './PropertyDetailModal';
import { useJsApiLoader, StandaloneSearchBox } from '@react-google-maps/api';
import { saveFullDatabase } from '../utils/api';
import { auth } from '../utils/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

const GOOGLE_MAPS_API_KEY = "AIzaSyDU7d-rl_p88O4tel70xd5UKPA3x8n5foU";
const libraries = ['places', 'drawing', 'geometry'];

export default function UserPortal({ 
    database, 
    setDatabase, 
    showToast,
    theme,
    setRole
}) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: libraries
    });

    const [allLocations, setAllLocations] = useState([]);
    const [userSearchCoords, setUserSearchCoords] = useState(null);
    const [focusedLocation, setFocusedLocation] = useState(null);
    const [userSearchText, setUserSearchText] = useState("");
    const [searchBox, setSearchBox] = useState(null);
    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [selectedContactListing, setSelectedContactListing] = useState(null);
    const [contactForm, setContactForm] = useState({ name: '', phone: '', address: '' });
    const [isSending, setIsSending] = useState(false);
    const [isDirectoryOpen, setIsDirectoryOpen] = useState(true);
    const [expandedDistricts, setExpandedDistricts] = useState({});

    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const [selectedDetailListing, setSelectedDetailListing] = useState(null);
    const [advancedFilters, setAdvancedFilters] = useState({
        tab: 'residential',
        transactionType: 'all',
        propertyType: 'any',
        minPrice: '',
        maxPrice: '',
        beds: 'any',
        baths: 'any',
        minSqft: '',
        maxSqft: '',
        minLand: '',
        maxLand: '',
        listedSince: '',
        ownership: 'any',
        keywords: '',
        openHousesOnly: false,
        liveStreamsOnly: false,
        query: ''
    });

    useEffect(() => {
        setFocusedLocation(null);
    }, [advancedFilters, userSearchText]);

    const toggleDistrict = (districtName) => {
        setExpandedDistricts(prev => ({
            ...prev,
            [districtName]: !prev[districtName]
        }));
    };

    const handleSendInquiry = async () => {
        if (!contactForm.name || !contactForm.phone) {
            showToast('Name and Phone are required', 'error');
            return;
        }
        setIsSending(true);
        
        const newInquiry = {
            id: 'inq_' + Date.now().toString(36),
            listingId: selectedContactListing.id,
            userName: contactForm.name,
            userPhone: contactForm.phone,
            userAddress: contactForm.address,
            createdAt: new Date().toISOString()
        };
        
        const updatedDatabase = {
            ...database,
            inquiries: [...(database.inquiries || []), newInquiry]
        };
        
        setDatabase(updatedDatabase);
        
        try {
            await saveFullDatabase(updatedDatabase);
            showToast('Inquiry sent successfully to the owner!', 'success');
            setContactModalOpen(false);
            setContactForm({ name: '', phone: '', address: '' });
        } catch (err) {
            console.error(err);
            showToast('Failed to send inquiry', 'error');
            // Revert state on failure
            setDatabase(database);
        } finally {
            setIsSending(false);
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const geocodeAddress = async (address, layout) => {
        try {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const { lat, lng } = data.results[0].geometry.location;
                return { ...layout, lat, lng };
            }
            return null;
        } catch (error) {
            return null;
        }
    };

    const getFallbackCoords = (locationStr, idSeed = 0) => {
        const loc = (locationStr || '').toLowerCase();
        let base = { lat: 11.3410, lng: 77.7172 }; // Default Erode / Tamil Nadu

        if (loc.includes('chennai')) base = { lat: 13.0827, lng: 80.2707 };
        else if (loc.includes('coimbatore')) base = { lat: 11.0168, lng: 76.9558 };
        else if (loc.includes('tiruppur') || loc.includes('tirupur')) base = { lat: 11.1085, lng: 77.3411 };
        else if (loc.includes('salem')) base = { lat: 11.6643, lng: 78.1460 };
        else if (loc.includes('madurai')) base = { lat: 9.9252, lng: 78.1198 };
        else if (loc.includes('vijayamangalam')) base = { lat: 11.2333, lng: 77.5333 };
        else if (loc.includes('toronto') || loc.includes('ontario') || loc.includes('kitchener')) base = { lat: 43.6532, lng: -79.3832 };

        const seed = typeof idSeed === 'number' ? idSeed : (String(idSeed).charCodeAt(0) || 0);
        const jitterLat = (((seed * 7) % 10) - 5) * 0.004;
        const jitterLng = (((seed * 13) % 10) - 5) * 0.004;

        return {
            lat: base.lat + jitterLat,
            lng: base.lng + jitterLng
        };
    };

    const loadAllLocations = useCallback(async () => {
        if (!database) return;
        let layoutResults = [];
        if (database.layouts) {
            const locPromises = database.layouts.map(async (layout, idx) => {
                let lat = layout.lat;
                let lng = layout.lng;
                if (!lat || !lng) {
                    const parts = [layout.name, layout.area, layout.district, layout.state].filter(Boolean);
                    const address = parts.join(", ");
                    const geocoded = await geocodeAddress(address, layout);
                    if (geocoded && geocoded.lat && geocoded.lng) {
                        lat = geocoded.lat;
                        lng = geocoded.lng;
                    } else {
                        const fb = getFallbackCoords(address || layout.district || layout.area, idx);
                        lat = fb.lat;
                        lng = fb.lng;
                    }
                }

                const parts = [layout.area, layout.district, layout.state].filter(Boolean);
                const displayAddress = parts.length > 0 ? parts.join(", ") : 'Vijayamangalam, Erode, Tamil Nadu';
                const defaultImage = layout.image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80';

                return {
                    ...layout,
                    lat,
                    lng,
                    name: layout.name || 'Layout Sheet',
                    displayAddress,
                    price: layout.price || 4500000,
                    beds: layout.beds || 3,
                    baths: layout.baths || 2,
                    sqft: layout.sqft || '1,200',
                    category: layout.category || 'residential',
                    media: (layout.media && layout.media.length > 0) ? layout.media : [{ type: 'image', url: defaultImage }],
                    createdAt: layout.createdAt || layout.created_at || new Date().toISOString()
                };
            });
            layoutResults = await Promise.all(locPromises);
        }

        const ownerResults = (database.ownerListings || []).map((listing, idx) => {
            let lat = listing.lat;
            let lng = listing.lng;

            if (!lat || !lng) {
                const fb = getFallbackCoords(listing.location || listing.street || listing.landmark || 'Erode', idx + 50);
                lat = fb.lat;
                lng = fb.lng;
            } else if (listing.locationPrivacy === 'approximate') {
                const jitter = 0.002;
                const seed = listing.id ? listing.id.charCodeAt(listing.id.length - 1) : 0;
                lat += (seed % 2 === 0 ? jitter : -jitter);
                lng += (seed % 3 === 0 ? jitter : -jitter);
            }

            let displayAddress = listing.location || '';
            if (listing.locationPrivacy === 'exact') {
                displayAddress = [listing.street, listing.landmark, listing.location, listing.pincode].filter(Boolean).join(", ");
            } else {
                displayAddress = [listing.location, listing.pincode].filter(Boolean).join(", ");
            }

            const defaultImg = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80';
            const mediaList = (listing.media && listing.media.length > 0) ? listing.media : [{ type: 'image', url: listing.image || defaultImg }];

            return {
                ...listing,
                lat,
                lng,
                isOwnerListing: true,
                name: listing.title || listing.name || 'Property Listing',
                area: displayAddress,
                displayAddress,
                district: listing.location ? listing.location.trim() : 'Erode',
                state: 'Tamil Nadu',
                media: mediaList,
                createdAt: listing.createdAt || listing.created_at || new Date().toISOString()
            };
        });

        setAllLocations([...layoutResults, ...ownerResults].filter(Boolean));
    }, [database]);

    useEffect(() => {
        loadAllLocations();
    }, [loadAllLocations]);

    const onSearchBoxLoad = ref => setSearchBox(ref);
    const onPlacesChanged = () => {
        if (searchBox) {
            const places = searchBox.getPlaces();
            if (places && places.length > 0) {
                const place = places[0];
                if (place.geometry && place.geometry.location) {
                    setUserSearchCoords({
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng()
                    });
                }
            }
        }
    };

    const handleCurrentLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserSearchCoords({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    setUserSearchText("My Location");
                },
                (error) => {
                    showToast("Could not get your location", "error");
                }
            );
        } else {
            showToast("Geolocation is not supported by your browser", "warning");
        }
    };

    const clearSearch = () => {
        setUserSearchCoords(null);
        setUserSearchText("");
    };

    const filteredLocations = useMemo(() => {
        let results = allLocations;

        // 1. Filter by Residential / Commercial tab
        const RESIDENTIAL_CATS = ['residential', 'rental_house', 'pg', 'room', 'bogithu', 'apartment', 'villa', 'land', 'plot', 'farm_house', 'independent_floor', 'house'];
        const COMMERCIAL_CATS = ['commercial', 'office', 'shop', 'warehouse', 'industrial', 'commercial_land', 'commercial_building', 'showroom'];

        if (advancedFilters.tab === 'commercial') {
            results = results.filter(loc => {
                const cat = (loc.category || 'residential').toLowerCase();
                return COMMERCIAL_CATS.some(c => cat.includes(c));
            });
        } else {
            // residential (default) — show everything that's NOT purely commercial
            results = results.filter(loc => {
                const cat = (loc.category || 'residential').toLowerCase();
                const isCommercial = COMMERCIAL_CATS.some(c => cat.includes(c));
                // Show it if it's residential OR if it doesn't match any commercial category
                return !isCommercial || RESIDENTIAL_CATS.some(c => cat.includes(c));
            });
        }

        // 2. Filter by transaction type (all, for_sale, for_rent, sold)
        if (advancedFilters.transactionType === 'for_rent') {
            results = results.filter(loc => {
                const cat = (loc.category || '').toLowerCase();
                const txn = (loc.transactionType || '').toLowerCase();
                return txn === 'for_rent' || txn === 'lease' || Boolean(loc.rentAmount) || Boolean(loc.bogithuAmount) || ['rental_house', 'pg', 'room', 'bogithu'].includes(cat);
            });
        } else if (advancedFilters.transactionType === 'sold') {
            results = results.filter(loc => {
                return (loc.status || '').toLowerCase() === 'sold';
            });
        } else if (advancedFilters.transactionType === 'for_sale') {
            results = results.filter(loc => {
                const cat = (loc.category || '').toLowerCase();
                const txn = (loc.transactionType || '').toLowerCase();
                if (txn === 'for_sale') return true;
                if (txn === 'for_rent' || txn === 'lease') return false;
                if (['rental_house', 'pg', 'room', 'bogithu'].includes(cat) && !loc.price) return false;
                return true;
            });
        }
        // If advancedFilters.transactionType === 'all', show all listings regardless of transaction type

        // 3. Filter by min/max price
        if (advancedFilters.minPrice) {
            const min = Number(advancedFilters.minPrice);
            results = results.filter(loc => {
                const amt = Number(loc.price || loc.rentAmount || loc.bogithuAmount || 0);
                return amt >= min;
            });
        }
        if (advancedFilters.maxPrice) {
            const max = Number(advancedFilters.maxPrice);
            results = results.filter(loc => {
                const amt = Number(loc.price || loc.rentAmount || loc.bogithuAmount || 0);
                return amt <= max;
            });
        }

        // 4. Filter by beds (Residential only)
        if (advancedFilters.tab !== 'commercial' && advancedFilters.beds && advancedFilters.beds !== 'any') {
            const minBeds = Number(advancedFilters.beds);
            results = results.filter(loc => Number(loc.beds || 0) >= minBeds);
        }

        // 5. Filter by baths (Residential only)
        if (advancedFilters.tab !== 'commercial' && advancedFilters.baths && advancedFilters.baths !== 'any') {
            const minBaths = Number(advancedFilters.baths);
            results = results.filter(loc => Number(loc.baths || 0) >= minBaths);
        }

        // 5a. Filter by commercial building size (minSqft)
        if (advancedFilters.tab === 'commercial' && advancedFilters.minSqft) {
            const minSq = Number(advancedFilters.minSqft);
            results = results.filter(loc => Number(String(loc.sqft).replace(/,/g, '') || 0) >= minSq);
        }

        // 5b. Filter by commercial land area (minLand / maxLand)
        if (advancedFilters.tab === 'commercial' && advancedFilters.minLand) {
            const minL = Number(advancedFilters.minLand);
            results = results.filter(loc => Number(loc.landArea || String(loc.sqft).replace(/,/g, '') || 0) >= minL);
        }
        if (advancedFilters.tab === 'commercial' && advancedFilters.maxLand) {
            const maxL = Number(advancedFilters.maxLand);
            results = results.filter(loc => Number(loc.landArea || String(loc.sqft).replace(/,/g, '') || 0) <= maxL);
        }

        // 6. Filter by text query if typed
        if (userSearchText && userSearchText.trim()) {
            const query = userSearchText.toLowerCase().trim();
            results = results.filter(loc => {
                const text = [
                    loc.name,
                    loc.title,
                    loc.area,
                    loc.district,
                    loc.state,
                    loc.location,
                    loc.displayAddress,
                    loc.street,
                    loc.landmark,
                    loc.pincode,
                    loc.category,
                    loc.id
                ].filter(Boolean).join(" ").toLowerCase();
                return text.includes(query);
            });
        }

        // 7. Filter by coordinates radius if geocoded
        if (userSearchCoords) {
            results = results.map(loc => ({
                ...loc,
                distance: calculateDistance(userSearchCoords.lat, userSearchCoords.lng, loc.lat, loc.lng)
            })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }

        return results;
    }, [allLocations, userSearchText, userSearchCoords, advancedFilters]);

    const [drawnFilteredLocations, setDrawnFilteredLocations] = useState(null);
    const [clearBoundaryTrigger, setClearBoundaryTrigger] = useState(0);
    const displayLocations = drawnFilteredLocations || filteredLocations;

    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem("property_docs_user_active_tab") || "home";
    });
    useEffect(() => {
        localStorage.setItem("property_docs_user_active_tab", activeTab);
    }, [activeTab]);

    const [selectedLocation, setSelectedLocation] = useState(() => {
        const saved = localStorage.getItem("property_docs_user_selected_location");
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        return {
            state: 'Tamil Nadu',
            district: 'Erode',
            layoutId: ''
        };
    });
    useEffect(() => {
        localStorage.setItem("property_docs_user_selected_location", JSON.stringify(selectedLocation));
    }, [selectedLocation]);

    const [isExploring, setIsExploring] = useState(() => {
        return localStorage.getItem("property_docs_user_is_exploring") === "true";
    });
    useEffect(() => {
        localStorage.setItem("property_docs_user_is_exploring", isExploring ? "true" : "false");
    }, [isExploring]);

    const [userSelectedPlotId, setUserSelectedPlotId] = useState(null);
    const [bookingSuccess, setBookingSuccess] = useState(null);
    const [activeVideo, setActiveVideo] = useState(0);
    const [videoDistrictFilter, setVideoDistrictFilter] = useState('All');

    const ownerDistricts = useMemo(() => {
        if (!database.ownerListings) return [];
        const dists = database.ownerListings.map(l => l.location).filter(Boolean);
        return [...new Set(dists)];
    }, [database.ownerListings]);

    const promoVideos = useMemo(() => {
        let defaultVideos = database.videos || [];
        if (videoDistrictFilter === 'All') return defaultVideos;

        const listings = (database.ownerListings || []).filter(l => l.location === videoDistrictFilter);
        const districtVideos = [];
        
        listings.forEach(l => {
            const vids = (l.media || []).filter(m => m.type === 'video');
            vids.forEach((v, idx) => {
                districtVideos.push({
                    id: `${l.id}_video_${idx}`,
                    url: v.url,
                    title: l.title,
                    description: l.description,
                    tag: l.category ? l.category.toUpperCase().replace('_', ' ') : 'PROPERTY',
                    duration: '0:30'
                });
            });
        });

        return districtVideos.length > 0 ? districtVideos : defaultVideos;
    }, [database.videos, database.ownerListings, videoDistrictFilter]);

    // Safely clamp active video index if playlist updates
    useEffect(() => {
        if (promoVideos.length > 0 && activeVideo >= promoVideos.length) {
            setActiveVideo(0);
        }
    }, [promoVideos, activeVideo]);

    // Reset selected plot when navigating away, switching tabs, or changing layouts
    useEffect(() => {
        setUserSelectedPlotId(null);
        setBookingSuccess(null);
    }, [activeTab, isExploring, selectedLocation.layoutId]);

    const systemSettings = useMemo(() => {
        return database.settings || {
            bookingAdvance: 50000,
            supportPhone: "+91 98765 43210",
            supportEmail: "support@propertydocsdevelopers.in",
            officeAddress: "Property Docs Plaza, Highway Road, Vijayamangalam, Erode, Tamil Nadu - 638056"
        };
    }, [database.settings]);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all'); // 'all', 'available', 'premium'
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        return localStorage.getItem("property_docs_user_sidebar_collapsed") === "true";
    });
    useEffect(() => {
        localStorage.setItem("property_docs_user_sidebar_collapsed", sidebarCollapsed ? "true" : "false");
    }, [sidebarCollapsed]);

    const [layers, setLayers] = useState(() => {
        const saved = localStorage.getItem("property_docs_user_layers");
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        return { labels: true, roads: true, grids: false, statusColors: true };
    });
    useEffect(() => {
        localStorage.setItem("property_docs_user_layers", JSON.stringify(layers));
    }, [layers]);

    const [currentTool, setCurrentTool] = useState(() => {
        return localStorage.getItem("property_docs_user_current_tool") || "select";
    });
    useEffect(() => {
        localStorage.setItem("property_docs_user_current_tool", currentTool);
    }, [currentTool]);

    const [isLocked, setIsLocked] = useState(true);

    // User Booking form states
    const [bookingForm, setBookingForm] = useState({
        name: '',
        phone: '',
        email: '',
        advanceAmount: systemSettings.bookingAdvance,
        paymentMethod: 'upi'
    });

    // Firebase Auth State
    const [authUser, setAuthUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Profile Lookup state
    const [searchPhone, setSearchPhone] = useState('');
    const [activeUserPhone, setActiveUserPhone] = useState('');
    const [activeUserNameState, setActiveUserNameState] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setAuthUser(currentUser);
            if (currentUser) {
                setActiveUserPhone(currentUser.phoneNumber || '');
                setActiveUserNameState(currentUser.displayName || currentUser.email || '');
                
                // Sync user to database
                setDatabase(prev => {
                    const existingUser = (prev.users || []).find(u => u.uid === currentUser.uid);
                    if (!existingUser) {
                        const newUser = {
                            uid: currentUser.uid,
                            email: currentUser.email,
                            displayName: currentUser.displayName,
                            photoURL: currentUser.photoURL,
                            phone: currentUser.phoneNumber || '',
                            createdAt: new Date().toISOString()
                        };
                        const updated = { ...prev, users: [...(prev.users || []), newUser] };
                        saveFullDatabase(updated).catch(console.error);
                        return updated;
                    }
                    return prev;
                });
            } else {
                setActiveUserPhone('');
                setActiveUserNameState('');
            }
            setAuthLoading(false);
        });
        return unsubscribe;
    }, [setDatabase]);

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            showToast("Successfully logged in!", "success");
        } catch (error) {
            showToast("Login failed.", "error");
        }
    };

    const [localFavorites, setLocalFavorites] = useState(() => {
        try {
            const saved = localStorage.getItem("property_docs_user_favorites");
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    const isFavorite = useCallback((listingId) => {
        if (!listingId) return false;
        return localFavorites.includes(listingId);
    }, [localFavorites]);

    const toggleFavorite = useCallback((listingId) => {
        if (!listingId) return;
        setLocalFavorites(prev => {
            let updated;
            if (prev.includes(listingId)) {
                updated = prev.filter(id => id !== listingId);
                showToast && showToast("Removed from saved favorites", "info");
            } else {
                updated = [...prev, listingId];
                showToast && showToast("Saved to your browser favorites!", "success");
            }
            localStorage.setItem("property_docs_user_favorites", JSON.stringify(updated));
            return updated;
        });
    }, [showToast]);

    // Keep state / district dropdowns valid
    const uniqueStates = useMemo(() => {
        const states = database.layouts.map(l => l.state || "Tamil Nadu");
        return [...new Set(states)];
    }, [database.layouts]);

    const uniqueDistricts = useMemo(() => {
        const districts = database.layouts
            .filter(l => (l.state || "Tamil Nadu") === selectedLocation.state)
            .map(l => l.district || "Erode");
        return [...new Set(districts)];
    }, [database.layouts, selectedLocation.state]);

    const matchingLayouts = useMemo(() => {
        return database.layouts.filter(l => 
            (l.state || "Tamil Nadu") === selectedLocation.state &&
            (l.district || "Erode") === selectedLocation.district
        );
    }, [database.layouts, selectedLocation.state, selectedLocation.district]);

    // Handle dropdown transitions
    const handleStateChange = (stateName) => {
        const districts = database.layouts
            .filter(l => (l.state || "Tamil Nadu") === stateName)
            .map(l => l.district || "Erode");
        const nextDistrict = districts[0] || "";
        
        setSelectedLocation({
            state: stateName,
            district: nextDistrict,
            layoutId: ''
        });
    };

    // Auto select first matching layout when location inputs change
    useEffect(() => {
        if (matchingLayouts.length > 0 && !selectedLocation.layoutId) {
            setSelectedLocation(prev => ({ ...prev, layoutId: matchingLayouts[0].id }));
        }
    }, [matchingLayouts, selectedLocation.layoutId]);

    const activeLayout = useMemo(() => {
        return database.layouts.find(l => l.id === selectedLocation.layoutId) || database.layouts[0];
    }, [database.layouts, selectedLocation.layoutId]);

    const setMapData = useCallback((newDataOrFunc) => {
        setDatabase(prevDb => {
            const targetId = selectedLocation.layoutId || (prevDb.layouts[0] && prevDb.layouts[0].id);
            if (!targetId) return prevDb;
            
            const newLayouts = prevDb.layouts.map(l => {
                if (l.id === targetId) {
                    const updated = typeof newDataOrFunc === 'function' ? newDataOrFunc(l) : newDataOrFunc;
                    return { ...l, ...updated };
                }
                return l;
            });
            return {
                ...prevDb,
                layouts: newLayouts
            };
        });
    }, [selectedLocation.layoutId, setDatabase]);

    const plotsCount = useMemo(() => {
        if (!activeLayout) return { total: 0, available: 0, reserved: 0, sold: 0, premium: 0, rentals: 0 };
        const plots = activeLayout.plots.filter(p => !p.classification || p.classification === 'plot');
        const rentals = activeLayout.plots.filter(p => ['rental_house', 'pg', 'room', 'bogithu'].includes(p.classification));
        return {
            total: plots.length + rentals.length,
            available: plots.filter(p => p.status === 'available').length,
            reserved: plots.filter(p => p.status === 'reserved').length,
            sold: plots.filter(p => p.status === 'sold').length,
            premium: plots.filter(p => p.status === 'premium').length,
            rentals: rentals.length
        };
    }, [activeLayout]);

    // Overall global stats for counts
    const globalStats = useMemo(() => {
        let total = 0, available = 0, sold = 0;
        database.layouts.forEach(l => {
            const plots = l.plots.filter(p => !p.classification || p.classification === 'plot');
            total += plots.length;
            available += plots.filter(p => p.status === 'available' || p.status === 'premium').length;
            sold += plots.filter(p => p.status === 'sold' || p.status === 'reserved').length;
        });
        return { total, available, sold };
    }, [database.layouts]);

    const selectedPlot = useMemo(() => {
        if (!userSelectedPlotId || !activeLayout) return null;
        return activeLayout.plots.find(p => p.id === userSelectedPlotId);
    }, [userSelectedPlotId, activeLayout]);

    // Numerical sort and search filter for plots in sidebar
    const filteredPlots = useMemo(() => {
        if (!activeLayout || !activeLayout.plots) return [];
        return activeLayout.plots
            .filter(p => {
                const cls = p.classification || 'plot';
                if (filterCategory === 'rentals') return ['rental_house', 'pg', 'room', 'bogithu'].includes(cls);
                if (filterCategory === 'available' || filterCategory === 'premium') return cls === 'plot';
                return ['plot', 'rental_house', 'pg', 'room', 'bogithu'].includes(cls); // 'all' includes plots + rentals
            })
            .filter(p => {
                if (filterCategory === 'available') return p.status === 'available';
                if (filterCategory === 'premium') return p.status === 'premium';
                return true;
            })
            .filter(p => {
                if (!searchQuery.trim()) return true;
                return p.id.toLowerCase().includes(searchQuery.toLowerCase().trim());
            })
            .sort((a, b) => {
                const numA = parseInt(a.id.replace(/\D/g, ''), 10);
                const numB = parseInt(b.id.replace(/\D/g, ''), 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                if (!isNaN(numA)) return -1;
                if (!isNaN(numB)) return 1;
                return a.id.localeCompare(b.id);
            });
    }, [activeLayout, filterCategory, searchQuery]);

    // Unified plot selection callback
    const handleSelectPlot = useCallback((id) => {
        if (id) {
            const plot = activeLayout.plots.find(p => p.id === id);
            if (plot) {
                if (filterCategory === 'available' && plot.status !== 'available') {
                    showToast("Plot is not Available. Filter is set to Available Only.", "warning");
                    return;
                }
                if (filterCategory === 'premium' && plot.status !== 'premium') {
                    showToast("Plot is not Premium. Filter is set to Premium Only.", "warning");
                    return;
                }
            }
        }
        setUserSelectedPlotId(id);
        setBookingSuccess(null);
    }, [activeLayout, filterCategory, showToast]);

    // Handle plot booking submission
    const handleBookPlot = (e) => {
        e.preventDefault();
        if (!selectedPlot || !activeLayout) return;

        const bookingId = `BK-${Date.now()}`;
        const newBooking = {
            id: bookingId,
            layoutId: activeLayout.id,
            layoutName: activeLayout.name,
            plotId: selectedPlot.id,
            customerName: bookingForm.name.trim(),
            customerPhone: bookingForm.phone.trim(),
            customerEmail: bookingForm.email.trim(),
            amountPaid: parseFloat(bookingForm.advanceAmount) || systemSettings.bookingAdvance,
            date: new Date().toISOString(),
            status: 'pending' // pending approval from admin
        };

        // Update database: add booking record and set plot status to reserved
        setDatabase(prev => {
            const newBookings = [...(prev.bookings || []), newBooking];
            const newLayouts = prev.layouts.map(l => {
                if (l.id === activeLayout.id) {
                    return {
                        ...l,
                        plots: l.plots.map(p => {
                            if (p.id === selectedPlot.id) {
                                return { ...p, status: 'reserved' };
                            }
                            return p;
                        })
                    };
                }
                return l;
            });
            return {
                ...prev,
                layouts: newLayouts,
                bookings: newBookings
            };
        });

        // Set active user session
        localStorage.setItem('property_docs_user_session_phone', newBooking.customerPhone);
        localStorage.setItem('property_docs_user_session_name', newBooking.customerName);
        setActiveUserPhone(newBooking.customerPhone);
        setActiveUserNameState(newBooking.customerName);

        setBookingSuccess(newBooking);
        showToast(`Plot ${selectedPlot.id} successfully reserved! Booking ID: ${bookingId}`, "success");
        
        // Reset form
        setBookingForm({
            name: '',
            phone: '',
            email: '',
            advanceAmount: systemSettings.bookingAdvance,
            paymentMethod: 'upi'
        });
    };

    const normalizePhone = (phone) => {
        if (!phone) return "";
        const digits = phone.replace(/\D/g, '');
        return digits.slice(-10);
    };

    // Filter bookings matching active user
    const userBookings = useMemo(() => {
        if (!activeUserPhone) return [];
        const target = normalizePhone(activeUserPhone);
        if (!target) return [];
        return (database.bookings || []).filter(b => normalizePhone(b.customerPhone) === target);
    }, [database.bookings, activeUserPhone]);

    const activeUserName = useMemo(() => {
        if (activeUserNameState) return activeUserNameState;
        if (userBookings.length > 0) {
            // Find the latest name used
            const sorted = [...userBookings].sort((a, b) => b.date.localeCompare(a.date));
            return sorted[0].customerName;
        }
        return '';
    }, [activeUserNameState, userBookings]);

    const handleSearchBookingsByPhone = (e) => {
        e.preventDefault();
        const trimmedPhone = searchPhone.trim();
        if (!trimmedPhone) return;
        localStorage.setItem('property_docs_user_session_phone', trimmedPhone);
        setActiveUserPhone(trimmedPhone);

        // Auto-extract name if bookings match (normalized last 10 digits)
        const target = normalizePhone(trimmedPhone);
        const matchingBookings = (database.bookings || []).filter(b => normalizePhone(b.customerPhone) === target);
        if (matchingBookings.length > 0) {
            const sorted = [...matchingBookings].sort((a, b) => b.date.localeCompare(a.date));
            const name = sorted[0].customerName;
            localStorage.setItem('property_docs_user_session_name', name);
            setActiveUserNameState(name);
        } else {
            localStorage.removeItem('property_docs_user_session_name');
            setActiveUserNameState('');
        }

        showToast(`Found bookings matching ${trimmedPhone}`, "info");
    };

    const handleLogoutSession = async () => {
        try {
            await signOut(auth);
            showToast("Logged out.", "info");
        } catch (error) {
            showToast("Error logging out.", "error");
        }
    };

    const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
    const [sortBy, setSortBy] = useState('newest');

    const sortedDisplayLocations = useMemo(() => {
        let locs = [...displayLocations];
        switch(sortBy) {
            case 'price_low':
                locs.sort((a, b) => (Number(a.rentAmount || a.price || 0)) - (Number(b.rentAmount || b.price || 0)));
                break;
            case 'price_high':
                locs.sort((a, b) => (Number(b.rentAmount || b.price || 0)) - (Number(a.rentAmount || a.price || 0)));
                break;
            case 'newest':
            default:
                break;
        }
        return locs;
    }, [displayLocations, sortBy]);

    const handleHeroSearch = () => {
        if (userSearchText.trim()) {
            setActiveTab('search');
            showToast(`Searching for "${userSearchText}"...`, "info");
        }
    };

    return (
        <div className="user-portal-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f8fafc' }}>
            
            {/* Header */}
            <Header 
                theme={theme}
                setTheme={() => {}}
                mapData={database}
                showToast={showToast}
                role="user"
                setRole={setRole}
                favoritesCount={localFavorites.length}
                onOpenAuth={handleGoogleLogin}
                onGoHome={() => {
                    setActiveTab('home');
                    clearSearch();
                }}
                onOpenFavorites={() => {
                    setActiveTab('search');
                    showToast(`Showing ${localFavorites.length} saved favorites in your browser`, "info");
                }}
            />

            {/* Content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                
                {/* HOME VIEW */}
                {activeTab === 'home' && (
                    <div style={{ flex: 1, overflowY: 'auto' }} className="animate-fade-in">
                        
                        {/* Hero Section — Immersive Full Viewport Height */}
                        <div className="realtor-hero" style={{ 
                            backgroundImage: 'url("https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1920&q=80")',
                            minHeight: 'calc(100vh - 96px)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '60px 20px',
                            boxSizing: 'border-box'
                        }}>
                            <div className="realtor-hero-overlay" />
                            
                            <div className="realtor-hero-content">
                                <h1 className="realtor-hero-title">
                                    Search {allLocations.length > 0 ? allLocations.length.toLocaleString() : '15'} verified listings from trusted Property Docs Experts
                                </h1>
                            </div>

                            <div className="realtor-hero-search-box">
                                {/* Residential / Commercial Tabs */}
                                <div className="realtor-hero-search-tabs">
                                    <button 
                                        className="realtor-hero-tab-residential"
                                        style={{ opacity: advancedFilters.tab === 'residential' ? 1 : 0.85 }}
                                        onClick={() => setAdvancedFilters(prev => ({ ...prev, tab: 'residential' }))}
                                    >
                                        🏠 Residential
                                    </button>
                                    <button 
                                        className="realtor-hero-tab-commercial"
                                        style={{ opacity: advancedFilters.tab === 'commercial' ? 1 : 0.85 }}
                                        onClick={() => setAdvancedFilters(prev => ({ ...prev, tab: 'commercial' }))}
                                    >
                                        🏢 Commercial
                                    </button>
                                </div>

                                {/* Search Input Row */}
                                <div className="realtor-hero-search-input-row" style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>
                                    {isLoaded ? (
                                        <div style={{ flex: 1, display: 'flex', width: '100%' }}>
                                            <StandaloneSearchBox
                                                onLoad={onSearchBoxLoad}
                                                onPlacesChanged={() => {
                                                    onPlacesChanged();
                                                    setActiveTab('search');
                                                }}
                                            >
                                                <input
                                                    type="text"
                                                    className="realtor-hero-search-input"
                                                    placeholder="City, District, Area, Address or MLS number"
                                                    value={userSearchText}
                                                    onChange={(e) => {
                                                        setUserSearchText(e.target.value);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleHeroSearch();
                                                    }}
                                                    style={{ width: '100%', flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '12px 18px', fontSize: '0.95rem' }}
                                                />
                                            </StandaloneSearchBox>
                                        </div>
                                    ) : (
                                        <input 
                                            type="text"
                                            className="realtor-hero-search-input"
                                            placeholder="City, District, Area, Address or MLS number"
                                            value={userSearchText}
                                            onChange={(e) => {
                                                setUserSearchText(e.target.value);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleHeroSearch();
                                            }}
                                            style={{ width: '100%', flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '12px 18px', fontSize: '0.95rem' }}
                                        />
                                    )}
                                    <button 
                                        className="realtor-hero-search-btn-green"
                                        onClick={handleHeroSearch}
                                        title="Search"
                                        style={{ marginLeft: 'auto', flexShrink: 0 }}
                                    >
                                        <Search size={22} color="#ffffff" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* CTA Banner */}
                        <div className="realtor-cta-banner">
                            <span>Need help finding a Property Docs Expert? Browse verified legal advisors & property representatives.</span>
                            <button className="realtor-cta-banner-btn" onClick={() => setActiveTab('search')}>Get Started</button>
                        </div>

                        {/* Featured Listings — Limit to EXACTLY 3 Real Properties */}
                        <div style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                            Latest Verified Properties
                                        </h2>
                                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
                                            Showing top 3 newly listed verified properties
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setActiveTab('search')}
                                        style={{ background: 'transparent', border: 'none', color: '#921214', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        View All ({allLocations.length}) <ArrowRight size={16} />
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                    {allLocations.slice(0, 3).map((loc, idx) => {
                                        const houseFallbacks = [
                                            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
                                            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
                                            'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80'
                                        ];
                                        
                                        let imgUrl = houseFallbacks[idx % 3];
                                        const raw = (loc.media && loc.media[0] && loc.media[0].url) || loc.image || '';
                                        if (typeof raw === 'string' && raw.startsWith('http') && !raw.includes('avatar') && !raw.includes('pixel') && !raw.includes('svg') && !raw.includes('settlo') && !raw.includes('default') && !raw.includes('bolt') && !raw.includes('red')) {
                                            imgUrl = raw;
                                        }

                                        return (
                                            <div 
                                                key={loc.id || idx} 
                                                className="realtor-listing-card"
                                                style={{ borderRadius: '8px' }}
                                                onClick={() => setSelectedDetailListing(loc)}
                                            >
                                                <div style={{ position: 'relative' }}>
                                                    <img 
                                                        className="realtor-listing-card-img"
                                                        src={imgUrl} 
                                                        alt={loc.name}
                                                        onError={(e) => { e.target.onerror = null; e.target.src = houseFallbacks[idx % 3]; }}
                                                    />
                                                    <button 
                                                        className="realtor-listing-fav"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleFavorite(loc.id);
                                                        }}
                                                    >
                                                        <Heart size={16} fill={isFavorite(loc.id) ? "#921214" : "none"} color={isFavorite(loc.id) ? "#921214" : "#64748b"} />
                                                    </button>
                                                    <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '3px', fontWeight: 600 }}>
                                                        {loc.listedAgo || 'Recently Added'}
                                                    </div>
                                                </div>
                                                <div className="realtor-listing-card-body">
                                                    <div className="realtor-listing-price">
                                                        {loc.isOwnerListing 
                                                            ? (loc.category === 'bogithu' ? `₹${Number(loc.bogithuAmount || 1500000).toLocaleString('en-IN')}` : `₹${Number(loc.rentAmount || 25000).toLocaleString('en-IN')}`)
                                                            : (loc.price ? `₹${Number(loc.price).toLocaleString('en-IN')}` : '₹45,00,000')}
                                                    </div>
                                                    <div className="realtor-listing-address">
                                                        {loc.name || loc.title || 'Verified Property'}
                                                    </div>
                                                    <div className="realtor-listing-location">
                                                        {loc.displayAddress || `${loc.district || 'Erode'}, ${loc.state || 'Tamil Nadu'}`}
                                                    </div>
                                                    <div className="realtor-listing-specs">
                                                        <span>🛏️ {loc.beds || 3}</span>
                                                        <span>🛁 {loc.baths || 2}</span>
                                                        <span>📐 {loc.sqft || '1,200'} sqft</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                                {allLocations.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                                        <MapPin size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                        <p>No property listings available yet. Check back soon!</p>
                                    </div>
                                )}

                            {/* Global Statistics KPIs Row */}
                            <div className="kpi-grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                                <div className="kpi-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                    <div style={{ background: 'rgba(146, 18, 20, 0.1)', color: '#921214', padding: '12px', borderRadius: '50%' }}>
                                        <ShieldCheck size={26} />
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>100%</span>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Legal Compliance</span>
                                    </div>
                                </div>

                                <div className="kpi-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                    <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '12px', borderRadius: '50%' }}>
                                        <ClipboardCheck size={26} />
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>5,000+</span>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Documents Verified</span>
                                    </div>
                                </div>

                                <div className="kpi-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                    <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '12px', borderRadius: '50%' }}>
                                        <CheckCircle size={26} />
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>2,500+</span>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Satisfied Clients</span>
                                    </div>
                                </div>
                            </div>

                            {/* Our Services */}
                            <div>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ClipboardCheck size={20} color="#921214" /> Our Expert Services
                                </h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                        <ShieldCheck size={28} color="#921214" style={{ marginBottom: '12px' }} />
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Property Title Verification</h3>
                                        <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: '1.6' }}>
                                            Thorough 30-year parent document tracing, Encumbrance Certificate (EC) analysis, and legal scrutiny to ensure the property is 100% free of litigations.
                                        </p>
                                    </div>

                                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                        <ClipboardCheck size={28} color="#00a2bb" style={{ marginBottom: '12px' }} />
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Registration & Patta Transfer</h3>
                                        <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: '1.6' }}>
                                            End-to-end assistance for Sub-Registrar office registrations, sale deed drafting, and seamless name transfer for Patta, Chitta, and property tax records.
                                        </p>
                                    </div>

                                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                        <Building2 size={28} color="#334155" style={{ marginBottom: '12px' }} />
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Legal Consultation</h3>
                                        <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: '1.6' }}>
                                            Expert guidance on land clearance, layout approvals, RERA compliance, and document preparation for property buyers and sellers.
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Professional Footer */}
                        <footer style={{ background: '#0f172a', color: '#ffffff', padding: '48px 24px 24px 24px', marginTop: '40px' }}>
                            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px', marginBottom: '40px' }}>
                                <div>
                                    <div style={{ background: '#ffffff', padding: '4px 10px', borderRadius: '6px', display: 'inline-flex', marginBottom: '16px' }}>
                                        <img src="/Gemini_Generated_Image_jfbya2jfbya2jfby.png" alt="Property Docks Logo" style={{ height: '32px' }} />
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6' }}>
                                        Property Docks provides legal verification, property documentation, and verified real estate listings across South India.
                                    </p>
                                </div>

                                <div>
                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px', color: '#ffffff' }}>Quick Links</h4>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <li style={{ cursor: 'pointer' }} onClick={() => setActiveTab('home')}>Find a Home</li>
                                        <li style={{ cursor: 'pointer' }} onClick={() => setActiveTab('search')}>Map Search</li>
                                        <li style={{ cursor: 'pointer' }} onClick={() => setActiveTab('search')}>Verified Listings</li>
                                        <li style={{ cursor: 'pointer' }} onClick={() => showToast("Contact support@propertydocsdevelopers.in", "info")}>Legal Advice</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px', color: '#ffffff' }}>Contact Us</h4>
                                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} color="#00a2bb" /> {systemSettings.supportPhone}</p>
                                        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={14} color="#00a2bb" /> {systemSettings.supportEmail}</p>
                                        <p style={{ margin: 0, lineHeight: '1.5' }}>{systemSettings.officeAddress}</p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ maxWidth: '1200px', margin: '0 auto', borderTop: '1px solid #1e293b', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap', gap: '12px' }}>
                                <p style={{ margin: 0 }}>© {new Date().getFullYear()} Property Docks. All rights reserved.</p>
                                <p style={{ margin: 0 }}>Powered by Property Docks Legal Verification Engine</p>
                            </div>
                        </footer>
                    </div>
                )}

                {/* SEARCH RESULTS VIEW */}
                {activeTab === 'search' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="animate-fade-in">
                        
                        {/* Search Bar */}
                        <div className="realtor-search-bar-wrapper">
                            <div className="realtor-search-tabs">
                                <button 
                                    className={`realtor-search-tab ${advancedFilters.tab === 'residential' ? 'active' : ''}`}
                                    onClick={() => setAdvancedFilters(prev => ({ ...prev, tab: 'residential' }))}
                                >
                                    🏠 Residential
                                </button>
                                <button 
                                    className={`realtor-search-tab ${advancedFilters.tab === 'commercial' ? 'active' : ''}`}
                                    onClick={() => setAdvancedFilters(prev => ({ ...prev, tab: 'commercial' }))}
                                >
                                    🏢 Commercial
                                </button>
                            </div>

                            <div className="realtor-search-bar-grid">
                                {isLoaded ? (
                                    <StandaloneSearchBox onLoad={onSearchBoxLoad} onPlacesChanged={onPlacesChanged}>
                                        <div style={{ position: 'relative', width: '100%', flex: 1, minWidth: '220px' }}>
                                            <input type="text" className="realtor-input" placeholder="City, Neighbourhood, Address or MLS® number" value={userSearchText} onChange={(e) => setUserSearchText(e.target.value)} />
                                            {userSearchText && (<X size={16} onClick={clearSearch} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }} />)}
                                        </div>
                                    </StandaloneSearchBox>
                                ) : (
                                    <input type="text" className="realtor-input" placeholder="City, Neighbourhood, Address or MLS® number" value={userSearchText} onChange={(e) => setUserSearchText(e.target.value)} />
                                )}

                                <select className="realtor-select" value={advancedFilters.transactionType} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, transactionType: e.target.value }))}>
                                    <option value="all">All Properties</option>
                                    <option value="for_sale">For Sale</option>
                                    <option value="for_rent">For Rent / Lease</option>
                                    <option value="sold">Sold</option>
                                </select>

                                <select className="realtor-select" value={advancedFilters.minPrice} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minPrice: e.target.value }))}>
                                    <option value="">Min Price</option>
                                    <option value="1000000">₹10 Lakhs</option>
                                    <option value="2500000">₹25 Lakhs</option>
                                    <option value="5000000">₹50 Lakhs</option>
                                    <option value="7500000">₹75 Lakhs</option>
                                    <option value="10000000">₹1 Crore</option>
                                </select>

                                <select className="realtor-select" value={advancedFilters.maxPrice} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, maxPrice: e.target.value }))}>
                                    <option value="">Max Price</option>
                                    <option value="5000000">₹50 Lakhs</option>
                                    <option value="10000000">₹1 Crore</option>
                                    <option value="20000000">₹2 Crores</option>
                                    <option value="50000000">₹5 Crores+</option>
                                </select>

                                {advancedFilters.tab === 'commercial' ? (
                                    <>
                                        <select className="realtor-select" value={advancedFilters.minSqft} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minSqft: e.target.value }))}>
                                            <option value="">Building Size</option>
                                            <option value="500">500+ sqft</option>
                                            <option value="1000">1,000+ sqft</option>
                                            <option value="2500">2,500+ sqft</option>
                                            <option value="5000">5,000+ sqft</option>
                                            <option value="10000">10,000+ sqft</option>
                                        </select>

                                        <select className="realtor-select" value={advancedFilters.minLand} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minLand: e.target.value }))}>
                                            <option value="">Min Land Area</option>
                                            <option value="1000">1,000+ sqft</option>
                                            <option value="5000">5,000+ sqft</option>
                                            <option value="10000">10,000+ sqft</option>
                                            <option value="43560">1 Acre+</option>
                                        </select>

                                        <select className="realtor-select" value={advancedFilters.maxLand} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, maxLand: e.target.value }))}>
                                            <option value="">Max Land Area</option>
                                            <option value="5000">5,000 sqft</option>
                                            <option value="10000">10,000 sqft</option>
                                            <option value="43560">1 Acre</option>
                                            <option value="217800">5 Acres</option>
                                        </select>
                                    </>
                                ) : (
                                    <>
                                        <select className="realtor-select" value={advancedFilters.beds} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, beds: e.target.value }))}>
                                            <option value="any">Beds</option>
                                            <option value="1">1+</option>
                                            <option value="2">2+</option>
                                            <option value="3">3+</option>
                                            <option value="4">4+</option>
                                            <option value="5">5+</option>
                                        </select>

                                        <select className="realtor-select" value={advancedFilters.baths} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, baths: e.target.value }))}>
                                            <option value="any">Baths</option>
                                            <option value="1">1+</option>
                                            <option value="2">2+</option>
                                            <option value="3">3+</option>
                                        </select>
                                    </>
                                )}

                                <button className="btn-realtor-search" onClick={() => showToast(`Searching for ${userSearchText || 'all listings'}...`, "info")}>
                                    <Search size={18} />
                                </button>

                                <button className="btn-realtor-filter" onClick={() => setIsAdvancedFilterOpen(true)}>
                                    <Sliders size={16} /> Filters
                                </button>

                                <button className="btn-realtor-filter" onClick={() => showToast("Search saved to your profile!", "success")}>
                                    Save Search
                                </button>
                            </div>
                        </div>

                        {/* Results Bar */}
                        <div className="realtor-results-bar">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span className="realtor-results-count">Results: {sortedDisplayLocations.length} Listings</span>
                                <select className="realtor-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="newest">Newest</option>
                                    <option value="price_low">Price (Low to High)</option>
                                    <option value="price_high">Price (High to Low)</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="realtor-view-toggle">
                                    <button className={`realtor-view-btn ${viewMode === 'map' ? 'active' : ''}`} onClick={() => setViewMode('map')}>
                                        <Map size={14} style={{ marginRight: '4px' }} /> Map
                                    </button>
                                    <button className={`realtor-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                                        <LayoutGrid size={14} style={{ marginRight: '4px' }} /> List
                                    </button>
                                </div>
                                <button 
                                    onClick={() => { setActiveTab('home'); clearSearch(); }} 
                                    style={{ 
                                        background: '#921214', 
                                        color: '#ffffff', 
                                        border: 'none', 
                                        borderRadius: '20px', 
                                        padding: '8px 18px', 
                                        fontSize: '0.85rem', 
                                        fontWeight: 700, 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '6px',
                                        boxShadow: '0 2px 6px rgba(146, 18, 20, 0.3)'
                                    }}
                                >
                                    <ArrowLeft size={16} /> Back to Home Page
                                </button>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                            
                            {/* Left Sidebar Cards — Map mode */}
                            {viewMode === 'map' && (
                                <div style={{ 
                                    width: isDirectoryOpen ? '380px' : '0px', 
                                    background: '#ffffff', 
                                    borderRight: isDirectoryOpen ? '1px solid #e2e8f0' : 'none', 
                                    overflowY: 'auto', overflowX: 'hidden', 
                                    display: 'flex', flexDirection: 'column',
                                    zIndex: 10, flexShrink: 0,
                                    transition: 'width 0.3s ease'
                                }}>
                                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                                        {sortedDisplayLocations.length > 0 ? sortedDisplayLocations.map(loc => (
                                            <div 
                                                key={loc.id} 
                                                className="realtor-listing-card" 
                                                onClick={() => {
                                                    setFocusedLocation(loc);
                                                    setSelectedDetailListing(loc);
                                                }} 
                                                style={{ marginBottom: '12px', borderRadius: '8px', cursor: 'pointer' }}
                                            >
                                                <div style={{ position: 'relative' }}>
                                                    <img className="realtor-listing-card-img" src={loc.media && loc.media[0] ? loc.media[0].url : loc.image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'} alt={loc.name} />
                                                    <button className="realtor-listing-fav" onClick={(e) => { e.stopPropagation(); if (!authUser) { handleGoogleLogin(); return; } toggleFavorite(loc.id); }}>
                                                        <Heart size={16} fill={isFavorite(loc.id) ? "#921214" : "none"} color={isFavorite(loc.id) ? "#921214" : "#64748b"} />
                                                    </button>
                                                    <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '3px', fontWeight: 600 }}>{loc.listedAgo || '2 hours ago'}</div>
                                                </div>
                                                <div className="realtor-listing-card-body">
                                                    <div className="realtor-listing-price">{loc.isOwnerListing ? (loc.category === 'bogithu' ? `₹${Number(loc.bogithuAmount || 1500000).toLocaleString('en-IN')}` : `₹${Number(loc.rentAmount || 25000).toLocaleString('en-IN')}`) : (loc.price ? `₹${Number(loc.price).toLocaleString('en-IN')}` : '₹45,00,000')}</div>
                                                    <div className="realtor-listing-address">{loc.name || loc.title || 'Property Listing'}</div>
                                                    <div className="realtor-listing-location">{loc.displayAddress || `${loc.district || 'Area'}, ${loc.state || 'State'}`}</div>
                                                    <div className="realtor-listing-specs">
                                                        <span>🛏️ {loc.beds || 3}</span>
                                                        <span>🛁 {loc.baths || 2}</span>
                                                        <span>📐 {loc.sqft || '1,200'} sqft</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                                                <MapPin size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                                <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No properties found</p>
                                                <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Try modifying your search or broadening your area.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Map */}
                            {viewMode === 'map' && (
                                <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                                    <div onClick={() => setIsDirectoryOpen(!isDirectoryOpen)} style={{ position: 'absolute', left: 0, top: '16px', zIndex: 100, background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: 'none', borderRadius: '0 8px 8px 0', padding: '10px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 0 8px rgba(0,0,0,0.1)' }}>
                                        {isDirectoryOpen ? <ChevronLeft size={18} color="#921214" /> : <ChevronRight size={18} color="#921214" />}
                                    </div>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <GlobalMap 
                                            locations={filteredLocations} 
                                            center={focusedLocation ? { lat: focusedLocation.lat, lng: focusedLocation.lng } : userSearchCoords} 
                                            zoom={focusedLocation || userSearchCoords ? 13 : null} 
                                            focusedLocation={focusedLocation}
                                            onFilteredLocationsChange={setDrawnFilteredLocations}
                                            clearBoundaryTrigger={clearBoundaryTrigger}
                                            authUser={authUser}
                                            onLoginReq={handleGoogleLogin}
                                            isFavorite={isFavorite}
                                            onToggleFavorite={toggleFavorite}
                                            onContactOwner={(loc) => { setSelectedContactListing(loc); setContactModalOpen(true); }}
                                            onSelectDetail={(loc) => setSelectedDetailListing(loc)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* List View */}
                            {viewMode === 'list' && (
                                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f8fafc' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
                                        {sortedDisplayLocations.length > 0 ? sortedDisplayLocations.map(loc => (
                                            <div key={loc.id} className="realtor-listing-card" style={{ borderRadius: '8px' }} onClick={() => setSelectedDetailListing(loc)}>
                                                <div style={{ position: 'relative' }}>
                                                    <img className="realtor-listing-card-img" src={loc.media && loc.media[0] ? loc.media[0].url : loc.image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'} alt={loc.name} />
                                                    <button className="realtor-listing-fav" onClick={(e) => { e.stopPropagation(); if (!authUser) { handleGoogleLogin(); return; } toggleFavorite(loc.id); }}>
                                                        <Heart size={16} fill={isFavorite(loc.id) ? "#921214" : "none"} color={isFavorite(loc.id) ? "#921214" : "#64748b"} />
                                                    </button>
                                                </div>
                                                <div className="realtor-listing-card-body">
                                                    <div className="realtor-listing-price">{loc.isOwnerListing ? (loc.category === 'bogithu' ? `₹${Number(loc.bogithuAmount).toLocaleString('en-IN')}` : `₹${Number(loc.rentAmount).toLocaleString('en-IN')}`) : (loc.price ? `₹${Number(loc.price).toLocaleString('en-IN')}` : '₹45,00,000')}</div>
                                                    <div className="realtor-listing-address">{loc.name || loc.title || 'Property Listing'}</div>
                                                    <div className="realtor-listing-location">{loc.displayAddress || `${loc.district || 'Area'}, ${loc.state || 'State'}`}</div>
                                                    <div className="realtor-listing-specs">
                                                        <span>🛏️ {loc.beds || 3}</span>
                                                        <span>🛁 {loc.baths || 2}</span>
                                                        <span>📐 {loc.sqft || '1,200'} sqft</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                                                <MapPin size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                                <p>No properties match your search.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* Contact Owner / Request Showing Modal — Professional Realtor Style */}
            {contactModalOpen && selectedContactListing && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
                        {/* Header with close */}
                        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>Request Property Information</h3>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}><span style={{ color: '#ef4444' }}>*</span> Required fields</p>
                            </div>
                            <button onClick={() => setContactModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                        </div>

                        {/* Representative/Owner Contact Card */}
                        <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#921214', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                                    {(selectedContactListing.contactName || 'A').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>To: {selectedContactListing.contactName || 'Property Representative'}</p>
                                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Property Docks Verified Agent</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '52px' }}>
                                <span style={{ fontSize: '0.82rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Phone size={13} color="#921214" /> {selectedContactListing.contactPhone || selectedContactListing.ownerPhone || '+91 98765 43210'}
                                </span>
                            </div>
                        </div>

                        {/* Property Info Banner */}
                        <div style={{ padding: '12px 24px', background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                            <p style={{ margin: 0, fontWeight: 700, color: '#92400e', fontSize: '0.88rem' }}>{selectedContactListing.name || selectedContactListing.title || 'Verified Property'}</p>
                            <p style={{ margin: '2px 0 0 0', color: '#a16207', fontSize: '0.78rem' }}>{selectedContactListing.displayAddress || `${selectedContactListing.district || 'Erode'}, Tamil Nadu`}</p>
                        </div>

                        {/* Inquiry Form */}
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.target;
                            const firstName = form.firstName.value.trim();
                            const lastName = form.lastName.value.trim();
                            const email = form.email.value.trim();
                            const phone = form.phone.value.trim();
                            const contactMethod = form.contactMethod.value;
                            const message = form.message.value.trim();
                            const planTo = form.planTo.value;

                            if (!firstName || !email || !phone) {
                                showToast("Please fill in all required fields", "warning");
                                return;
                            }

                            const newInquiry = {
                                id: 'inq_' + Date.now(),
                                listingId: selectedContactListing.id,
                                listingTitle: selectedContactListing.name || selectedContactListing.title || 'Property',
                                listingAddress: selectedContactListing.displayAddress || '',
                                listingPrice: selectedContactListing.price || selectedContactListing.rentAmount || '',
                                userName: `${firstName} ${lastName}`.trim(),
                                userEmail: email,
                                userPhone: phone,
                                contactMethod: contactMethod,
                                message: message,
                                planTo: planTo,
                                status: 'unread',
                                createdAt: new Date().toISOString()
                            };

                            const newDb = { ...database };
                            newDb.inquiries = [newInquiry, ...(newDb.inquiries || [])];

                            try {
                                setDatabase(newDb);
                                await saveFullDatabase(newDb);
                                showToast("✅ Inquiry submitted successfully! The property representative will contact you shortly.", "success");
                                setContactModalOpen(false);
                            } catch (err) {
                                console.error("Error saving inquiry", err);
                                showToast("Inquiry saved locally!", "success");
                                setContactModalOpen(false);
                            }
                        }} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Name Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>First Name <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="text" name="firstName" placeholder="First name" required style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Last Name</label>
                                    <input type="text" name="lastName" placeholder="Last name" style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Email <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="email" name="email" placeholder="example@email.com" required style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>

                            {/* Preferred Contact Method */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>Preferred method of contact <span style={{ color: '#ef4444' }}>*</span></label>
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem', color: '#334155' }}>
                                        <input type="radio" name="contactMethod" value="email" defaultChecked style={{ accentColor: '#921214' }} /> Email
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem', color: '#334155' }}>
                                        <input type="radio" name="contactMethod" value="phone" style={{ accentColor: '#921214' }} /> Phone
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem', color: '#334155' }}>
                                        <input type="radio" name="contactMethod" value="whatsapp" style={{ accentColor: '#921214' }} /> WhatsApp
                                    </label>
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Phone number <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="tel" name="phone" placeholder="+91 98765 43210" required style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>

                            {/* Message with auto-populated text */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Message <span style={{ color: '#ef4444' }}>*</span></label>
                                <textarea 
                                    name="message" 
                                    rows="4" 
                                    maxLength={1000}
                                    defaultValue={`I would appreciate more information about ${selectedContactListing.name || selectedContactListing.title || 'this property'}, ${selectedContactListing.displayAddress || selectedContactListing.district || 'Erode'}, Tamil Nadu.\n\nPlease share property documents and schedule a site visit.`}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.88rem', outline: 'none', resize: 'vertical', lineHeight: '1.5', boxSizing: 'border-box' }}
                                    onChange={(e) => {
                                        const counter = e.target.parentElement.querySelector('.char-count');
                                        if (counter) counter.textContent = `${e.target.value.length}/1000`;
                                    }}
                                />
                                <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }} className="char-count">0/1000</div>
                            </div>

                            {/* Plan To */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>In the next 6 months do you plan to:</label>
                                <select name="planTo" style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box', color: '#334155', background: '#fff' }}>
                                    <option value="">Select</option>
                                    <option value="buy">Buy a property</option>
                                    <option value="rent">Rent a property</option>
                                    <option value="sell">Sell a property</option>
                                    <option value="invest">Invest in real estate</option>
                                    <option value="browsing">Just browsing</option>
                                </select>
                            </div>

                            {/* Submit Buttons */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: '#921214', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(146,18,20,0.3)' }}>
                                    <Mail size={16} /> Send Inquiry
                                </button>
                                <button type="button" onClick={() => {
                                    const phone = selectedContactListing.contactPhone || selectedContactListing.ownerPhone || '+919876543210';
                                    window.location.href = `tel:${phone}`;
                                }} style={{ padding: '12px 20px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Phone size={16} /> Call
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Advanced Filter Modal */}
            <AdvancedFilterModal 
                isOpen={isAdvancedFilterOpen}
                onClose={() => setIsAdvancedFilterOpen(false)}
                filters={advancedFilters}
                setFilters={setAdvancedFilters}
                onApplyFilters={() => { showToast("Filters applied successfully!", "success"); }}
                onResetFilters={() => {
                    setAdvancedFilters({ tab: 'residential', transactionType: 'for_sale', propertyType: 'any', minPrice: '', maxPrice: '', beds: 'any', baths: 'any', minSqft: '', maxSqft: '', minLand: '', maxLand: '', listedSince: '', ownership: 'any', keywords: '', openHousesOnly: false, liveStreamsOnly: false, query: '' });
                    showToast("Filters reset to default", "info");
                }}
            />

            {/* Property Detail Modal */}
            <PropertyDetailModal 
                listing={selectedDetailListing}
                isOpen={!!selectedDetailListing}
                onClose={() => setSelectedDetailListing(null)}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
                onRequestShowing={(listing) => { setSelectedContactListing(listing); setSelectedDetailListing(null); setContactModalOpen(true); }}
            />

        </div>
    );
}
