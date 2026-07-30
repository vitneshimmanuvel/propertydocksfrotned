import React from 'react';

export default function PropertyDocksLogo({ width = 180, height = 50, className = "" }) {
  return (
    <img 
      src="/Gemini_Generated_Image_jfbya2jfbya2jfby.png" 
      alt="Property Docks Logo" 
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: 'auto', objectFit: 'contain' }}
      className={className}
    />
  );
}
