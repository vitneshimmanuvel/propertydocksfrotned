import React, { useState } from 'react';
import { Video, Plus, Edit2, Trash2, Play, Pause, ChevronUp, ChevronDown, PlusCircle, Link, X, Upload } from 'lucide-react';
import { uploadVideo } from '../utils/api';
import UniversalVideoPlayer from './UniversalVideoPlayer';

export default function VideosManager({ 
    database, 
    setDatabase, 
    showToast 
}) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const videos = database.videos || [];
    const [editingVideo, setEditingVideo] = useState(null); // null, 'add', or the video object itself
    const [videoForm, setVideoForm] = useState({
        title: '',
        description: '',
        url: '',
        duration: '',
        tag: ''
    });

    const [previewVideoUrl, setPreviewVideoUrl] = useState(null);

    // Open Add Form
    const handleOpenAdd = () => {
        setVideoForm({
            title: '',
            description: '',
            url: '',
            duration: '1:30',
            tag: 'General'
        });
        setEditingVideo('add');
    };

    // Open Edit Form
    const handleOpenEdit = (video) => {
        setVideoForm({
            title: video.title,
            description: video.description,
            url: video.url,
            duration: video.duration,
            tag: video.tag
        });
        setEditingVideo(video);
    };

    // Handle form input change
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setVideoForm(prev => ({ ...prev, [name]: value }));
    };

    const handleVideoFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress("Uploading video to cloud storage...");
        try {
            const res = await uploadVideo(file);
            
            let durationStr = "1:30";
            if (res.duration) {
                const totalSeconds = Math.round(res.duration);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                durationStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            }

            setVideoForm(prev => ({
                ...prev,
                url: res.url,
                duration: durationStr
            }));
            showToast("Video uploaded successfully to Cloud Storage!", "success");
        } catch (err) {
            console.error("Video upload failed", err);
            showToast(err.message || "Failed to upload video.", "error");
        } finally {
            setIsUploading(false);
            setUploadProgress("");
        }
    };

    // Save Video (Create or Update)
    const handleSaveVideo = (e) => {
        e.preventDefault();
        
        // URL validation
        if (!videoForm.url.trim().startsWith('http://') && !videoForm.url.trim().startsWith('https://')) {
            showToast("Video URL must start with http:// or https://", "error");
            return;
        }

        const newVideoData = {
            title: videoForm.title.trim(),
            description: videoForm.description.trim(),
            url: videoForm.url.trim(),
            duration: videoForm.duration.trim() || '1:30',
            tag: videoForm.tag.trim() || 'General'
        };

        setDatabase(prev => {
            let updatedVideos;
            if (editingVideo === 'add') {
                const newId = `vid-${Date.now()}`;
                updatedVideos = [...(prev.videos || []), { id: newId, ...newVideoData }];
                showToast("New promotional video added successfully.", "success");
            } else {
                updatedVideos = (prev.videos || []).map(v => v.id === editingVideo.id ? { ...v, ...newVideoData } : v);
                showToast("Promotional video details updated successfully.", "success");
            }
            return {
                ...prev,
                videos: updatedVideos
            };
        });

        setEditingVideo(null);
    };

    // Delete Video
    const handleDeleteVideo = (id, title) => {
        if (!window.confirm(`Are you sure you want to permanently delete promotional video "${title}"?`)) {
            return;
        }

        setDatabase(prev => {
            const updatedVideos = (prev.videos || []).filter(v => v.id !== id);
            return {
                ...prev,
                videos: updatedVideos
            };
        });
        showToast("Video deleted successfully.", "warning");
    };

    // Reorder videos (Move up/down in the playlist)
    const handleMoveVideo = (index, direction) => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === videos.length - 1) return;

        const nextIndex = direction === 'up' ? index - 1 : index + 1;
        
        setDatabase(prev => {
            const list = [...(prev.videos || [])];
            // Swap items
            const temp = list[index];
            list[index] = list[nextIndex];
            list[nextIndex] = temp;
            return {
                ...prev,
                videos: list
            };
        });
    };

    return (
        <div className="videos-dashboard" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', background: 'var(--bg-main)' }}>
            
            {/* Header Title block */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Video size={24} style={{ color: 'var(--primary)' }} /> Promotional Videos Manager
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Manage site drone shots and walkthrough videos shown on the public landing page.</p>
                </div>
                <button className="btn-primary" onClick={handleOpenAdd} style={{ gap: '6px', fontSize: '0.82rem', padding: '10px 16px', borderRadius: 'var(--radius-sm)' }}>
                    <Plus size={16} /> Add Promo Video
                </button>
            </div>

            {/* Total count KPI card */}
            <div style={{ maxWidth: '240px' }}>
                <div className="metric-card" style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total Videos Configured</h3>
                    <div className="metric-value" style={{ fontSize: '1.8rem', marginTop: '6px' }}>{videos.length}</div>
                    <span className="metric-sub" style={{ color: 'var(--text-muted)' }}>Live in playlist</span>
                </div>
            </div>

            {/* List / Grid of configured videos */}
            {videos.length === 0 ? (
                <div style={{ background: 'var(--bg-panel)', border: '1px dashed var(--border-color)', padding: '60px 20px', textAlign: 'center', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Video size={48} style={{ opacity: 0.15 }} />
                    <h3 style={{ color: 'var(--text-secondary)' }}>No Promotional Videos Configured</h3>
                    <p style={{ fontSize: '0.8rem', maxWidth: '340px' }}>Click the "Add Promo Video" button at the top right to start linking site walkthrough videos to the Home page.</p>
                    <button className="btn-primary" onClick={handleOpenAdd} style={{ fontSize: '0.82rem', padding: '8px 14px' }}>
                        Create First Video Link
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                    {videos.map((video, idx) => (
                        <div 
                            key={video.id}
                            style={{
                                background: 'var(--bg-panel)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                transition: 'all 0.2s ease'
                            }}
                            className="admin-video-card"
                        >
                            {/* Card Header (Preview banner / play button) */}
                            <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <video 
                                    src={video.url}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
                                    muted
                                    playsInline
                                />
                                <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', color: 'var(--primary)', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>
                                    {video.tag}
                                </span>
                                <span style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', color: '#ffffff', fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px' }}>
                                    {video.duration}
                                </span>
                                <button 
                                    onClick={() => setPreviewVideoUrl(video.url)}
                                    style={{ position: 'absolute', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary)', border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(99,102,241,0.4)' }}
                                    title="Play Preview"
                                >
                                    <Play size={20} fill="#ffffff" style={{ marginLeft: '2px' }} />
                                </button>
                            </div>

                            {/* Card Body */}
                            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{video.title}</h3>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                    {video.description}
                                </p>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '6px' }}>
                                    <Link size={12} style={{ flexShrink: 0 }} />
                                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{video.url}</span>
                                </div>
                            </div>

                            {/* Card Footer actions */}
                            <div style={{ borderTop: '1px solid var(--border-color)', padding: '12px 18px', background: 'rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {/* Order actions */}
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button 
                                        className="btn-icon" 
                                        onClick={() => handleMoveVideo(idx, 'up')}
                                        disabled={idx === 0}
                                        title="Move Up"
                                        style={{ width: '26px', height: '26px' }}
                                    >
                                        <ChevronUp size={14} />
                                    </button>
                                    <button 
                                        className="btn-icon" 
                                        onClick={() => handleMoveVideo(idx, 'down')}
                                        disabled={idx === videos.length - 1}
                                        title="Move Down"
                                        style={{ width: '26px', height: '26px' }}
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                </div>

                                {/* Edit/Delete actions */}
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button 
                                        onClick={() => handleOpenEdit(video)}
                                        className="btn-secondary" 
                                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)', gap: '4px' }}
                                    >
                                        <Edit2 size={12} /> Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteVideo(video.id, video.title)}
                                        className="btn-secondary" 
                                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)', gap: '4px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                                    >
                                        <Trash2 size={12} /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for Add / Edit Video form */}
            {editingVideo && (
                <div className="custom-modal-overlay animate-fade-in" style={{ zIndex: 200 }}>
                    <div className="custom-modal" style={{ maxWidth: '500px', width: '90%' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            {editingVideo === 'add' ? 'Add Promotional Video' : 'Edit Promotional Video'}
                        </h3>
                        
                        <form onSubmit={handleSaveVideo} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Video Title</label>
                                <input 
                                    type="text" 
                                    name="title"
                                    required
                                    placeholder="e.g. Property Docs Meadows Drone Tour"
                                    value={videoForm.title}
                                    onChange={handleFormChange}
                                    style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Video Description</label>
                                <textarea 
                                    name="description"
                                    required
                                    rows="3"
                                    placeholder="Describe the content shown in the video..."
                                    value={videoForm.description}
                                    onChange={handleFormChange}
                                    style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', resize: 'vertical' }}
                                />
                            </div>

                             <div className="form-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Upload Video File (Optional)</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input 
                                        type="file" 
                                        accept="video/*"
                                        onChange={handleVideoFileChange}
                                        disabled={isUploading}
                                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                {isUploading && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span>{uploadProgress}</span>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Direct Video MP4 URL</label>
                                <input 
                                    type="url" 
                                    name="url"
                                    required
                                    placeholder="e.g. https://domain.com/video.mp4"
                                    value={videoForm.url}
                                    onChange={handleFormChange}
                                    style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                />
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Use direct static video hosting links (Mixkit, Pexels, or S3) or upload a file.</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Duration</label>
                                    <input 
                                        type="text" 
                                        name="duration"
                                        placeholder="e.g. 1:45"
                                        value={videoForm.duration}
                                        onChange={handleFormChange}
                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Tag / Area</label>
                                    <input 
                                        type="text" 
                                        name="tag"
                                        placeholder="e.g. Erode Site Plan"
                                        value={videoForm.tag}
                                        onChange={handleFormChange}
                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setEditingVideo(null)} style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}>Save Video</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Video Playback Modal Preview */}
            {previewVideoUrl && (
                <div className="custom-modal-overlay" style={{ zIndex: 300, background: 'rgba(0,0,0,0.9)' }} onClick={() => setPreviewVideoUrl(null)}>
                    <div style={{ position: 'relative', width: '90%', maxWidth: '800px', aspectRatio: '16/9' }} onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setPreviewVideoUrl(null)} 
                            style={{ position: 'absolute', top: '-40px', right: '0', background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                        >
                            <X size={18} /> Close Preview
                        </button>
                        <UniversalVideoPlayer 
                            url={previewVideoUrl}
                            controls
                            autoPlay
                            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000000', borderRadius: 'var(--radius-md)' }}
                        />
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{__html: `
                .admin-video-card:hover {
                    border-color: var(--primary) !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.25) !important;
                    transform: translateY(-2px);
                }
            `}} />

        </div>
    );
}
