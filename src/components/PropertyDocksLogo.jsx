import React from 'react';

export default function PropertyDocksLogo({ width = 'auto', height = 60, className = "" }) {
    return (
        <svg 
            viewBox="0 0 360 200" 
            width={width} 
            height={height} 
            className={className} 
            style={{ 
                height: typeof height === 'number' ? `${height}px` : height, 
                width: typeof width === 'number' ? `${width}px` : width, 
                maxWidth: '100%',
                display: 'block', 
                objectFit: 'contain' 
            }}
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Left Red Wing Accent */}
            <path d="M 70 115 L 115 95 L 115 132 Z" fill="#e6282b" />

            {/* Right Red Wing Accent */}
            <path d="M 290 115 L 245 95 L 245 132 Z" fill="#e6282b" />

            {/* Main Deep Navy Gable Roof */}
            <path d="M 180 28 L 255 82 L 240 82 L 180 38 L 120 82 L 105 82 Z" fill="#1e295b" />

            {/* Chimney */}
            <rect x="130" y="42" width="12" height="24" fill="#1e295b" />

            {/* 4-Pane Grid Window inside Roof Peak */}
            <rect x="170" y="52" width="20" height="20" fill="#ffffff" rx="1.5" />
            <line x1="180" y1="52" x2="180" y2="72" stroke="#1e295b" strokeWidth="2.2" />
            <line x1="170" y1="62" x2="190" y2="62" stroke="#1e295b" strokeWidth="2.2" />

            {/* Building Archway & Structure Body */}
            <path d="M 124 82 L 236 82 L 236 122 L 222 122 L 222 100 L 208 100 L 208 122 L 194 122 L 194 106 L 166 106 L 166 122 L 152 122 L 152 100 L 138 100 L 138 122 L 124 122 Z" fill="#1e295b" />

            {/* Text: PROPERTY DOCKS */}
            <text 
                x="180" 
                y="172" 
                fontFamily="'Outfit', 'Inter', 'Montserrat', sans-serif" 
                fontWeight="900" 
                fontSize="29" 
                fill="#1e295b" 
                textAnchor="middle" 
                letterSpacing="2.5"
            >
                PROPERTY DOCKS
            </text>
        </svg>
    );
}
