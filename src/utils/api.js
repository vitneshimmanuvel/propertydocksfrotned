/**
 * Property Docs API Client
 * Replaces localStorage with REST API calls to the Express backend
 */

const RAW_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE = RAW_BASE ? `${RAW_BASE}/api` : '/api';

async function apiRequest(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options
    };

    const response = await fetch(url, config);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API Error ${response.status}`);
    }
    return response.json();
}

// --- Full Database (for initial load & migration) ---
export async function fetchDatabase() {
    return apiRequest('/database');
}

export async function saveFullDatabase(data) {
    return apiRequest('/database', {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

// --- Layouts ---
export async function fetchLayouts() {
    return apiRequest('/layouts');
}

export async function fetchLayout(id) {
    return apiRequest(`/layouts/${encodeURIComponent(id)}`);
}

export async function createLayout(layout) {
    return apiRequest('/layouts', {
        method: 'POST',
        body: JSON.stringify(layout)
    });
}

export async function updateLayout(id, layout) {
    return apiRequest(`/layouts/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(layout)
    });
}

export async function deleteLayout(id) {
    return apiRequest(`/layouts/${encodeURIComponent(id)}`, {
        method: 'DELETE'
    });
}

// --- Bookings ---
export async function fetchBookings() {
    return apiRequest('/bookings');
}

export async function createBooking(booking) {
    return apiRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify(booking)
    });
}

export async function updateBooking(id, data) {
    return apiRequest(`/bookings/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

// --- Videos ---
export async function fetchVideos() {
    return apiRequest('/videos');
}

export async function createVideo(video) {
    return apiRequest('/videos', {
        method: 'POST',
        body: JSON.stringify(video)
    });
}

export async function updateVideo(id, video) {
    return apiRequest(`/videos/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(video)
    });
}

export async function deleteVideo(id) {
    return apiRequest(`/videos/${encodeURIComponent(id)}`, {
        method: 'DELETE'
    });
}

// --- Settings ---
export async function fetchSettings() {
    return apiRequest('/settings');
}

export async function saveSettings(settings) {
    return apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
    });
}

// --- File Uploads (Cloudinary) ---
export async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Image upload failed');
    }
    return response.json();
}

export async function uploadVideo(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/upload/video`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Video upload failed');
    }
    return response.json();
}

// --- Health Check ---
export async function checkHealth() {
    return apiRequest('/health');
}
