import React, { useState } from 'react';
import { 
    X, 
    Heart, 
    Share2, 
    Printer, 
    Compass, 
    Calendar, 
    MapPin, 
    Phone, 
    Mail, 
    CheckCircle2, 
    ChevronLeft, 
    ChevronRight,
    Upload,
    Video,
    Image as ImageIcon,
    Maximize2,
    Eye
} from 'lucide-react';
import UniversalVideoPlayer from './UniversalVideoPlayer';
import { openDirectionsToLocation } from './GlobalMap';

export default function PropertyDetailModal({ listing, isOpen, onClose, onToggleFavorite, isFavorite, onRequestShowing, onCopyLink, onGetRoute }) {
    if (!isOpen || !listing) return null;

    const defaultFallbackImages = [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=800&q=80'
    ];

    const initialMedia = (listing.media && listing.media.length > 0)
        ? listing.media
        : (listing.galleryImages && listing.galleryImages.length > 0
            ? listing.galleryImages.map(img => ({ type: 'image', url: img }))
            : defaultFallbackImages.map(img => ({ type: 'image', url: img })));

    const [mediaList, setMediaList] = useState(initialMedia);
    const [isCopied, setIsCopied] = useState(false);

    const handleShareClick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);

        if (onCopyLink) {
            onCopyLink(listing, e);
        } else {
            const shareUrl = `${window.location.origin}/properties/${encodeURIComponent(listing.id)}`;
            if (navigator.clipboard) navigator.clipboard.writeText(shareUrl);
        }
    };
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);

    // Sync mediaList whenever listing prop changes
    React.useEffect(() => {
        const media = (listing && listing.media && listing.media.length > 0)
            ? listing.media
            : (listing && listing.galleryImages && listing.galleryImages.length > 0
                ? listing.galleryImages.map(img => ({ type: 'image', url: img }))
                : defaultFallbackImages.map(img => ({ type: 'image', url: img })));
        setMediaList(media);
    }, [listing]);

    const openLightbox = (index) => {
        setActiveMediaIndex(index);
        setLightboxOpen(true);
    };

    const handlePrevMedia = (e) => {
        e && e.stopPropagation();
        setActiveMediaIndex(prev => (prev > 0 ? prev - 1 : mediaList.length - 1));
    };

    const handleNextMedia = (e) => {
        e && e.stopPropagation();
        setActiveMediaIndex(prev => (prev < mediaList.length - 1 ? prev + 1 : 0));
    };

    const isLease = listing.transactionType === 'for_lease' || listing.transactionType === 'lease' || listing.category === 'bogithu' || (listing.bogithuAmount && Number(listing.bogithuAmount) > 0);
    const isRent = !isLease && (listing.transactionType === 'for_rent' || (listing.rentAmount && Number(listing.rentAmount) > 0));

    const currentMediaUrl = typeof mediaList[activeMediaIndex] === 'string' 
        ? mediaList[activeMediaIndex] 
        : (mediaList[activeMediaIndex]?.url || defaultFallbackImages[0]);
    const isCurrentVideo = (typeof mediaList[activeMediaIndex] === 'object' && mediaList[activeMediaIndex].type === 'video') ||
        (typeof mediaList[activeMediaIndex] === 'string' && (mediaList[activeMediaIndex].includes('.mp4') || mediaList[activeMediaIndex].includes('youtube') || mediaList[activeMediaIndex].includes('youtu.be')));
    const sideThumbnails = mediaList.slice(1, 5);

    const formatPriceDisplay = () => {
        if (!listing) return null;
        if (isLease) {
            const amt = Number(listing.bogithuAmount || 0);
            const yrs = listing.bogithuYears ? ` for ${listing.bogithuYears} Years` : '';
            return `₹${amt.toLocaleString('en-IN')}${yrs} (100% Refundable Lease)`;
        }
        if (isRent) {
            return `₹${Number(listing.rentAmount).toLocaleString('en-IN')} / month`;
        }
        if (listing.price && Number(listing.price) > 0) {
            return `₹${Number(listing.price).toLocaleString('en-IN')}`;
        }
        return null;
    };

    const displayPrice = formatPriceDisplay();

    return (
        <div className="realtor-detail-modal-overlay" onClick={onClose}>
            <div 
                className="realtor-detail-modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'relative' }}
            >
                {/* Modal Header Breadcrumbs Bar */}
                <div className="realtor-modal-header" style={{ padding: '14px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', sticky: 'top', zIndex: 10 }}>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                        Home / TN / South India / <span style={{ color: '#0f172a', fontWeight: 700 }}>{listing.district || listing.location || 'Erode'}</span> / {listing.name || listing.title || '18 BOONE CRESCENT'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button 
                            className="btn-realtor-filter" 
                            style={{ 
                                padding: '6px 14px', 
                                fontSize: '0.82rem', 
                                borderRadius: '20px',
                                background: '#0284c7',
                                color: '#ffffff',
                                border: '1px solid #0284c7',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 700
                            }}
                            onClick={(e) => {
                                if (onGetRoute) {
                                    onGetRoute(listing);
                                } else {
                                    openDirectionsToLocation(listing, e);
                                }
                            }}
                            title="Draw live driving route to this plot on the map"
                        >
                            <Compass size={15} /> In-App Route
                        </button>
                        <button 
                            className="btn-realtor-filter" 
                            style={{ 
                                padding: '6px 14px', 
                                fontSize: '0.82rem', 
                                borderRadius: '20px', 
                                cursor: 'pointer',
                                background: isCopied ? '#16a34a' : '#ffffff',
                                color: isCopied ? '#ffffff' : '#0f172a',
                                borderColor: isCopied ? '#16a34a' : '#cbd5e1',
                                transition: 'all 0.2s ease'
                            }}
                            onClick={handleShareClick}
                        >
                            {isCopied ? (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    ✓ Copied!
                                </>
                            ) : (
                                <>
                                    <Share2 size={14} /> Share
                                </>
                            )}
                        </button>
                        <button 
                            className="btn-realtor-filter" 
                            onClick={() => onToggleFavorite(listing.id)}
                            style={{ 
                                padding: '6px 14px', 
                                fontSize: '0.82rem', 
                                borderRadius: '20px', 
                                cursor: 'pointer',
                                color: isFavorite(listing.id) ? '#921214' : '#0f172a',
                                borderColor: isFavorite(listing.id) ? '#921214' : '#cbd5e1'
                            }}
                        >
                            <Heart size={14} fill={isFavorite(listing.id) ? "#921214" : "none"} /> Save
                        </button>
                        <button className="realtor-modal-close" onClick={onClose} style={{ marginLeft: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="realtor-modal-body" style={{ padding: '24px' }}>
                    {/* Header Address Title */}
                    <h1 className="realtor-detail-title" style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                        {listing.title || listing.name || listing.address || 'Property Details'}
                    </h1>

                    {/* Top Media Grid Layout */}
                    <div className="realtor-gallery-grid">
                        {/* Main Large Media */}
                        <div 
                            className="realtor-gallery-main" 
                            onClick={() => !isCurrentVideo && openLightbox(0)}
                            style={{ position: 'relative', cursor: isCurrentVideo ? 'default' : 'pointer' }}
                        >
                            {isCurrentVideo ? (
                                <UniversalVideoPlayer 
                                    url={currentMediaUrl} 
                                    autoPlay={true} 
                                    controls={true} 
                                    style={{ width: '100%', height: '100%', minHeight: '380px', borderRadius: '8px' }} 
                                />
                            ) : (
                                <img src={currentMediaUrl} alt={listing.name || "Property"} />
                            )}
                            
                            {/* Previous / Next Media Controls */}
                            {mediaList.length > 1 && !isCurrentVideo && (
                                <>
                                    <button 
                                        className="realtor-gallery-nav prev"
                                        onClick={handlePrevMedia}
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button 
                                        className="realtor-gallery-nav next"
                                        onClick={handleNextMedia}
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* 4 Small Side Thumbnails */}
                        {sideThumbnails.map((media, idx) => {
                            const mediaUrl = typeof media === 'string' ? media : (media.url || '');
                            const isVid = (typeof media === 'object' && media.type === 'video') || 
                                (typeof media === 'string' && (media.includes('.mp4') || media.includes('youtube') || media.includes('youtu.be')));
                            
                            return (
                                <div 
                                    key={idx} 
                                    className="realtor-gallery-thumb"
                                    style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden' }}
                                >
                                    {isVid ? (
                                        <div style={{ width: '100%', height: '100%', background: '#0f172a', position: 'relative' }}>
                                            <UniversalVideoPlayer url={mediaUrl} autoPlay={false} controls={true} style={{ width: '100%', height: '100%', borderRadius: '0' }} />
                                        </div>
                                    ) : (
                                        <img src={mediaUrl} alt={`Gallery ${idx + 1}`} onClick={() => openLightbox(idx + 1)} />
                                    )}

                                    {idx === 3 && mediaList.length > 5 && (
                                        <div className="realtor-gallery-overlay-badge" onClick={(e) => { e.stopPropagation(); openLightbox(4); }}>
                                            📷 +{mediaList.length - 5}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Main Content Layout */}
                    <div className="realtor-detail-split-container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', marginTop: '24px' }}>
                        {/* Left Details Panel */}
                        <div>
                            {/* Verification Badge */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: isLease ? '#7c3aed' : (isRent ? '#059669' : '#0284c7'), color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', marginBottom: '12px' }}>
                                <CheckCircle2 size={13} /> {isLease ? '📜 Verified Long-Term Lease' : (isRent ? '🔑 Verified Rental Property' : 'Verified Legal Property')}
                            </div>

                            {/* Price (ONLY if available) */}
                            {displayPrice && (
                                <div className="realtor-detail-price" style={{ fontSize: '2.4rem', fontWeight: '900', color: '#921214', margin: '0 0 6px 0' }}>
                                    {displayPrice}
                                </div>
                            )}

                            <p style={{ fontSize: '1.05rem', fontWeight: '600', color: '#334155', margin: '0 0 16px 0' }}>
                                {listing.displayAddress || listing.address || `${listing.area || 'Vijayamangalam'}, ${listing.district || 'Erode'}, Tamil Nadu`}
                            </p>

                            {/* Key Metrics Pill Grid */}
                            <div className="realtor-metrics-row" style={{ display: 'flex', gap: '24px', padding: '16px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 700 }}>BEDROOMS</span>
                                    <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{listing.beds || 3} Beds</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 700 }}>BATHROOMS</span>
                                    <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{listing.baths || 2} Baths</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 700 }}>PROPERTY SIZE</span>
                                    <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{listing.sqft || '1,500'} sqft</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 700 }}>TRANSACTION</span>
                                    <strong style={{ fontSize: '1.15rem', color: isLease ? '#7c3aed' : (isRent ? '#059669' : '#0284c7'), textTransform: 'capitalize' }}>{isLease ? 'Long-term Lease' : (isRent ? 'Rental' : 'For Sale')}</strong>
                                </div>
                            </div>

                            {/* Dedicated Lease Specifications Showcase Card */}
                            {isLease && (
                                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '18px', marginBottom: '24px' }}>
                                    <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: 800, color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        📜 Lease Terms & Specifications
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ede9fe' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>TOTAL LEASE AMOUNT</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#7c3aed' }}>₹{Number(listing.bogithuAmount || 0).toLocaleString('en-IN')}<span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#059669', display: 'block' }}>100% Refundable</span></strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ede9fe' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>LEASE TENURE</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.bogithuYears ? `${listing.bogithuYears} Years` : (listing.leaseDuration || '2 Years')}</strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ede9fe' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>MONTHLY RENT</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#059669' }}>₹0 (No Monthly Rent)</strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ede9fe' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>MAINTENANCE</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.maintenanceAmount && Number(listing.maintenanceAmount) > 0 ? `₹${Number(listing.maintenanceAmount).toLocaleString('en-IN')}/mo` : '₹0 (Nil / Included)'}</strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ede9fe' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>LOCK-IN PERIOD</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.lockInPeriod || '1 Year'}</strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ede9fe' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>REFUND NOTICE</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.noticePeriod || '2 Months'}</strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ede9fe' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>FURNISHING</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.furnishing || 'Semi-Furnished'}</strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ede9fe' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>AVAILABLE FROM</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.availableFrom || 'Immediate'}</strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ede9fe' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>PREFERRED OCCUPANTS</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.preferredTenants || 'Family / Bachelors'}</strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ede9fe' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>PARKING FACILITY</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.parking || 'Car & Bike Parking'}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Dedicated Rental Specifications Showcase Card */}
                            {isRent && (
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '18px', marginBottom: '24px' }}>
                                    <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        🔑 Rental Terms & Property Information
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>MONTHLY RENT</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#15803d' }}>₹{Number(listing.rentAmount || 0).toLocaleString('en-IN')}<span style={{ fontSize: '0.75rem', fontWeight: 500 }}>/mo</span></strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>SECURITY ADVANCE</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.depositAmount ? `₹${Number(listing.depositAmount).toLocaleString('en-IN')}` : 'Advance on Request'}</strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>MAINTENANCE</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.maintenanceAmount && Number(listing.maintenanceAmount) > 0 ? `₹${Number(listing.maintenanceAmount).toLocaleString('en-IN')}/mo` : 'Included in Rent'}</strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>FURNISHING</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.furnishing || 'Semi-Furnished'}</strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>AVAILABLE FROM</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.availableFrom || 'Immediate'}</strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>PREFERRED TENANTS</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.preferredTenants || 'Family / Bachelors'}</strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>LEASE DURATION</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.leaseDuration || '11 Months'}</strong>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>PARKING FACILITY</span>
                                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{listing.parking || 'Car & Bike Parking'}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>Property Description</h3>
                            <p style={{ fontSize: '0.95rem', lineHeight: '1.7', color: '#475569', marginBottom: '24px', whiteSpace: 'pre-line' }}>
                                {listing.description || (
                                    isLease
                                        ? 'Prime residential property available for long-term lease. Upfront lump sum deposit is 100% refundable to the tenant upon vacating. Zero monthly rent, independent water/EB facilities, and immediate peaceful occupancy.'
                                        : isRent
                                            ? 'Well-maintained rental property located in prime residential locality with 24/7 water supply, separate electricity sub-meter, clear road access, peaceful family surroundings, and immediate occupancy.'
                                            : 'Stunning legal-verified residential property in high-demand location with clear parent document title tracing, 30-year EC verification, approved DTCP layout plan, clear road connectivity, and immediate registration suitability.'
                                )}
                            </p>

                            {/* Verification & Legal Highlights */}
                            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>
                                {isLease ? 'Lease & Living Highlights' : (isRent ? 'Rental & Living Highlights' : 'Legal & Property Highlights')}
                            </h3>
                            <div className="realtor-legal-highlights-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
                                {(isLease ? [
                                    '100% Refundable Lease Deposit',
                                    'Zero Monthly Rent (Only Maintenance if any)',
                                    'Standard Registered Lease Agreement',
                                    '24/7 Borewell & Drinking Water Supply',
                                    'Individual Electricity Sub-Meter Connection',
                                    'Direct Landlord Handover & Agreement'
                                ] : isRent ? [
                                    '24/7 Borewell / Cauvery Water Supply',
                                    'Individual Electricity Sub-Meter',
                                    'Direct Owner Contact (No Brokerage)',
                                    'Peaceful & Safe Residential Colony',
                                    'Standard 11-Month Rental Agreement',
                                    'Immediate Handover / Ready to Move'
                                ] : [
                                    '100% Parent Title Verification',
                                    'Encumbrance Certificate (EC) Clear',
                                    'DTCP / CMDA Approved Layout',
                                    'Patta & Chitta Transfer Assistance',
                                    'Clear Water & Power Supply Line',
                                    'Immediate Sub-Registrar Booking'
                                ]).map((feat, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#334155' }}>
                                        <CheckCircle2 size={18} color={isLease ? "#7c3aed" : "#00a2bb"} /> {feat}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Sidebar Request Showing CTA */}
                        <div>
                            <div className="realtor-cta-card">
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                                    {isLease ? 'Interested in leasing this property?' : (isRent ? 'Interested in renting this property?' : 'Interested in touring this property?')}
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
                                    {isLease ? 'Connect directly with the property owner to inspect the property or discuss lease agreement terms.' : (isRent ? 'Connect directly with the property owner to schedule a house visit or discuss rental terms.' : 'Connect directly with the Property Docks verified representative or owner for a walkthrough.')}
                                </p>

                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                                        {listing.contactName || 'Verified Owner / Landlord'}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#921214', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Phone size={14} /> {listing.contactPhone || '+91 98765 43210'}
                                    </p>
                                </div>
                                
                                <button 
                                    className="btn-request-showing"
                                    onClick={() => onRequestShowing(listing)}
                                    style={{ width: '100%', marginBottom: '10px', background: isLease ? '#7c3aed' : undefined }}
                                >
                                    {isLease ? 'Request a Lease Visit / Inspection' : (isRent ? 'Request a Rental Visit / Showing' : 'Request a showing')}
                                </button>

                                <button 
                                    onClick={(e) => {
                                        if (onGetRoute) {
                                            onGetRoute(listing);
                                        } else {
                                            openDirectionsToLocation(listing, e);
                                        }
                                    }}
                                    style={{ 
                                        width: '100%', 
                                        marginBottom: '10px',
                                        padding: '12px', 
                                        background: '#0284c7', 
                                        color: '#ffffff',
                                        border: 'none', 
                                        borderRadius: '8px', 
                                        fontWeight: 700, 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '8px',
                                        fontSize: '0.9rem',
                                        boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                                    }}
                                    title="Draw in-app driving route from your location to this plot on the map"
                                >
                                    <Compass size={18} /> 🧭 View Driving Route on Map
                                </button>

                                <button 
                                    onClick={() => onToggleFavorite(listing.id)}
                                    style={{ width: '100%', padding: '12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: isFavorite(listing.id) ? '#921214' : '#334155' }}
                                >
                                    <Heart size={18} fill={isFavorite(listing.id) ? '#921214' : 'none'} color={isFavorite(listing.id) ? '#921214' : '#64748b'} />
                                    {isFavorite(listing.id) ? 'Saved in Browser Favorites' : 'Save to Favorites (No Login Required)'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FULL-SCREEN LIGHTBOX GALLERY MODAL */}
            {lightboxOpen && (
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                    onClick={() => setLightboxOpen(false)}
                >
                    {/* Top Lightbox Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'rgba(0,0,0,0.5)', color: '#ffffff', zIndex: 10 }} onClick={(e) => e.stopPropagation()}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            📷 {activeMediaIndex + 1} of {mediaList.length} Photos & Videos — {listing.title || listing.name}
                        </span>
                        <button 
                            onClick={() => setLightboxOpen(false)} 
                            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '6px' }}
                        >
                            <X size={28} />
                        </button>
                    </div>

                    {/* Main Stage Stage */}
                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
                        {/* Prev Arrow */}
                        <button 
                            onClick={handlePrevMedia}
                            style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20 }}
                        >
                            <ChevronLeft size={28} />
                        </button>

                        {/* Stage Content */}
                        <div style={{ width: '90%', maxWidth: '960px', maxHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {mediaList[activeMediaIndex] && ((typeof mediaList[activeMediaIndex] === 'object' && mediaList[activeMediaIndex].type === 'video') || (typeof mediaList[activeMediaIndex] === 'string' && (mediaList[activeMediaIndex].includes('.mp4') || mediaList[activeMediaIndex].includes('youtube') || mediaList[activeMediaIndex].includes('youtu.be')))) ? (
                                <div style={{ width: '100%', minHeight: '400px', maxHeight: '75vh' }}>
                                    <UniversalVideoPlayer 
                                        url={typeof mediaList[activeMediaIndex] === 'string' ? mediaList[activeMediaIndex] : mediaList[activeMediaIndex].url} 
                                        controls 
                                        autoPlay 
                                        style={{ width: '100%', height: '100%', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
                                    />
                                </div>
                            ) : (
                                <img 
                                    src={typeof mediaList[activeMediaIndex] === 'string' ? mediaList[activeMediaIndex] : mediaList[activeMediaIndex]?.url || defaultFallbackImages[0]} 
                                    alt="Preview" 
                                    style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
                                />
                            )}
                        </div>

                        {/* Next Arrow */}
                        <button 
                            onClick={handleNextMedia}
                            style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20 }}
                        >
                            <ChevronRight size={28} />
                        </button>
                    </div>

                    {/* Bottom Scrollable Thumbnails Carousel */}
                    <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.8)', display: 'flex', gap: '10px', overflowX: 'auto', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {mediaList.map((item, idx) => {
                            const mediaUrl = typeof item === 'string' ? item : item.url;
                            const isActive = idx === activeMediaIndex;
                            return (
                                <div 
                                    key={idx}
                                    onClick={() => setActiveMediaIndex(idx)}
                                    style={{ 
                                        width: '70px', 
                                        height: '50px', 
                                        borderRadius: '4px', 
                                        overflow: 'hidden', 
                                        border: isActive ? '2px solid #00a2bb' : '2px solid transparent', 
                                        opacity: isActive ? 1 : 0.6,
                                        cursor: 'pointer',
                                        flexShrink: 0
                                    }}
                                >
                                    <img src={mediaUrl} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
