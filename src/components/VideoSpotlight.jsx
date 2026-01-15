import React, { useEffect, useState } from 'react';
import { Play, Tv } from 'lucide-react';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { send: () => { } } };

const VideoSpotlight = () => {
    const [video, setVideo] = useState(null);

    // URL for remote updates (change this to your valid GitHub usage)
    const VIDEOS_API_URL = 'https://raw.githubusercontent.com/Duduuuu-cyber/gta-hub-launcher/refs/heads/main/videos.json';

    useEffect(() => {
        const fetchVideos = async () => {
            let data = [];
            try {
                // Try fetching remote first
                const response = await fetch(`${VIDEOS_API_URL}?t=${new Date().getTime()}`);
                if (response.ok) {
                    data = await response.json();
                }
            } catch (err) {
                console.warn('Failed to fetch remote videos, using fallback.', err);
            }

            // Fallback content if fetch fails or is empty
            if (!data || data.length === 0) {
                data = [
                    {
                        "id": "triplek_latest",
                        "title": "[SEOUL-RP.net] LSPD | Persecución Sultan #1 — ¡PINCHOS, PINCHOS!",
                        "channel": "TRIPLEK",
                        "url": "https://www.youtube.com/watch?v=fOFizPkJDI0",
                        "thumbnail": "https://i.ytimg.com/vi/fOFizPkJDI0/maxresdefault.jpg"
                    },
                    {
                        "id": "slns_latest",
                        "title": "Smirovich Late Night Show - Podcast NAVIDEÑO!!!!",
                        "channel": "SLNS",
                        "url": "https://www.youtube.com/watch?v=ZPjKRAkOJG0",
                        "thumbnail": "https://i.ytimg.com/vi/ZPjKRAkOJG0/hqdefault.jpg"
                    },
                    {
                        "id": "duduu_latest",
                        "title": "COMO INSTALAR EL LAUNCHER EN 1 MINUTO",
                        "channel": "DUDUU DEV",
                        "url": "https://www.youtube.com/watch?v=fOFizPkJDI0",
                        "thumbnail": "https://i.ytimg.com/vi/fOFizPkJDI0/hqdefault.jpg"
                    }
                ];
            }

            // Pick random
            if (data.length > 0) {
                const random = data[Math.floor(Math.random() * data.length)];
                setVideo(random);
            }
        };

        fetchVideos();
    }, []);

    if (!video) return null;

    return (
        <div className="spotlight-card animate-slide-in" onClick={() => ipcRenderer.send('open-external', video.url)}>
            <div className="spotlight-badge">
                <Tv size={12} />
                <span>DESTACADO</span>
            </div>

            <div className="spotlight-image" style={{ backgroundImage: `url(${video.thumbnail})` }}>
                <div className="play-overlay">
                    <div className="play-circle">
                        <Play size={24} fill="white" />
                    </div>
                </div>
            </div>

            <div className="spotlight-content">
                <span className="channel-name">{video.channel}</span>
                <h3 className="video-title">{video.title}</h3>
            </div>

            <style>{`
            .spotlight-card {
                width: 320px;
                background: rgba(20, 20, 25, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                padding: 12px;
                cursor: pointer;
                position: relative;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                transform-origin: center right;
                animation: slideInRight 0.8s ease-out backwards;
                animation-delay: 0.3s;
            }
            
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }

            .spotlight-card:hover {
                transform: translateY(-5px) scale(1.02);
                border-color: var(--accent-primary);
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                background: rgba(30, 30, 40, 0.8);
            }

            .spotlight-badge {
                position: absolute;
                top: -10px;
                right: 20px;
                background: linear-gradient(90deg, #f59e0b, #d97706);
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 800;
                display: flex;
                align-items: center;
                gap: 4px;
                box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);
                z-index: 10;
                border: 1px solid rgba(255,255,255,0.2);
            }

            .spotlight-image {
                height: 160px;
                width: 100%;
                border-radius: 12px;
                background-size: cover;
                background-position: center;
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            }
            
            .play-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s;
            }
            
            .spotlight-card:hover .play-overlay {
                opacity: 1;
            }
            
            .play-circle {
                width: 50px;
                height: 50px;
                background: rgba(255,255,255,0.2);
                backdrop-filter: blur(4px);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid rgba(255,255,255,0.5);
                transform: scale(0.8);
                transition: transform 0.3s;
            }
            
            .spotlight-card:hover .play-circle {
                transform: scale(1);
                background: var(--accent-primary);
                border-color: transparent;
            }

            .spotlight-content {
                margin-top: 12px;
                padding: 0 4px;
            }

            .channel-name {
                font-size: 11px;
                color: var(--accent-primary);
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .video-title {
                font-size: 14px;
                font-weight: 600;
                line-height: 1.4;
                margin-top: 4px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                color: white;
            }
        `}</style>
        </div>
    );
};

export default VideoSpotlight;
