import React, { useState } from 'react';

export function getYouTubeEmbedUrl(url, autoPlay = false) {
    if (!url) return null;
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regExp);
    if (!match || !match[1]) return null;

    const videoId = match[1];
    const autoPlayParam = autoPlay ? 'autoplay=1&mute=1' : 'autoplay=0';
    return `https://www.youtube.com/embed/${videoId}?${autoPlayParam}&rel=0&modestbranding=1`;
}

export function getVimeoEmbedUrl(url, autoPlay = false) {
    if (!url) return null;
    const match = url.match(/vimeo\.com\/(?:.*\/)?([0-9]+)/);
    if (!match || !match[1]) return null;
    const autoPlayParam = autoPlay ? 'autoplay=1&muted=1' : 'autoplay=0';
    return `https://player.vimeo.com/video/${match[1]}?${autoPlayParam}`;
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
    const [hasError, setHasError] = useState(false);

    if (!url) return null;

    // Handle relative uploads URLs (e.g., /uploads/video.mp4)
    const normalizedUrl = (url.startsWith('/uploads/') || url.startsWith('uploads/'))
        ? `http://localhost:5000/${url.replace(/^\//, '')}`
        : url;

    const ytUrl = getYouTubeEmbedUrl(normalizedUrl, autoPlay);
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

    const vimeoUrl = getVimeoEmbedUrl(normalizedUrl, autoPlay);
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

    // Direct MP4 / WebM / HTML5 Video with error fallback
    if (hasError) {
        return (
            <iframe 
                src="https://www.youtube.com/embed/7X8II6J-6mU?autoplay=0&rel=0" 
                title="Property Video Tour Fallback" 
                className={className}
                loading="lazy"
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', minHeight: '180px', ...style }} 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen 
            />
        );
    }

    return (
        <video 
            src={normalizedUrl} 
            controls={controls} 
            autoPlay={autoPlay} 
            muted={autoPlay ? true : muted}
            loop={loop}
            playsInline 
            preload={preload}
            onError={() => setHasError(true)}
            className={className}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', ...style }} 
        />
    );
}
