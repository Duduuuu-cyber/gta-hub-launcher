import React, { useState, useEffect } from 'react';
import { Download, Package, Check, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { send: () => { }, on: () => { }, removeListener: () => { }, invoke: () => Promise.resolve() } };

// URL to fetch mods from (can be switched to local for dev)
const MODS_API_URL = `https://raw.githubusercontent.com/Duduuuu-cyber/gta-hub-launcher/main/mods.json?t=${new Date().getTime()}`;
// const MODS_API_URL = './mods.json'; // Local fallback or relative path in build

const Mods = () => {
    const [mods, setMods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [installingId, setInstallingId] = useState(null); // ID of mod currently installing
    const [progress, setProgress] = useState(0);
    const [statusMsg, setStatusMsg] = useState('');
    const [installedMods, setInstalledMods] = useState([]); // Track locally installed mods (simple memory or localStorage)

    useEffect(() => {
        loadMods();
        // Load installed state from local storage
        const saved = localStorage.getItem('installed_mods');
        if (saved) setInstalledMods(JSON.parse(saved));

        // Listeners for download
        const handleProgress = (event, percent) => {
            setProgress(percent);
            setStatusMsg(`Descargando: ${Math.round(percent)}%`);
        };

        const handleComplete = async (event, zipPath) => {
            setStatusMsg('Extrayendo...');
            let gamePath = localStorage.getItem('gtapath');

            if (!gamePath) {
                alert("Error: No se ha configurado la ruta del juego.");
                setInstallingId(null);
                return;
            }

            // Fix nested modloader issue: If path ends in \modloader, strip it
            if (gamePath.toLowerCase().endsWith('\\modloader')) {
                gamePath = gamePath.substring(0, gamePath.lastIndexOf('\\'));
                console.log('Fixed nested path to:', gamePath);
            }

            try {
                const result = await ipcRenderer.invoke('extract-game', zipPath, gamePath);
                if (result.success) {
                    markAsInstalled(installingId);
                    setStatusMsg('¡Instalado con éxito!');
                } else {
                    alert('Error al instalar mod: ' + result.error);
                }
            } catch (err) {
                console.error(err);
                alert('Error crítico en instalación.');
            }

            setInstallingId(null);
            setProgress(0);
        };

        const handleError = (event, err) => {
            alert('Error en descarga: ' + err);
            setInstallingId(null);
            setProgress(0);
        };

        ipcRenderer.on('download-progress', handleProgress);
        // Note: We might need a unique interaction channel for mods if parallel downloads allowed,
        // but 'download-game-start' is our global downloader for now.
        // For this demo, we assume one download at a time.
        ipcRenderer.on('download-complete', handleComplete);
        ipcRenderer.on('download-error', handleError);

        return () => {
            ipcRenderer.removeListener('download-progress', handleProgress);
            ipcRenderer.removeListener('download-complete', handleComplete);
            ipcRenderer.removeListener('download-error', handleError);
        };
    }, [installingId]);

    const loadMods = async () => {
        try {
            // Try fetch remote first
            const response = await fetch(MODS_API_URL);
            if (!response.ok) throw new Error("Remote load failed");
            const data = await response.json();
            setMods(data);
        } catch (e) {
            console.warn("Remote/Github mods load failed, trying local backup...", e);
            try {
                // Fallback attempt (local public/mods.json)
                const localResponse = await fetch('./mods.json');
                if (localResponse.ok) {
                    const localData = await localResponse.json();
                    setMods(localData);
                } else {
                    console.error("Local backup mods.json not found.");
                }
            } catch (localErr) {
                console.error("Local load failed:", localErr);
            }
        } finally {
            setLoading(false);
        }
    };

    const markAsInstalled = (id) => {
        const newInstalled = [...installedMods, id];
        setInstalledMods(newInstalled);
        localStorage.setItem('installed_mods', JSON.stringify(newInstalled));
    };

    const handleInstall = (mod) => {
        if (installingId) return; // Busy
        if (!mod.downloadUrl) return;

        const confirmInstall = window.confirm(`¿Quieres instalar "${mod.name}" en tu GTA San Andreas?`);
        if (!confirmInstall) return;

        setInstallingId(mod.id);
        setProgress(0);
        setStatusMsg('Iniciando descarga...');

        // Use the existing game downloader IPC
        // Ideally we pass a target filename like "mod_temp.zip"
        // The main process usually saves to a temp or specific file. 
        // We'll trust it downloads to where it downloads.
        const targetPath = 'mod_temp.zip'; // This might need absolute path logic in Main, or we pass just name?
        // Checking main.js: it takes (url, targetPath). targetPath must be absolute?
        // Let's invoke a helper to get temp path if needed.
        // Actually, let's use a dummy path and let main handle it or pass full path based on app path.

        // For robust pathing, let's ask main for a temp path or app path
        ipcRenderer.invoke('get-app-path').then(appPath => {
            const fullZipPath = appPath + '\\mod_temp_' + mod.id + '.zip';
            ipcRenderer.send('download-game-start', mod.downloadUrl, fullZipPath);
        });
    };

    return (
        <div className="mods-container animate-fade-in">
            <h2 className="page-title">
                <Package className="icon-title" /> Mods y Addons
            </h2>
            <p className="page-subtitle">Personaliza tu experiencia con mods verificados.</p>

            {loading ? (
                <div className="loading-state">
                    <Loader2 className="spin" size={32} />
                    <span>Cargando catálogo...</span>
                </div>
            ) : (
                <div className="mods-grid">
                    {mods.map((mod) => {
                        const isInstalled = installedMods.includes(mod.id);
                        const isInstalling = installingId === mod.id;

                        return (
                            <div key={mod.id} className="mod-card glass-panel">
                                <div className="mod-image" style={{ backgroundImage: `url(${mod.imageUrl || 'https://via.placeholder.com/300x150?text=No+Image'})` }}>
                                    <div className="mod-category-badge">{mod.category}</div>
                                </div>
                                <div className="mod-content">
                                    <h3>{mod.name}</h3>
                                    <p>{mod.description}</p>

                                    <div className="mod-actions">
                                        {isInstalling ? (
                                            <div className="install-status">
                                                <Loader2 size={16} className="spin" />
                                                <span>{statusMsg}</span>
                                                <div className="mini-progress">
                                                    <div className="fill" style={{ width: `${progress}%` }}></div>
                                                </div>
                                            </div>
                                        ) : isInstalled ? (
                                            <button className="btn-installed" onClick={() => handleInstall(mod)}>
                                                <Check size={16} /> Reinstalar
                                            </button>
                                        ) : (
                                            <button className="btn-install" onClick={() => handleInstall(mod)}>
                                                <Download size={16} /> Instalar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <style>{`
                .mods-container {
                    padding: 40px;
                    height: 100%;
                    overflow-y: auto;
                    color: white;
                }
                .page-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 28px;
                    margin-bottom: 8px;
                }
                .icon-title {
                    color: var(--accent-primary);
                }
                .page-subtitle {
                    color: var(--text-muted);
                    margin-bottom: 32px;
                }
                .mods-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 24px;
                }
                .mod-card {
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    transition: transform 0.2s;
                }
                .mod-card:hover {
                    transform: translateY(-4px);
                    background: var(--bg-card-hover);
                }
                .mod-image {
                    height: 140px;
                    background-size: cover;
                    background-position: center;
                    position: relative;
                }
                .mod-category-badge {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(0,0,0,0.7);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    backdrop-filter: blur(4px);
                }
                .mod-content {
                    padding: 16px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                .mod-content h3 {
                    font-size: 16px;
                    margin-bottom: 8px;
                    font-weight: 700;
                }
                .mod-content p {
                    font-size: 13px;
                    color: var(--text-muted);
                    margin-bottom: 16px;
                    line-height: 1.4;
                    flex: 1;
                }
                .btn-install {
                    width: 100%;
                    padding: 10px;
                    border-radius: 8px;
                    border: none;
                    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: filter 0.2s;
                }
                .btn-install:hover {
                    filter: brightness(1.2);
                }
                .btn-installed {
                    width: 100%;
                    padding: 10px;
                    border-radius: 8px;
                    border: 1px solid #22c55e;
                    background: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    cursor: default;
                }
                .install-status {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    font-size: 12px;
                    color: var(--accent-primary);
                    width: 100%;
                }
                .mini-progress {
                    width: 100%;
                    height: 8px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                    overflow: hidden;
                    margin-top: 4px;
                }
                .mini-progress .fill {
                    height: 100%;
                    background: var(--accent-primary);
                    transition: width 0.3s;
                    box-shadow: 0 0 10px var(--accent-primary);
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Mods;
