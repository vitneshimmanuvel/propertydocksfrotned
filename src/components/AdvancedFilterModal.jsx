import React from 'react';
import { X, RotateCcw, Search, Calendar } from 'lucide-react';

export default function AdvancedFilterModal({ isOpen, onClose, filters, setFilters, onApplyFilters, onResetFilters }) {
    if (!isOpen) return null;

    return (
        <div className="realtor-detail-modal-overlay" onClick={onClose}>
            <div 
                className="realtor-detail-modal-content" 
                style={{ maxWidth: '920px', padding: '0', overflow: 'hidden' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Residential / Commercial Header Tabs */}
                <div style={{ background: '#f8fafc', padding: '16px 24px 0 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                            className={`realtor-type-tab ${filters.tab === 'residential' ? 'residential' : 'inactive'}`}
                            onClick={() => setFilters(prev => ({ ...prev, tab: 'residential' }))}
                        >
                            🏠 Residential
                        </button>
                        <button 
                            className={`realtor-type-tab ${filters.tab === 'commercial' ? 'commercial' : 'inactive'}`}
                            onClick={() => setFilters(prev => ({ ...prev, tab: 'commercial' }))}
                        >
                            🏢 Commercial
                        </button>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '8px' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '24px', maxHeight: '78vh', overflowY: 'auto' }}>
                    {/* Top Search Field */}
                    <div style={{ marginBottom: '24px', position: 'relative' }}>
                        <input 
                            type="text" 
                            className="realtor-input" 
                            placeholder="City, Neighbourhood, Address or MLS® number"
                            value={filters.query || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                            style={{ paddingRight: '40px', fontSize: '1rem', height: '48px', borderRadius: '24px' }}
                        />
                        {filters.query && (
                            <button 
                                onClick={() => setFilters(prev => ({ ...prev, query: '' }))}
                                style={{ position: 'absolute', right: '16px', top: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* Form Controls Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px 20px', marginBottom: '20px' }}>
                        
                        {/* Transaction Type */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
                                Transaction Type
                            </label>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                {['for_sale', 'for_rent', 'sold'].map(type => (
                                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                                        <input 
                                            type="radio" 
                                            name="transType" 
                                            checked={filters.transactionType === type}
                                            onChange={() => setFilters(prev => ({ ...prev, transactionType: type }))}
                                            style={{ accentColor: '#921214' }}
                                        />
                                        {type === 'for_sale' ? 'For sale' : type === 'for_rent' ? 'For rent' : 'Sold'}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Property Type */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
                                Property Type
                            </label>
                            <select 
                                className="realtor-select"
                                value={filters.propertyType || 'any'}
                                onChange={(e) => setFilters(prev => ({ ...prev, propertyType: e.target.value }))}
                            >
                                <option value="any">Any</option>
                                <option value="house">Single Family House</option>
                                <option value="apartment">Apartment / Condo</option>
                                <option value="townhouse">Townhouse</option>
                                <option value="plot">Land / Residential Plot</option>
                                <option value="commercial">Commercial Space</option>
                            </select>
                        </div>

                        {/* Price Range */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
                                Price Range
                            </label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select 
                                    className="realtor-select"
                                    value={filters.minPrice || ''}
                                    onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                                >
                                    <option value="">No min</option>
                                    <option value="1000000">₹10 Lakhs</option>
                                    <option value="2500000">₹25 Lakhs</option>
                                    <option value="5000000">₹50 Lakhs</option>
                                    <option value="7500000">₹75 Lakhs</option>
                                    <option value="10000000">₹1 Crore</option>
                                    <option value="20000000">₹2 Crores</option>
                                </select>
                                <span style={{ color: '#94a3b8' }}>-</span>
                                <select 
                                    className="realtor-select"
                                    value={filters.maxPrice || ''}
                                    onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                                >
                                    <option value="">No max</option>
                                    <option value="2500000">₹25 Lakhs</option>
                                    <option value="5000000">₹50 Lakhs</option>
                                    <option value="7500000">₹75 Lakhs</option>
                                    <option value="10000000">₹1 Crore</option>
                                    <option value="20000000">₹2 Crores</option>
                                    <option value="50000000">₹5 Crores+</option>
                                </select>
                            </div>
                        </div>

                        {/* Bedrooms */}
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
                                Beds
                            </label>
                            <select 
                                className="realtor-select"
                                value={filters.beds || 'any'}
                                onChange={(e) => setFilters(prev => ({ ...prev, beds: e.target.value }))}
                            >
                                <option value="any">Any</option>
                                <option value="1">1+</option>
                                <option value="2">2+</option>
                                <option value="3">3+</option>
                                <option value="4">4+</option>
                                <option value="5">5+</option>
                            </select>
                        </div>

                        {/* Bathrooms */}
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
                                Baths
                            </label>
                            <select 
                                className="realtor-select"
                                value={filters.baths || 'any'}
                                onChange={(e) => setFilters(prev => ({ ...prev, baths: e.target.value }))}
                            >
                                <option value="any">Any</option>
                                <option value="1">1+</option>
                                <option value="2">2+</option>
                                <option value="3">3+</option>
                                <option value="4">4+</option>
                            </select>
                        </div>

                        {/* Square Footage */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
                                Square Footage
                            </label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select className="realtor-select" value={filters.minSqft || ''} onChange={(e) => setFilters(prev => ({ ...prev, minSqft: e.target.value }))}>
                                    <option value="">No min</option>
                                    <option value="1000">1000 sqft</option>
                                    <option value="1500">1500 sqft</option>
                                    <option value="2000">2000 sqft</option>
                                    <option value="3000">3000 sqft</option>
                                </select>
                                <span style={{ color: '#94a3b8' }}>-</span>
                                <select className="realtor-select" value={filters.maxSqft || ''} onChange={(e) => setFilters(prev => ({ ...prev, maxSqft: e.target.value }))}>
                                    <option value="">No max</option>
                                    <option value="2000">2000 sqft</option>
                                    <option value="3500">3500 sqft</option>
                                    <option value="5000">5000+ sqft</option>
                                </select>
                            </div>
                        </div>

                        {/* Land Size */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
                                Land Size
                            </label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select className="realtor-select" value={filters.minLand || ''} onChange={(e) => setFilters(prev => ({ ...prev, minLand: e.target.value }))}>
                                    <option value="">No min</option>
                                    <option value="1200">1,200 sqft</option>
                                    <option value="2400">2,400 sqft</option>
                                    <option value="5000">0.5 Acre</option>
                                </select>
                                <span style={{ color: '#94a3b8' }}>-</span>
                                <select className="realtor-select" value={filters.maxLand || ''} onChange={(e) => setFilters(prev => ({ ...prev, maxLand: e.target.value }))}>
                                    <option value="">No max</option>
                                    <option value="5000">5,000 sqft</option>
                                    <option value="10000">1 Acre+</option>
                                </select>
                            </div>
                        </div>

                        {/* Listed Since */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
                                Listed Since
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="date" 
                                    className="realtor-input" 
                                    value={filters.listedSince || ''}
                                    onChange={(e) => setFilters(prev => ({ ...prev, listedSince: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Ownership / Title */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
                                Ownership / Title
                            </label>
                            <select className="realtor-select" value={filters.ownership || 'any'} onChange={(e) => setFilters(prev => ({ ...prev, ownership: e.target.value }))}>
                                <option value="any">Any</option>
                                <option value="freehold">Freehold</option>
                                <option value="condo">Condominium</option>
                                <option value="leasehold">Leasehold</option>
                            </select>
                        </div>

                        {/* Keywords */}
                        <div style={{ gridColumn: 'span 4' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
                                Keywords
                            </label>
                            <input 
                                type="text" 
                                className="realtor-input" 
                                placeholder="Waterfront, Garage, Pool, Gated..." 
                                value={filters.keywords || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, keywords: e.target.value }))}
                            />
                        </div>

                        {/* Checkboxes */}
                        <div style={{ gridColumn: 'span 4', display: 'flex', gap: '24px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={!!filters.openHousesOnly} 
                                    onChange={(e) => setFilters(prev => ({ ...prev, openHousesOnly: e.target.checked }))}
                                    style={{ width: '18px', height: '18px', accentColor: '#00a2bb' }}
                                />
                                Open Houses Only
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={!!filters.liveStreamsOnly} 
                                    onChange={(e) => setFilters(prev => ({ ...prev, liveStreamsOnly: e.target.checked }))}
                                    style={{ width: '18px', height: '18px', accentColor: '#00a2bb' }}
                                />
                                Live Streams Only
                            </label>
                        </div>

                    </div>
                </div>

                {/* Footer Buttons */}
                <div style={{ background: '#f8fafc', padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button 
                        onClick={onResetFilters}
                        style={{ background: '#e2e8f0', border: 'none', padding: '10px 18px', borderRadius: '20px', fontWeight: 600, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <RotateCcw size={16} /> Reset
                    </button>

                    <button 
                        onClick={() => { onApplyFilters(); onClose(); }}
                        className="btn-realtor-search"
                        style={{ padding: '12px 36px', borderRadius: '24px' }}
                    >
                        Search
                    </button>
                </div>
            </div>
        </div>
    );
}
