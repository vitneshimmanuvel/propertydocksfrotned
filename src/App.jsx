import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, Map, Landmark, Users, ClipboardList, BarChart3, Settings, LogOut, ChevronDown, ChevronLeft, ChevronRight, Plus, Upload, Edit2, Trash2, X, Video, MapPin, ShieldCheck, MessageSquare } from 'lucide-react';
import Header from './components/Header';
import VectorizerEngine from './utils/VectorizerEngine';
import SidebarLeft from './components/SidebarLeft';
import SidebarRight from './components/SidebarRight';
import MapWorkspace from './components/MapWorkspace';
import ToastContainer from './components/ToastContainer';
import INITIAL_MAP_DATA from './utils/initialMapData';
import { fetchDatabase, saveFullDatabase, uploadImage } from './utils/api';
import UserPortal from './components/UserPortal';
import InquiriesManager from './components/InquiriesManager';
import BookingsManager from './components/BookingsManager';
import VideosManager from './components/VideosManager';
import DashboardManager from './components/DashboardManager';
import PlotsManager from './components/PlotsManager';
import ClientsManager from './components/ClientsManager';
import ReportsManager from './components/ReportsManager';
import GlobalMap from './components/GlobalMap';
import PropertyDocksLogo from './components/PropertyDocksLogo';

const DEFAULT_SETTINGS = {
    bookingAdvance: 50000,
    supportPhone: "+91 98765 43210",
    supportEmail: "support@propertydocsdevelopers.in",
    officeAddress: "Property Docs Plaza, Highway Road, Vijayamangalam, Erode, Tamil Nadu - 638056"
};

const DEFAULT_PROMO_VIDEOS = [
    {
        id: "vid-1",
        title: "Property Docs Prime Meadows - Aerial Drone Tour",
        description: "Watch a high-definition 4K drone walkthrough of our flagship Vijayamangalam project, showcasing internal sub-roads, ready-to-build subplots, and highway connections.",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        duration: "0:15",
        tag: "Vijayamangalam"
    },
    {
        id: "vid-2",
        title: "Gated Community Site Walkthrough",
        description: "Explore the internal infrastructure, including concrete drainage systems, water supply piping, street lights, and common green parks for residents.",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        duration: "0:15",
        tag: "Coimbatore"
    },
    {
        id: "vid-3",
        title: "Future Residential Layout Launch",
        description: "Sneak peek into our upcoming scenic layout project in Madurai, offering rich groundwater, calm surroundings, and quick access to schools and hospitals.",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        duration: "0:15",
        tag: "Madurai Launch"
    }
];

export default function App() {
    const [database, setDatabase] = useState({
        activeLayoutId: "default",
        layouts: [],
        bookings: [],
        videos: [],
        settings: DEFAULT_SETTINGS
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadDatabase = async () => {
            // Clean up legacy offline cache keys from browser localStorage
            try {
                localStorage.removeItem("aerostage_multilayouts_database");
                localStorage.removeItem("aerostage_map_database");
                localStorage.removeItem("property_docs_db");
            } catch (e) {}

            try {
                const data = await fetchDatabase();
                setDatabase(data || { ownerListings: [], clients: [], layouts: [], bookings: [] });
            } catch (err) {
                console.error("Failed to fetch database from server", err);
                showToast("Connection failed to server.", "error");
                setDatabase({ ownerListings: [], clients: [], layouts: [], bookings: [] });
            } finally {
                setIsLoading(false);
            }
        };

        loadDatabase();
    }, []);

    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
        return sessionStorage.getItem("property_docs_admin_authenticated") === "true";
    });

    const [role, setRole] = useState(() => {
        const path = window.location.pathname;
        const hash = window.location.hash;
        const search = window.location.search;
        if (path === '/owner' || path.startsWith('/owner/') || hash === '#/owner' || hash === '#owner' || search === '?owner' || search.includes('owner') || path === '/admin' || search === '?admin' || hash === '#admin') {
            return "admin";
        }
        return "user";
    });
    const [adminTab, setAdminTab] = useState(() => {
        const saved = localStorage.getItem("property_docs_admin_tab");
        if (saved === 'inquiries') return "dashboard";
        return saved || "dashboard";
    });
    useEffect(() => {
        localStorage.setItem("property_docs_admin_tab", adminTab);
    }, [adminTab]);

    const [selectedPlotId, setSelectedPlotId] = useState(null);
    const [currentTool, setCurrentTool] = useState(() => {
        return localStorage.getItem("property_docs_admin_current_tool") || "select";
    });
    useEffect(() => {
        localStorage.setItem("property_docs_admin_current_tool", currentTool);
    }, [currentTool]);

    const [activeFilter, setActiveFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem("property_docs_active_theme");
        if (savedTheme === "property_docs" || savedTheme === "property-docs-light") {
            return savedTheme;
        }
        return "property-docs-light";
    });

    // Handle initial theme application to document root html element
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("property_docs_active_theme", theme);
    }, [theme]);

    // Handle path/route tracking to switch roles between user portal and admin panel
    useEffect(() => {
        const checkRoute = () => {
            const path = window.location.pathname;
            const hash = window.location.hash;
            const search = window.location.search;
            if (path === '/owner' || path.startsWith('/owner/') || hash === '#/owner' || hash === '#owner' || search === '?owner' || search.includes('owner') || path === '/admin' || hash === '#/admin' || hash === '#admin' || search === '?admin' || search.includes('admin')) {
                setRole("admin");
            } else {
                setRole("user");
            }
        };

        window.addEventListener('popstate', checkRoute);
        window.addEventListener('hashchange', checkRoute);
        // Initial sync
        checkRoute();

        return () => {
            window.removeEventListener('popstate', checkRoute);
            window.removeEventListener('hashchange', checkRoute);
        };
    }, []);

    // Secret Admin Shortcut (Ctrl + Shift + A) to toggle Hidden Admin Portal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
                e.preventDefault();
                setRole(prev => {
                    const nextRole = prev === 'user' ? 'admin' : 'user';
                    const roleNames = { user: 'Public User Site', admin: 'Master Admin Panel' };
                    showToast(`Switched to ${roleNames[nextRole]}`, "success");
                    return nextRole;
                });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Reset selected plot and edit mode when navigating away from layouts view
    useEffect(() => {
        if (adminTab !== 'layouts') {
            setSelectedPlotId(null);
            setEditMode(false);
        }
    }, [adminTab]);

    const [layoutsCollapsed, setLayoutsCollapsed] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [navCollapsed, setNavCollapsed] = useState(false);
    const [layoutsMenuExpanded, setLayoutsMenuExpanded] = useState(true);
    const [layers, setLayers] = useState(() => {
        const saved = localStorage.getItem("property_docs_admin_layers");
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        return { labels: true, roads: true, grids: true, statusColors: true };
    });
    useEffect(() => {
        localStorage.setItem("property_docs_admin_layers", JSON.stringify(layers));
    }, [layers]);
    const [editMode, setEditMode] = useState(false);
    
    const [toasts, setToasts] = useState([]);

    const refImageInput = useRef(null);
    const uploadMetadataRef = useRef({ state: '', district: '', area: '' });
    const [modalConfig, setModalConfig] = useState(null);

    // OCR & Vectorizer States
    const [ocrWords, setOcrWords] = useState([]);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrStatus, setOcrStatus] = useState("");
    
    // Vectorizer settings default values
    const [vecThreshold, setVecThreshold] = useState(() => {
        const saved = localStorage.getItem("property_docs_vec_threshold");
        return saved ? parseInt(saved) : 165;
    });
    useEffect(() => {
        localStorage.setItem("property_docs_vec_threshold", vecThreshold);
    }, [vecThreshold]);

    const [vecDilation, setVecDilation] = useState(() => {
        const saved = localStorage.getItem("property_docs_vec_dilation");
        return saved ? parseInt(saved) : 2;
    });
    useEffect(() => {
        localStorage.setItem("property_docs_vec_dilation", vecDilation);
    }, [vecDilation]);

    const [vecSimplify, setVecSimplify] = useState(() => {
        const saved = localStorage.getItem("property_docs_vec_simplify");
        return saved ? parseFloat(saved) : 3.5;
    });
    useEffect(() => {
        localStorage.setItem("property_docs_vec_simplify", vecSimplify);
    }, [vecSimplify]);

    const ocrWorkerRef = useRef(null);

    // Clear OCR words when active layout switches
    useEffect(() => {
        setOcrWords([]);
    }, [database.activeLayoutId]);

    const cancelOcr = async () => {
        setOcrLoading(false);
        setOcrStatus("");
        setOcrProgress(0);
        if (ocrWorkerRef.current) {
            try {
                await ocrWorkerRef.current.terminate();
            } catch (e) {
                console.error("Error terminating OCR worker", e);
            }
            ocrWorkerRef.current = null;
        }
        showToast("Layout scan cancelled.", "info");
    };

    // Core vectorization computation logic
    const runAutoVectorization = async (imageSrc, currentOcrWords, fitBounds = null) => {
        showToast("Starting layout auto-vectorization. Computing contours...", "info");
        try {
            const engine = new VectorizerEngine();
            const config = {
                threshold: vecThreshold,
                dilation: vecDilation,
                simplify: vecSimplify,
                bgX: fitBounds ? fitBounds.x : (mapData.backgroundImage?.x !== undefined ? mapData.backgroundImage.x : 0),
                bgY: fitBounds ? fitBounds.y : (mapData.backgroundImage?.y !== undefined ? mapData.backgroundImage.y : 0),
                bgWidth: fitBounds ? fitBounds.width : (mapData.backgroundImage?.width !== undefined ? mapData.backgroundImage.width : 1600),
                bgHeight: fitBounds ? fitBounds.height : (mapData.backgroundImage?.height !== undefined ? mapData.backgroundImage.height : 1000),
                ocrWords: currentOcrWords
            };
            
            const newPlots = await engine.vectorize(imageSrc, config);
            if (newPlots && newPlots.length > 0) {
                setMapData(prev => ({
                    ...prev,
                    plots: newPlots
                }));
                showToast(`Auto-Vectorizer complete! Traced ${newPlots.length} parcel polygons.`, "success");
            } else {
                showToast("Auto-vectorization completed but detected no valid enclosed shapes.", "warning");
            }
        } catch (err) {
            console.error("Vectorization engine failure", err);
            showToast("Failed to vectorize the uploaded layout.", "error");
        }
    };

    // ──── Image Preprocessing: Upscale + Contrast Boost + Sharpen for better OCR ────
    const preprocessImageForOcr = (imageSrc) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                // Upscale to at least 2500px wide for better text clarity on CAD layouts
                const scaleFactor = Math.max(2.0, 2500 / img.width);
                const w = Math.round(img.width * scaleFactor);
                const h = Math.round(img.height * scaleFactor);

                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d", { willReadFrequently: true });

                // Draw upscaled image
                ctx.drawImage(img, 0, 0, w, h);

                // ── Step 1: Contrast Enhancement (histogram stretch) ──
                let imgData = ctx.getImageData(0, 0, w, h);
                const data = imgData.data;
                let minLum = 255, maxLum = 0;
                for (let i = 0; i < data.length; i += 4) {
                    const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
                    if (lum < minLum) minLum = lum;
                    if (lum > maxLum) maxLum = lum;
                }
                const range = maxLum - minLum || 1;
                // Increase contrast by stretching luminance range
                const contrastBoost = 1.6; // 60% more contrast
                for (let i = 0; i < data.length; i += 4) {
                    for (let c = 0; c < 3; c++) {
                        let val = ((data[i+c] - minLum) / range) * 255;
                        val = ((val - 128) * contrastBoost) + 128; // contrast curve
                        data[i+c] = Math.max(0, Math.min(255, Math.round(val)));
                    }
                }
                ctx.putImageData(imgData, 0, 0);

                // ── Step 2: Unsharp Mask Sharpening ──
                // Create blurred version then subtract from original
                const blurCanvas = document.createElement("canvas");
                blurCanvas.width = w;
                blurCanvas.height = h;
                const blurCtx = blurCanvas.getContext("2d");
                blurCtx.filter = "blur(1.5px)";
                blurCtx.drawImage(canvas, 0, 0);
                const blurData = blurCtx.getImageData(0, 0, w, h).data;
                
                imgData = ctx.getImageData(0, 0, w, h);
                const sharpData = imgData.data;
                const sharpAmount = 1.8; // Sharpening strength
                for (let i = 0; i < sharpData.length; i += 4) {
                    for (let c = 0; c < 3; c++) {
                        const diff = sharpData[i+c] - blurData[i+c];
                        sharpData[i+c] = Math.max(0, Math.min(255, Math.round(sharpData[i+c] + diff * sharpAmount)));
                    }
                }
                ctx.putImageData(imgData, 0, 0);

                // ── Step 3: Adaptive Binarization for text clarity ──
                imgData = ctx.getImageData(0, 0, w, h);
                const binData = imgData.data;
                for (let i = 0; i < binData.length; i += 4) {
                    const gray = 0.299 * binData[i] + 0.587 * binData[i+1] + 0.114 * binData[i+2];
                    // High-contrast binarization threshold to make text black on white
                    const bw = gray < 140 ? 0 : 255;
                    binData[i] = binData[i+1] = binData[i+2] = bw;
                }
                ctx.putImageData(imgData, 0, 0);

                console.log(`[OCR Preprocess] Upscaled ${img.width}x${img.height} → ${w}x${h} (${scaleFactor.toFixed(1)}x), contrast+sharpen+binarize applied`);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => reject(new Error("Failed to load image for OCR preprocessing"));
            img.src = imageSrc;
        });
    };

    // ──── Merge fragmented OCR digits that Tesseract splits ────
    // e.g. "1" + "2" + "3" on same Y-line → "123"
    const mergeFragmentedDigits = (words) => {
        if (!words || words.length === 0) return words;
        
        // Sort by Y then X to process left-to-right, top-to-bottom
        const sorted = [...words].sort((a, b) => {
            const yDiff = a.y - b.y;
            if (Math.abs(yDiff) > 15) return yDiff; // different line
            return a.x - b.x; // same line, sort by X
        });
        
        const merged = [];
        let i = 0;
        while (i < sorted.length) {
            const current = { ...sorted[i] };
            
            // Only merge single/double digits that look like fragments
            if (/^\d{1,2}$/.test(current.text.trim())) {
                let combinedText = current.text.trim();
                let combinedBbox = { ...current.bbox };
                let lastX = current.bbox.x1;
                let lastY = current.y;
                let j = i + 1;
                
                while (j < sorted.length) {
                    const next = sorted[j];
                    const nextText = next.text.trim();
                    
                    // Check if next word is also a digit fragment, on same Y line, and close horizontally
                    const charWidth = (current.bbox.x1 - current.bbox.x0) / Math.max(current.text.trim().length, 1);
                    const gapThreshold = charWidth * 2.5; // Allow gap up to 2.5x character width
                    const yThreshold = (current.bbox.y1 - current.bbox.y0) * 0.6;
                    
                    if (/^\d{1,2}$/.test(nextText) &&
                        Math.abs(next.y - lastY) < yThreshold &&
                        (next.bbox.x0 - lastX) < gapThreshold &&
                        (next.bbox.x0 - lastX) > -charWidth) {
                        combinedText += nextText;
                        combinedBbox.x1 = next.bbox.x1;
                        combinedBbox.y0 = Math.min(combinedBbox.y0, next.bbox.y0);
                        combinedBbox.y1 = Math.max(combinedBbox.y1, next.bbox.y1);
                        lastX = next.bbox.x1;
                        j++;
                    } else {
                        break;
                    }
                }
                
                if (j > i + 1 && combinedText.length >= 1 && combinedText.length <= 4) {
                    // Successfully merged fragments
                    merged.push({
                        text: combinedText,
                        x: (combinedBbox.x0 + combinedBbox.x1) / 2,
                        y: (combinedBbox.y0 + combinedBbox.y1) / 2,
                        bbox: combinedBbox,
                        confidence: current.confidence,
                        _merged: true
                    });
                    console.log(`[OCR Merge] Fragments merged: "${sorted.slice(i, j).map(w => w.text).join('" + "')}" → "${combinedText}"`);
                    i = j;
                    continue;
                }
            }
            
            merged.push(current);
            i++;
        }
        
        return merged;
    };

    // OCR analysis scan using Tesseract (Optimized: preprocessing + better config)
    const runOcr = async (imageSrc, fitBounds = null) => {
        if (!window.Tesseract) {
            showToast("OCR engine (Tesseract.js) is not loaded yet.", "error");
            return;
        }
        setOcrLoading(true);
        setOcrProgress(0);
        setOcrStatus("Preprocessing image...");
        
        try {
            // ── Preprocess: upscale, contrast, sharpen, binarize ──
            const preprocessedSrc = await preprocessImageForOcr(imageSrc);
            setOcrStatus("Starting OCR engine...");

            const worker = await window.Tesseract.createWorker({
                logger: m => {
                    if (m.status === "recognizing text") {
                        setOcrProgress(Math.round(m.progress * 100));
                        setOcrStatus(`Scanning layout text: ${Math.round(m.progress * 100)}%`);
                    } else {
                        setOcrStatus(m.status);
                    }
                }
            });
            
            ocrWorkerRef.current = worker;
            
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            
            // Optimized Tesseract parameters for CAD layout text:
            // PSM 6 = Assume uniform block of text (better for structured layouts)
            // PSM 11 was splitting sequential numbers into individual digits
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz./-:No ',
                tessedit_pageseg_mode: '6',
            });
            
            // Run OCR on preprocessed (upscaled + contrast-boosted + sharpened) image
            const { data } = await worker.recognize(preprocessedSrc);
            
            // If user cancelled while recognizing
            if (!ocrWorkerRef.current) {
                await worker.terminate();
                return;
            }

            // ── Parse & scale coordinates back to ORIGINAL image space ──
            // preprocessedSrc is upscaled, so we need to map bbox coordinates back
            const preImg = new Image();
            const preImgLoaded = new Promise(res => { preImg.onload = () => res(); });
            preImg.src = preprocessedSrc;
            await preImgLoaded;
            const preW = preImg.width;
            const preH = preImg.height;
            
            // Get original image dimensions
            const origImg = new Image();
            const origImgLoaded = new Promise(res => { origImg.crossOrigin = "anonymous"; origImg.onload = () => res(); });
            origImg.src = imageSrc;
            await origImgLoaded;
            const origW = origImg.width;
            const origH = origImg.height;
            
            const scaleBackX = origW / preW;
            const scaleBackY = origH / preH;
            
            // Lower confidence threshold from 25 to 15 — CAD text is often low-confidence
            let parsedWords = data.words
                .filter(w => w.confidence > 15 && w.text.trim().length > 0)
                .map(w => ({
                    text: w.text.trim(),
                    x: ((w.bbox.x0 + w.bbox.x1) / 2) * scaleBackX,
                    y: ((w.bbox.y0 + w.bbox.y1) / 2) * scaleBackY,
                    bbox: {
                        x0: w.bbox.x0 * scaleBackX,
                        y0: w.bbox.y0 * scaleBackY,
                        x1: w.bbox.x1 * scaleBackX,
                        y1: w.bbox.y1 * scaleBackY
                    },
                    confidence: w.confidence
                }));
            
            // ── Merge fragmented digits ("1" + "2" → "12") ──
            parsedWords = mergeFragmentedDigits(parsedWords);
            
            // Broadened regex: match more plot number patterns
            const plotRegex = /^(?:plot|lot|no|p|l|pl)?[-.:\s]*(\d{1,4}[A-Za-z]?)$/i;
            const plotNumberCount = parsedWords.filter(w => plotRegex.test(w.text)).length;
            
            console.log(`[OCR] Raw words: ${data.words.length}, Filtered: ${parsedWords.length}, Plot numbers: ${plotNumberCount}`);
            console.log(`[OCR] Detected texts:`, parsedWords.map(w => `"${w.text}" (${w.confidence.toFixed(0)}%)`).join(', '));
            
            setOcrWords(parsedWords);
            showToast(`Layout analysis complete. Found ${plotNumberCount} plot numbers from ${parsedWords.length} detected words.`, "success");
            await worker.terminate();
            ocrWorkerRef.current = null;
            
            // Auto run vectorization with ORIGINAL image (not preprocessed)
            await runAutoVectorization(imageSrc, parsedWords, fitBounds);
        } catch (err) {
            console.error("OCR analysis failure", err);
            showToast("Failed to perform OCR layout text scan.", "error");
        } finally {
            setOcrLoading(false);
            setOcrStatus("");
            ocrWorkerRef.current = null;
        }
    };

    const handleRefImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
            const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
            if (!pdfjsLib) {
                showToast("PDF rendering engine is not loaded yet.", "error");
                return;
            }
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

            const fileReader = new FileReader();
            fileReader.onload = async function () {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement("canvas");
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const context = canvas.getContext("2d");
                    
                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;
                    
                    const dataUrl = canvas.toDataURL("image/png");
                    
                    // Compute aspect ratio correct bounds inside 1600x1000 viewport box
                    const boxWidth = 1600;
                    const boxHeight = 1000;
                    const boxRatio = boxWidth / boxHeight;
                    const imgRatio = viewport.width / viewport.height;

                    let fitX = 0, fitY = 0, fitW = boxWidth, fitH = boxHeight;
                    if (imgRatio > boxRatio) {
                        fitW = boxWidth;
                        fitH = Math.round(boxWidth / imgRatio);
                        fitX = 0;
                        fitY = Math.round((boxHeight - fitH) / 2);
                    } else {
                        fitH = boxHeight;
                        fitW = Math.round(boxHeight * imgRatio);
                        fitX = Math.round((boxWidth - fitW) / 2);
                        fitY = 0;
                    }

                    setMapData(prev => ({
                        ...prev,
                        state: uploadMetadataRef.current.state ? uploadMetadataRef.current.state.trim() : prev.state,
                        district: uploadMetadataRef.current.district ? uploadMetadataRef.current.district.trim() : prev.district,
                        area: uploadMetadataRef.current.area ? uploadMetadataRef.current.area.trim() : prev.area,
                        backgroundImage: {
                            ...prev.backgroundImage,
                            href: dataUrl,
                            opacity: 1.0,
                            x: fitX,
                            y: fitY,
                            width: fitW,
                            height: fitH,
                            name: file.name
                        }
                    }));
                    showToast("PDF Layout successfully converted. Analyzing text...", "success");
                    runOcr(dataUrl, { x: fitX, y: fitY, width: fitW, height: fitH });

                    // Background upload to Cloudinary
                    try {
                        const blob = await (await fetch(dataUrl)).blob();
                        const imageFile = new File([blob], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' });
                        showToast("Uploading layout to cloud storage...", "info");
                        const uploadResult = await uploadImage(imageFile);
                        setMapData(prev => ({
                            ...prev,
                            backgroundImage: {
                                ...prev.backgroundImage,
                                href: uploadResult.url
                            }
                        }));
                        showToast("Layout successfully stored in cloud!", "success");
                    } catch (uploadErr) {
                        console.error("Cloudinary upload failed:", uploadErr);
                        showToast("Cloud storage upload failed. Image remains local.", "error");
                    }

                } catch (err) {
                    console.error("PDF parsing error", err);
                    showToast("Failed to render PDF page.", "error");
                }
            };
            fileReader.readAsArrayBuffer(file);
        } else {
            const objectUrl = URL.createObjectURL(file);
            const img = new Image();
            img.onload = async () => {
                const boxWidth = 1600;
                const boxHeight = 1000;
                const boxRatio = boxWidth / boxHeight;
                const imgRatio = img.width / img.height;

                let fitX = 0, fitY = 0, fitW = boxWidth, fitH = boxHeight;
                if (imgRatio > boxRatio) {
                    fitW = boxWidth;
                    fitH = Math.round(boxWidth / imgRatio);
                    fitX = 0;
                    fitY = Math.round((boxHeight - fitH) / 2);
                } else {
                    fitH = boxHeight;
                    fitW = Math.round(boxHeight * imgRatio);
                    fitX = Math.round((boxWidth - fitW) / 2);
                    fitY = 0;
                }

                setMapData(prev => ({
                    ...prev,
                    state: uploadMetadataRef.current.state ? uploadMetadataRef.current.state.trim() : prev.state,
                    district: uploadMetadataRef.current.district ? uploadMetadataRef.current.district.trim() : prev.district,
                    area: uploadMetadataRef.current.area ? uploadMetadataRef.current.area.trim() : prev.area,
                    backgroundImage: {
                        ...prev.backgroundImage,
                        href: objectUrl,
                        opacity: 1.0,
                        x: fitX,
                        y: fitY,
                        width: fitW,
                        height: fitH,
                        name: file.name
                    }
                }));
                showToast("Reference layout uploaded. Analyzing text...", "success");
                runOcr(objectUrl, { x: fitX, y: fitY, width: fitW, height: fitH });

                // Background upload to Cloudinary
                try {
                    showToast("Uploading layout to cloud storage...", "info");
                    const uploadResult = await uploadImage(file);
                    setMapData(prev => ({
                        ...prev,
                        backgroundImage: {
                            ...prev.backgroundImage,
                            href: uploadResult.url
                        }
                    }));
                    showToast("Layout successfully stored in cloud!", "success");
                } catch (uploadErr) {
                    console.error("Cloudinary upload failed:", uploadErr);
                    showToast("Cloud storage upload failed. Image remains local.", "error");
                }
            };
            img.src = objectUrl;
        }
    };

    const triggerUploadWithMetadata = () => {
        const activeLayout = layouts.find(l => l.id === activeLayoutId) || layouts[0];
        setModalConfig({
            type: 'upload_confirm',
            title: 'Layout Location Details',
            defaultValue: {
                state: activeLayout.state || 'Tamil Nadu',
                district: activeLayout.district || 'Erode',
                area: activeLayout.area || 'Vijayamangalam'
            },
            onConfirm: (data) => {
                uploadMetadataRef.current = data;
                if (refImageInput.current) {
                    refImageInput.current.click();
                }
            }
        });
    };

    const triggerCreateNewLayout = () => {
        setModalConfig({
            type: 'add',
            title: 'Create New Layout Sheet',
            placeholder: 'e.g. Upper Tiers Plan',
            defaultValue: '',
            onConfirm: (name) => {
                if (name && name.trim()) {
                    handleAddLayout(name.trim());
                }
            }
        });
    };

    const triggerEditLayoutInfo = () => {
        const activeLayout = layouts.find(l => l.id === activeLayoutId);
        if (!activeLayout) return;
        setModalConfig({
            type: 'edit_info',
            title: 'Edit Layout Information',
            defaultValue: {
                name: activeLayout.name,
                state: activeLayout.state || 'Tamil Nadu',
                district: activeLayout.district || 'Erode',
                area: activeLayout.area || 'Vijayamangalam'
            },
            onConfirm: (data) => {
                if (data.name && data.name.trim()) {
                    handleUpdateLayoutInfo(activeLayoutId, data);
                }
            }
        });
    };

    const triggerDeleteLayout = () => {
        const activeLayout = layouts.find(l => l.id === activeLayoutId);
        if (!activeLayout) return;
        setModalConfig({
            type: 'delete',
            title: 'Delete Layout Sheet',
            message: `Are you sure you want to delete layout sheet "${activeLayout.name}"? This action cannot be undone.`,
            onConfirm: () => {
                handleDeleteLayout(activeLayoutId);
            }
        });
    };

    const showToast = useCallback((message, type = "success") => {
        const id = Date.now() + Math.random().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3400); // Wait for transition out
    }, []);

    const isInitialMountRef = useRef(true);

    useEffect(() => {
        if (isLoading) return;
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            return;
        }
        saveFullDatabase(database).catch(err => {
            console.error("Failed to save database to server:", err);
        });
        localStorage.setItem("aerostage_multilayouts_database", JSON.stringify(database));
    }, [database, isLoading]);

    const { activeLayoutId, layouts } = database;
    const mapData = layouts.find(l => l.id === activeLayoutId) || layouts[0];

    const setMapData = useCallback((newDataOrFunc) => {
        setDatabase(prevDb => {
            const activeId = prevDb.activeLayoutId;
            const newLayouts = prevDb.layouts.map(l => {
                if (l.id === activeId) {
                    const updated = typeof newDataOrFunc === 'function' ? newDataOrFunc(l) : newDataOrFunc;
                    return { ...l, ...updated };
                }
                return l;
            });
            return {
                ...prevDb,
                layouts: newLayouts
            };
        });
    }, []);

    const handleAddLayout = useCallback((name) => {
        const newLayoutId = `layout-${Date.now()}`;
        setDatabase(prevDb => {
            const newLayout = {
                id: newLayoutId,
                name: name,
                state: "Tamil Nadu",
                district: "Erode",
                area: "Vijayamangalam",
                canvas: { ...INITIAL_MAP_DATA.canvas },
                backgroundImage: { href: null, opacity: 0.35, x: 0, y: 0, width: 1600, height: 1000 },
                roads: [],
                plots: [],
                hatches: []
            };
            return {
                activeLayoutId: newLayoutId,
                layouts: [...prevDb.layouts, newLayout]
            };
        });
        localStorage.setItem("property_docs_active_layout_id", newLayoutId);
        showToast(`Layout "${name}" created successfully.`, "success");
    }, [showToast]);

    const handleUpdateLayoutInfo = useCallback((id, data) => {
        setDatabase(prevDb => {
            const newLayouts = prevDb.layouts.map(l => {
                if (l.id === id) {
                    return { 
                        ...l, 
                        name: data.name.trim(),
                        state: data.state.trim(),
                        district: data.district.trim(),
                        area: data.area.trim()
                    };
                }
                return l;
            });
            return {
                ...prevDb,
                layouts: newLayouts
            };
        });
        showToast("Layout information updated successfully.", "success");
    }, [showToast]);

    const handleDeleteLayout = useCallback((id) => {
        setDatabase(prevDb => {
            if (prevDb.layouts.length <= 1) {
                showToast("Cannot delete the only layout sheet.", "error");
                return prevDb;
            }
            const newLayouts = prevDb.layouts.filter(l => l.id !== id);
            let nextActiveId = prevDb.activeLayoutId;
            if (prevDb.activeLayoutId === id) {
                nextActiveId = newLayouts[0].id;
            }
            localStorage.setItem("property_docs_active_layout_id", nextActiveId);
            return {
                activeLayoutId: nextActiveId,
                layouts: newLayouts
            };
        });
        showToast("Layout sheet deleted.", "warning");
    }, [showToast]);

    const handleSetActiveLayoutId = useCallback((id) => {
        setDatabase(prevDb => ({
            ...prevDb,
            activeLayoutId: id
        }));
        localStorage.setItem("property_docs_active_layout_id", id);
    }, []);

    if (isLoading) {
        // Read theme from localStorage to apply theme-appropriate colors to loading screen
        const savedTheme = localStorage.getItem("property_docs_active_theme");
        const loadingTheme = (savedTheme === "property_docs" || savedTheme === "property-docs-light") ? savedTheme : "property-docs-light";
        
        const isDark = loadingTheme === "property_docs";
        const bgGradient = isDark 
            ? 'linear-gradient(135deg, #0c0e08 0%, #060704 100%)' 
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
        const textColor = isDark ? '#f6f8f2' : '#0f172a';
        const primaryColor = '#921214';
        const primaryGlow = 'rgba(146, 18, 20, 0.25)';
        const logoBorderColor = 'rgba(146, 18, 20, 0.3)';

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: bgGradient,
                color: textColor,
                fontFamily: "'Outfit', 'Inter', sans-serif",
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 9999
            }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                    {/* Glowing outer spin ring */}
                    <div style={{
                        width: '130px',
                        height: '130px',
                        borderRadius: '50%',
                        border: `3px solid rgba(146, 18, 20, 0.08)`,
                        borderTop: `3px solid ${primaryColor}`,
                        animation: 'spin 1.2s linear infinite',
                        position: 'absolute'
                    }} />
                    
                    {/* Logo Container */}
                    <div style={{
                        padding: '16px 24px',
                        borderRadius: '16px',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 12px 30px ${primaryGlow}`,
                        border: `1.5px solid ${logoBorderColor}`,
                        zIndex: 2
                    }}>
                        <PropertyDocksLogo width={180} height={50} />
                    </div>
                </div>

                <h1 style={{
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    color: primaryColor,
                    margin: '12px 0 4px 0',
                    textTransform: 'uppercase'
                }}>
                    PROPERTY DOCKS
                </h1>
                
                <h2 style={{
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#64748b',
                    margin: 0,
                    letterSpacing: '2px',
                    textTransform: 'uppercase'
                }}>
                    Real Estate Portal
                </h2>

                {/* Inline CSS for keyframe animations (spin) */}
                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}} />

                <ToastContainer toasts={toasts} />
            </div>
        );
    }

    return (
        <div data-theme={theme} style={{ display: 'flex', flex: 1, flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            {role === 'admin' && (
                <Header 
                    theme={theme}
                    setTheme={setTheme} 
                    mapData={mapData} 
                    showToast={showToast} 
                    role={role}
                    setRole={setRole}
                />
            )}
            
            {/* Hidden Admin Login Modal */}
            {role === 'admin' && !isAdminAuthenticated && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#ffffff', padding: '36px', borderRadius: '16px', width: '90%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(146, 18, 20, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                            <ShieldCheck size={32} color="#921214" />
                        </div>
                        
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', fontFamily: "'Outfit', sans-serif" }}>
                            PROPERTY DOCS ADMIN
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 24px 0' }}>
                            Enter credentials to access the Hidden Admin Workspace
                        </p>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target;
                            const user = form.username.value.trim();
                            const pass = form.password.value.trim();

                            if ((user === 'admin' || user === 'admin@propertydocs.com') && (pass === 'admin123' || pass === '123456' || pass === 'propertydocs2026')) {
                                setIsAdminAuthenticated(true);
                                sessionStorage.setItem("property_docs_admin_authenticated", "true");
                                showToast("Authenticated as Admin! Welcome to Admin Workspace.", "success");
                            } else {
                                showToast("Invalid Username or Password!", "error");
                            }
                        }} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Admin Username</label>
                                <input 
                                    type="text" 
                                    name="username" 
                                    defaultValue="admin" 
                                    placeholder="Enter username" 
                                    required 
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', background: '#f8fafc' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Admin Password</label>
                                <input 
                                    type="password" 
                                    name="password" 
                                    defaultValue="admin123" 
                                    placeholder="Enter password" 
                                    required 
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', background: '#f8fafc' }}
                                />
                            </div>

                            <div style={{ background: '#f1f5f9', padding: '10px 12px', borderRadius: '6px', fontSize: '0.8rem', color: '#475569', border: '1px solid #e2e8f0' }}>
                                🔑 <strong>Admin Credentials:</strong><br />
                                Username: <code style={{ color: '#921214', fontWeight: 700 }}>admin</code> | Password: <code style={{ color: '#921214', fontWeight: 700 }}>admin123</code>
                            </div>

                            <button type="submit" style={{ width: '100%', padding: '14px', background: '#921214', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px', boxShadow: '0 4px 12px rgba(146, 18, 20, 0.3)' }}>
                                Sign In to Admin Workspace
                            </button>

                            <button type="button" onClick={() => { setRole('user'); window.location.href = '/'; }} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}>
                                Return to Public Website
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {role === 'user' ? (
                <UserPortal 
                    database={database}
                    setDatabase={setDatabase}
                    showToast={showToast}
                    theme={theme}
                    setRole={setRole}
                />
            ) : role === 'admin' ? (
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {/* Navigation Sidebar Collapse button */}
                    <button 
                        className="nav-collapse-btn" 
                        style={{ 
                            left: `${navCollapsed ? 58 : 228}px`
                        }}
                        onClick={() => setNavCollapsed(!navCollapsed)}
                        title={navCollapsed ? "Expand Navigation Sidebar" : "Collapse Navigation Sidebar"}
                    >
                        {navCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                    </button>

                    {/* Navigation Sidebar */}
                    <div className={`nav-sidebar ${navCollapsed ? 'collapsed' : ''}`} style={{ flexShrink: 0 }}>
                        <div className="nav-links" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <button 
                                className={`nav-item ${adminTab === 'dashboard' ? 'active' : ''}`} 
                                onClick={() => setAdminTab('dashboard')}
                                title={navCollapsed ? "Dashboard" : undefined}
                                style={navCollapsed ? { padding: '12px 0', justifyContent: 'center', gap: 0 } : {}}
                            >
                                <LayoutDashboard size={18} />
                                {!navCollapsed && <span>Dashboard</span>}
                            </button>
                            
                            <button 
                                className={`nav-item ${adminTab === 'clients' ? 'active' : ''}`} 
                                onClick={() => setAdminTab('clients')}
                                title={navCollapsed ? "Clients" : undefined}
                                style={navCollapsed ? { padding: '12px 0', justifyContent: 'center', gap: 0 } : {}}
                            >
                                <Users size={18} />
                                {!navCollapsed && <span>Clients</span>}
                            </button>

                            <button 
                                className={`nav-item ${adminTab === 'inquiries' ? 'active' : ''}`} 
                                onClick={() => setAdminTab('inquiries')}
                                title={navCollapsed ? "Inquiries" : undefined}
                                style={navCollapsed ? { padding: '12px 0', justifyContent: 'center', gap: 0 } : {}}
                            >
                                <MessageSquare size={18} />
                                {!navCollapsed && (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        Inquiries
                                        {(() => {
                                            const seen = new Set();
                                            const uniqueOpen = (database.inquiries || []).filter(i => {
                                                if (i.sharedToClient) return false;
                                                const phone = (i.userPhone || '').replace(/\D/g, '').slice(-10);
                                                const key = `${i.listingId || i.listingTitle}_${phone}`;
                                                if (seen.has(key)) return false;
                                                seen.add(key);
                                                return true;
                                            });
                                            return uniqueOpen.length > 0 ? (
                                                <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: 800, borderRadius: '10px', padding: '1px 6px' }}>
                                                    {uniqueOpen.length}
                                                </span>
                                            ) : null;
                                        })()}
                                    </span>
                                )}
                            </button>
                            
                            <button 
                                className={`nav-item ${adminTab === 'reports' ? 'active' : ''}`} 
                                onClick={() => setAdminTab('reports')}
                                title={navCollapsed ? "Reports" : undefined}
                                style={navCollapsed ? { padding: '12px 0', justifyContent: 'center', gap: 0 } : {}}
                            >
                                <BarChart3 size={18} />
                                {!navCollapsed && <span>Reports</span>}
                            </button>
                            
                            <button 
                                className="nav-item" 
                                onClick={() => {
                                    if (window.confirm("Are you sure you want to log out from Property Docs Admin Panel?")) {
                                        setRole('user');
                                        window.location.href = '/';
                                    }
                                }} 
                                title={navCollapsed ? "Logout" : undefined}
                                style={navCollapsed ? { padding: '12px 0', justifyContent: 'center', gap: 0, marginTop: 'auto', marginBottom: '16px' } : { marginTop: 'auto', marginBottom: '16px' }}
                            >
                                <LogOut size={18} />
                                {!navCollapsed && <span>Logout</span>}
                            </button>
                            
                            {/* Project Switcher Profile Card at the bottom */}
                            <div className="nav-profile-card" style={navCollapsed ? { padding: '10px 4px', justifyContent: 'center' } : {}}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', flexShrink: 0 }}>
                                    <img src="/logo.jpg" alt="Property Docs Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
                                </div>
                                {!navCollapsed && (
                                    <>
                                        <div className="nav-profile-info">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div className="nav-profile-title">Property Docs Developers</div>
                                                <span style={{ fontSize: '0.58rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>v1.0</span>
                                            </div>
                                            <div className="nav-profile-subtitle">growth is life...</div>
                                        </div>
                                        <ChevronDown size={16} className="nav-profile-chevron" />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {adminTab === 'dashboard' ? (
                        <DashboardManager 
                            database={database}
                            setAdminTab={setAdminTab}
                            showToast={showToast}
                        />
                    ) : adminTab === 'bookings' ? (
                        <BookingsManager 
                            database={database}
                            setDatabase={setDatabase}
                            showToast={showToast}
                        />
                    ) : adminTab === 'videos' ? (
                        <VideosManager 
                            database={database}
                            setDatabase={setDatabase}
                            showToast={showToast}
                        />
                    ) : adminTab === 'plots' ? (
                        <PlotsManager 
                            database={database}
                            setDatabase={setDatabase}
                            showToast={showToast}
                        />
                    ) : adminTab === 'clients' ? (
                        <ClientsManager 
                            database={database}
                            setDatabase={setDatabase}
                            showToast={showToast}
                        />
                    ) : adminTab === 'inquiries' ? (
                        <InquiriesManager 
                            database={database}
                            setDatabase={setDatabase}
                            showToast={showToast}
                        />
                    ) : adminTab === 'reports' ? (
                        <ReportsManager 
                            database={database}
                            showToast={showToast}
                        />
                    ) : adminTab === 'globalmap' ? (
                        <GlobalMap 
                            database={database} 
                        />
                    ) : (
                        <>
                            {/* Layouts List Middle Sidebar */}
                            <SidebarLeft 
                                mapData={mapData}
                                setMapData={setMapData}
                                selectedPlotId={selectedPlotId}
                                setSelectedPlotId={setSelectedPlotId}
                                activeFilter={activeFilter}
                                setActiveFilter={setActiveFilter}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                showToast={showToast}
                                collapsed={layoutsCollapsed}
                                isLocked={isLocked}
                                runAutoVectorization={runAutoVectorization}
                                ocrWords={ocrWords}
                                vecThreshold={vecThreshold}
                                setVecThreshold={setVecThreshold}
                                vecDilation={vecDilation}
                                setVecDilation={setVecDilation}
                                vecSimplify={vecSimplify}
                                setVecSimplify={setVecSimplify}
                            />

                            <input 
                                type="file" 
                                ref={refImageInput} 
                                accept="image/*,application/pdf" 
                                style={{ display: 'none' }} 
                                onChange={handleRefImageChange} 
                            />

                            {/* Custom Modal for Naming & Confirmations */}
                            {modalConfig && (
                                <div className="custom-modal-overlay animate-fade-in">
                                    <div className="custom-modal" style={modalConfig.type === 'edit_info' || modalConfig.type === 'upload_confirm' ? { maxWidth: '460px', width: '90%' } : {}}>
                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>{modalConfig.title}</h3>
                                        {modalConfig.type === 'edit_info' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Layout Sheet Name</label>
                                                    <input 
                                                        type="text" 
                                                        id="edit-info-name"
                                                        defaultValue={modalConfig.defaultValue.name}
                                                        placeholder="e.g. Property Docs Layout Sheet"
                                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>State</label>
                                                    <input 
                                                        type="text" 
                                                        id="edit-info-state"
                                                        defaultValue={modalConfig.defaultValue.state}
                                                        placeholder="e.g. Tamil Nadu"
                                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>District</label>
                                                    <input 
                                                        type="text" 
                                                        id="edit-info-district"
                                                        defaultValue={modalConfig.defaultValue.district}
                                                        placeholder="e.g. Erode"
                                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Area / Project Location</label>
                                                    <input 
                                                        type="text" 
                                                        id="edit-info-area"
                                                        defaultValue={modalConfig.defaultValue.area}
                                                        placeholder="e.g. Vijayamangalam"
                                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                            </div>
                                        ) : modalConfig.type === 'upload_confirm' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>State</label>
                                                    <input 
                                                        type="text" 
                                                        id="upload-info-state"
                                                        defaultValue={modalConfig.defaultValue.state}
                                                        placeholder="e.g. Tamil Nadu"
                                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>District</label>
                                                    <input 
                                                        type="text" 
                                                        id="upload-info-district"
                                                        defaultValue={modalConfig.defaultValue.district}
                                                        placeholder="e.g. Erode"
                                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Area / Project Location</label>
                                                    <input 
                                                        type="text" 
                                                        id="upload-info-area"
                                                        defaultValue={modalConfig.defaultValue.area}
                                                        placeholder="e.g. Vijayamangalam"
                                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                            </div>
                                        ) : modalConfig.type !== 'delete' ? (
                                            <input 
                                                type="text" 
                                                placeholder={modalConfig.placeholder} 
                                                defaultValue={modalConfig.defaultValue}
                                                id="modal-input-field"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        modalConfig.onConfirm(e.target.value);
                                                        setModalConfig(null);
                                                    }
                                                }}
                                                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                            />
                                        ) : (
                                            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '10px 0' }}>{modalConfig.message}</p>
                                        )}
                                        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                            <button className="btn-secondary" onClick={() => setModalConfig(null)} style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}>Cancel</button>
                                            <button 
                                                className="btn-primary" 
                                                onClick={() => {
                                                    if (modalConfig.type === 'edit_info') {
                                                        const name = document.getElementById("edit-info-name").value;
                                                        const state = document.getElementById("edit-info-state").value;
                                                        const district = document.getElementById("edit-info-district").value;
                                                        const area = document.getElementById("edit-info-area").value;
                                                        modalConfig.onConfirm({ name, state, district, area });
                                                    } else if (modalConfig.type === 'upload_confirm') {
                                                        const state = document.getElementById("upload-info-state").value;
                                                        const district = document.getElementById("upload-info-district").value;
                                                        const area = document.getElementById("upload-info-area").value;
                                                        modalConfig.onConfirm({ state, district, area });
                                                    } else {
                                                        const input = document.getElementById("modal-input-field");
                                                        modalConfig.onConfirm(input ? input.value : undefined);
                                                    }
                                                    setModalConfig(null);
                                                }}
                                                style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                                            >
                                                {modalConfig.type === 'delete' ? 'Delete' : modalConfig.type === 'upload_confirm' ? 'Proceed to Upload' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button 
                                className="sidebar-collapse-btn" 
                                style={{ 
                                    left: `${(navCollapsed ? 70 : 240) + (layoutsCollapsed ? 70 : 340) - 1}px`
                                }}
                                onClick={() => setLayoutsCollapsed(!layoutsCollapsed)}
                                title={layoutsCollapsed ? "Expand Layouts Sidebar" : "Collapse Layouts Sidebar"}
                            >
                                {layoutsCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                            </button>
                            
                            {/* Main Workspace (Map & Header controls) */}
                            <MapWorkspace 
                                mapData={mapData}
                                setMapData={setMapData}
                                selectedPlotId={selectedPlotId}
                                setSelectedPlotId={setSelectedPlotId}
                                currentTool={currentTool}
                                setCurrentTool={setCurrentTool}
                                layers={layers}
                                setLayers={setLayers}
                                theme={theme}
                                editMode={editMode}
                                setEditMode={setEditMode}
                                showToast={showToast}
                                isLocked={isLocked}
                                setIsLocked={setIsLocked}
                            />

                            {/* Collapsible Selected Plot Inspector Drawer */}
                            <SidebarRight 
                                mapData={mapData}
                                setMapData={setMapData}
                                selectedPlotId={selectedPlotId}
                                setSelectedPlotId={setSelectedPlotId}
                                showToast={showToast}
                                editMode={editMode}
                                setEditMode={setEditMode}
                            />
                        </>
                    )}
                </div>
            ) : null}    
            <ToastContainer toasts={toasts} />
        </div>
    );
}
