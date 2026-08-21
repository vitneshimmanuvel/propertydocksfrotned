import React, { useState } from 'react';
import { 
    ChevronDown, 
    Heart, 
    Bookmark, 
    User,
    ShieldCheck,
    Phone
} from 'lucide-react';
import PropertyDocksLogo from './PropertyDocksLogo';

export default function Header({ 
    theme, 
    setTheme, 
    mapData, 
    showToast, 
    role, 
    setRole, 
    favoritesCount = 0, 
    onOpenAuth,
    onGoHome,
    onOpenFavorites,
    propertyTab = 'residential',
    onSelectTab,
    hideSubnav = false
}) {
    const [language, setLanguage] = useState('EN');
    const [activeSubnav, setActiveSubnav] = useState('find-home');

    const handleHomeClick = () => {
        setActiveSubnav('find-home');
        if (onGoHome) onGoHome();
    };

    return (
        <header style={{ display: 'flex', flexDirection: 'column', padding: 0, height: 'auto', border: 'none' }}>
            {/* Top Red Header Bar (#921214) — Full Width */}
            <div className="realtor-header">
                {/* Official Vector Logo */}
                <div 
                    className="realtor-logo-box" 
                    onClick={handleHomeClick} 
                    style={{ background: '#ffffff', padding: '6px 14px', borderRadius: '6px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', cursor: 'pointer' }}
                >
                    <PropertyDocksLogo height={36} />
                </div>


                <div className="realtor-top-actions">
                    <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                        onClick={() => setLanguage(prev => prev === 'EN' ? 'FR' : 'EN')}
                    >
                        <span style={{ background: language === 'EN' ? 'rgba(255,255,255,0.25)' : 'transparent', padding: '2px 6px', borderRadius: '3px' }}>EN</span>
                        <span style={{ background: language === 'FR' ? 'rgba(255,255,255,0.25)' : 'transparent', padding: '2px 6px', borderRadius: '3px' }}>FR</span>
                    </div>
                </div>
            </div>

            {!hideSubnav && (
                <div className="realtor-subnav">
                <div className="realtor-subnav-links" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                        className={`realtor-subnav-item ${activeSubnav === 'find-home' ? 'active' : ''}`}
                        onClick={handleHomeClick}
                    >
                        <span>Find a Home</span>
                    </div>

                    <div 
                        onClick={() => {
                            setActiveSubnav('residential');
                            if (onSelectTab) onSelectTab('residential');
                        }}
                        style={{
                            cursor: 'pointer',
                            padding: '4px 14px',
                            borderRadius: '16px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            background: propertyTab === 'residential' ? 'rgba(146, 18, 20, 0.08)' : 'transparent',
                            color: propertyTab === 'residential' ? '#921214' : 'var(--text-secondary)',
                            border: propertyTab === 'residential' ? '1px solid rgba(146, 18, 20, 0.3)' : '1px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span>🏠 Residential</span>
                    </div>

                    <div 
                        onClick={() => {
                            setActiveSubnav('commercial');
                            if (onSelectTab) onSelectTab('commercial');
                        }}
                        style={{
                            cursor: 'pointer',
                            padding: '4px 14px',
                            borderRadius: '16px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            background: propertyTab === 'commercial' ? '#921214' : 'transparent',
                            color: propertyTab === 'commercial' ? '#ffffff' : 'var(--text-secondary)',
                            border: propertyTab === 'commercial' ? '1px solid #921214' : '1px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span>🏢 Commercial</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                        title="Saved Searches"
                        onClick={() => { showToast && showToast("Showing saved searches", "info"); }}
                    >
                        <Bookmark size={20} color="#00a2bb" />
                    </button>

                    <button 
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', position: 'relative' }}
                        title="Favorites"
                        onClick={onOpenFavorites}
                    >
                        <Heart size={20} color="#921214" fill={favoritesCount > 0 ? "#921214" : "none"} />
                        {favoritesCount > 0 && (
                            <span style={{ position: 'absolute', top: '-4px', right: '-6px', background: '#921214', color: '#fff', fontSize: '0.65rem', fontWeight: 800, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {favoritesCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>
            )}
        </header>
    );
}
