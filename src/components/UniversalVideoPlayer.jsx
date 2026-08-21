import React from 'react';

export function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?autoplay=1&mute=1&rel=0` : null;
}

export function getVimeoEmbedUrl(url) {
    if (!url) return null;
    const match = url.match(/vimeo\.com\/(?:.*\/)?([0-9]+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1&muted=1` : null;
}

export function getGoogleDriveEmbedUrl(url) {
    if (!url) return null;
    if (url.includes('drive.google.com')) {
        return url.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
    }
    return null;
}

export default function UniversalVideoPlayer({ 
    url, 
    style = {}, 
    autoPlay = false, 
    controls = true, 
    muted = false, 
    loop = false,
    className = "",
    preload = "none"
}) {
    if (!url) return null;

    // Handle relative uploads URLs (e.g., /uploads/video.mp4)
    const normalizedUrl = (url.startsWith('/uploads/') || url.startsWith('uploads/'))
        ? `http://localhost:5000/${url.replace(/^\//, '')}`
        : url;

    const ytUrl = getYouTubeEmbedUrl(normalizedUrl);
    if (ytUrl) {
        return (
            <iframe 
                src={ytUrl} 
                title="Property Video Tour" 
                className={className}
                loading="lazy"
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', minHeight: '180px', ...style }} 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen 
            />
        );
    }

    const vimeoUrl = getVimeoEmbedUrl(normalizedUrl);
    if (vimeoUrl) {
        return (
            <iframe 
                src={vimeoUrl} 
                title="Property Video Tour" 
                className={className}
                loading="lazy"
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', minHeight: '180px', ...style }} 
                allow="autoplay; fullscreen; picture-in-picture" 
                allowFullScreen 
            />
        );
    }

    const driveUrl = getGoogleDriveEmbedUrl(normalizedUrl);
    if (driveUrl) {
        return (
            <iframe 
                src={driveUrl} 
                title="Property Video Tour" 
                className={className}
                loading="lazy"
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', minHeight: '180px', ...style }} 
                allow="autoplay" 
                allowFullScreen 
            />
        );
    }

    // Direct MP4 / WebM / HTML5 Video
    return (
        <video 
            src={normalizedUrl} 
            controls={controls} 
            autoPlay={autoPlay} 
            muted={autoPlay ? true : muted}
            loop={loop}
            playsInline 
            preload={preload}
            className={className}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', ...style }} 
        />
    );
}
