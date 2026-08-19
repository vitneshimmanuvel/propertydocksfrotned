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

export default function PropertyDetailModal({ listing, isOpen, onClose, onToggleFavorite, isFavorite, onRequestShowing, onCopyLink }) {
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
            const shareUrl = `${window.location.origin}${window.location.pathname}?property=${encodeURIComponent(listing.id)}`;
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

    const displayPrice = listing.isOwnerListing 
        ? (listing.category === 'bogithu' ? `₹${Number(listing.bogithuAmount || 1500000).toLocaleString('en-IN')}` : `₹${Number(listing.rentAmount || 25000).toLocaleString('en-IN')}`)
        : `₹${Number(listing.price || 4500000).toLocaleString('en-IN')}`;

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
                        <button className="btn-realtor-filter" style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: '20px' }}>
                            <Compass size={14} /> Directions
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
                                    <Share2 size={14} /> Copy Share Link
                                </>
                            )}
                        </button>
                        <button 
                            onClick={onClose} 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', marginLeft: '4px' }}
                        >
                            <X size={22} />
                        </button>
                    </div>
                </div>

                <div className="realtor-modal-body" style={{ padding: '24px' }}>
                    {/* Header Address Title */}
                    <h1 className="realtor-detail-title" style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                        {listing.title || listing.name || listing.address || '18 BOONE CRESCENT'}
                    </h1>

                    {/* 5-Photo Gallery Grid matching user's screenshot */}
                    <div className="realtor-gallery-grid">
                        <div className="realtor-gallery-main" style={{ cursor: 'pointer', position: 'relative' }}>
                            {mediaList[0] && (typeof mediaList[0] === 'object' && mediaList[0].type === 'video' || (typeof mediaList[0] === 'string' && (mediaList[0].includes('.mp4') || mediaList[0].includes('youtube') || mediaList[0].includes('youtu.be')))) ? (
                                <UniversalVideoPlayer url={typeof mediaList[0] === 'string' ? mediaList[0] : mediaList[0].url} autoPlay={false} controls={true} style={{ borderRadius: '0' }} />
                            ) : (
                                <img src={mediaList[0] ? (typeof mediaList[0] === 'string' ? mediaList[0] : mediaList[0].url) : defaultFallbackImages[0]} alt={listing.name} onClick={() => openLightbox(0)} />
                            )}
                        </div>

                        {mediaList.slice(1, 5).map((item, idx) => {
                            const mediaUrl = typeof item === 'string' ? item : item.url;
                            const isVid = (typeof item === 'object' && item.type === 'video') || (typeof item === 'string' && (item.includes('.mp4') || item.includes('youtube') || item.includes('youtu.be')));
                            return (
                                <div 
                                    key={idx} 
                                    className="realtor-gallery-item" 
                                    style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden' }}
                                >
                                    {isVid ? (
                                        <div style={{ width: '100%', height: '100%', background: '#0f172a', position: 'relative' }}>
                                            <UniversalVideoPlayer url={mediaUrl} autoPlay={false} controls={true} style={{ width: '100%', height: '100%', borderRadius: '0' }} />
                                        </div>
                                    ) : (
                                        <img src={mediaUrl} alt={`Gallery ${idx + 1}`} onClick={() => openLightbox(idx + 1)} />
                                    )}

                                    {idx === 3 && (
                                        <div className="realtor-gallery-overlay-badge" onClick={(e) => { e.stopPropagation(); openLightbox(0); }}>
                                            📷 +{mediaList.length > 5 ? mediaList.length - 5 + 34 : 38}
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
                            {/* Listed Time Badge */}
                            <div style={{ display: 'inline-block', background: '#475569', color: '#ffffff', fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: '4px', marginBottom: '12px' }}>
                                {listing.listedAgo || '8 hours ago'} • Verified Property
                            </div>

                            {/* Price */}
                            <div className="realtor-detail-price" style={{ fontSize: '2.4rem', fontWeight: '900', color: '#921214', margin: '0 0 6px 0' }}>
                                {displayPrice}
                            </div>

                            <p style={{ fontSize: '1.05rem', fontWeight: '600', color: '#334155', margin: '0 0 16px 0' }}>
                                {listing.displayAddress || listing.address || `${listing.area || 'Vijayamangalam'}, ${listing.district || 'Erode'}, Tamil Nadu`}
                            </p>

                            {/* Key Metrics Pill Grid */}
                            <div className="realtor-metrics-row" style={{ display: 'flex', gap: '24px', padding: '16px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', flexWrap: 'wrap' }}>
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
                                    <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{listing.sqft || '2,400'} sqft</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 700 }}>TYPE</span>
                                    <strong style={{ fontSize: '1.15rem', color: '#0f172a', textTransform: 'capitalize' }}>{listing.category ? listing.category.replace('_', ' ') : 'Single Family'}</strong>
                                </div>
                            </div>

                            {/* Description */}
                            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>Property Description</h3>
                            <p style={{ fontSize: '0.95rem', lineHeight: '1.7', color: '#475569', marginBottom: '24px' }}>
                                {listing.description || 'Stunning legal-verified residential property in high-demand location with clear parent document title tracing, 30-year EC verification, approved DTCP layout plan, clear road connectivity, and immediate registration suitability.'}
                            </p>

                            {/* Verification & Legal Highlights */}
                            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>Legal & Property Highlights</h3>
                            <div className="realtor-legal-highlights-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
                                {[
                                    '100% Parent Title Verification',
                                    'Encumbrance Certificate (EC) Clear',
                                    'DTCP / CMDA Approved Layout',
                                    'Patta & Chitta Transfer Assistance',
                                    'Clear Water & Power Supply Line',
                                    'Immediate Sub-Registrar Booking'
                                ].map((feat, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#334155' }}>
                                        <CheckCircle2 size={18} color="#00a2bb" /> {feat}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Sidebar Request Showing CTA */}
                        <div>
                            <div className="realtor-cta-card">
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                                    Interested in touring this property?
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
                                    Connect directly with the Property Docks verified representative or owner for a walkthrough.
                                </p>

                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                                        {listing.contactName || 'Verified Owner'}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#921214', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Phone size={14} /> {listing.contactPhone || '+91 98765 43210'}
                                    </p>
                                </div>
                                
                                <button 
                                    className="btn-request-showing"
                                    onClick={() => onRequestShowing(listing)}
                                    style={{ width: '100%', marginBottom: '12px' }}
                                >
                                    Request a showing
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
