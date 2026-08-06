import React from 'react';

export function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0` : null;
}

export function getVimeoEmbedUrl(url) {
    if (!url) return null;
    const match = url.match(/vimeo\.com\/(?:.*\/)?([0-9]+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1` : null;
}

export default function UniversalVideoPlayer({ 
    url, 
    style = {}, 
    autoPlay = false, 
    controls = true, 
    muted = false, 
    loop = false,
    className = "" 
}) {
    if (!url) return null;

    const ytUrl = getYouTubeEmbedUrl(url);
    if (ytUrl) {
        return (
            <iframe 
                src={ytUrl} 
                title="Video Player" 
                className={className}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', minHeight: '180px', ...style }} 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen 
            />
        );
    }

    const vimeoUrl = getVimeoEmbedUrl(url);
    if (vimeoUrl) {
        return (
            <iframe 
                src={vimeoUrl} 
                title="Video Player" 
                className={className}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', minHeight: '180px', ...style }} 
                allow="autoplay; fullscreen; picture-in-picture" 
                allowFullScreen 
            />
        );
    }

    // Direct MP4 / WebM / Cloudinary Video
    return (
        <video 
            src={url} 
            controls={controls} 
            autoPlay={autoPlay} 
            muted={muted}
            loop={loop}
            playsInline 
            preload="metadata"
            className={className}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', ...style }} 
        />
    );
}
