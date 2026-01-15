import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Download, HardDrive } from 'lucide-react';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { send: () => { }, on: () => { }, removeListener: () => { }, invoke: () => { } } };

const FirstRunWizard = ({ onComplete }) => {
    const [step, setStep] = useState('selection'); // selection, downloading, extracting, success
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [downloadType, setDownloadType] = useState('game'); // 'game' or 'cache'

    // URLS
    const GAME_URL = "https://launcher.seoul-rp.net/archivos/GTA%20FULL.zip";
    const CACHE_URL = "https://github.com/Duduuuu-cyber/gta-hub-launcher/releases/download/cache-v1/cacheseoul.zip";

    useEffect(() => {
        // Listeners
        const handleProgress = (event, percent) => {
            setDownloadProgress(percent);
            setStatusText(`DESCARGANDO: ${Math.round(percent)}%`);
        };

        const handleDownloadComplete = async (event, zipPath) => {
            setStep('extracting');
            setStatusText('DESCOMPRIMIENDO...');

            // Determine target based on what we just downloaded
            if (downloadType === 'game') {
                const appPath = await ipcRenderer.invoke('get-app-path');
                const targetDir = appPath;

                const result = await ipcRenderer.invoke('extract-game', zipPath, targetDir);
                if (result.success) {
                    let finalGamePath = targetDir;

                    // Verify if gta_sa.exe is in root, or in a subfolder
                    const fs = window.require('fs');
                    const path = window.require('path');

                    if (!fs.existsSync(path.join(targetDir, 'gta_sa.exe'))) {
                        // Not in root, check subdirectories (1 level deep)
                        try {
                            const subdirs = fs.readdirSync(targetDir, { withFileTypes: true })
                                .filter(dirent => dirent.isDirectory())
                                .map(dirent => dirent.name);

                            for (const subdir of subdirs) {
                                const subPath = path.join(targetDir, subdir);
                                if (fs.existsSync(path.join(subPath, 'gta_sa.exe'))) {
                                    finalGamePath = subPath;
                                    break;
                                }
                            }
                        } catch (err) {
                            console.error('Error scanning subdirs:', err);
                        }
                    }

                    console.log('Final Game Path detected:', finalGamePath);
                    localStorage.setItem('gtapath', finalGamePath);

                    // Set Registry
                    await ipcRenderer.invoke('set-registry-value', 'HKCU\\Software\\SAMP', 'gta_sa_exe', path.join(finalGamePath, 'gta_sa.exe'));

                    // Check for cache immediately after game install? 
                    // Usually the full game pack includes it, but let's be safe:
                    const hasCache = await ipcRenderer.invoke('check-cache-exists', finalGamePath);
                    if (!hasCache) {
                        setStatusText('JUEGO LISTO. VERIFICANDO CACHÉ...');
                        setStep('missing_cache');
                    } else {
                        setStatusText('¡INSTALACIÓN COMPLETADA!');
                        setTimeout(onComplete, 1500);
                    }
                } else {
                    alert('Error al extraer juego: ' + result.error);
                    setStep('selection');
                }
            } else if (downloadType === 'cache') {
                setStatusText('INSTALANDO CACHÉ...');
                // We are downloading the cache. Target is the game folder.
                const gamePath = localStorage.getItem('gtapath');
                if (!gamePath) {
                    alert('Error crítico: Se perdió la ruta del juego.');
                    setStep('selection');
                    return;
                }

                // Extract to game folder. Result should be gamePath/cacheseoul
                const result = await ipcRenderer.invoke('extract-game', zipPath, gamePath);

                if (result.success) {
                    // Configure Cache Path in Settings/Registry
                    const fullCachePath = gamePath + '\\cacheseoul';
                    localStorage.setItem('cachepath', fullCachePath);

                    // Set Registry
                    await ipcRenderer.invoke('set-registry-value', 'HKCU\\Software\\SAMP', 'model_cache', fullCachePath);

                    setStatusText('¡CACHÉ INSTALADA CORRECTAMENTE!');
                    setTimeout(onComplete, 1500);
                } else {
                    alert('Error al extraer cache: ' + result.error);
                    setStep('missing_cache');
                }
            }
        };

        const handleError = (event, error) => {
            alert('Error en descarga: ' + error);
            // If cache failed, go back to missing_cache, else selection
            if (downloadType === 'cache') {
                setStep('missing_cache');
            } else {
                setStep('selection');
            }
        };

        ipcRenderer.on('download-progress', handleProgress);
        ipcRenderer.on('download-complete', handleDownloadComplete);
        ipcRenderer.on('download-error', handleError);

        return () => {
            ipcRenderer.removeListener('download-progress', handleProgress);
            ipcRenderer.removeListener('download-complete', handleDownloadComplete);
            ipcRenderer.removeListener('download-error', handleError);
        }
    }, [onComplete, downloadType]);

    const handleLocate = async () => {
        const path = await ipcRenderer.invoke('select-directory', 'Selecciona tu carpeta GTA San Andreas');
        if (path) {
            // Verify gta_sa.exe
            const isValid = await ipcRenderer.invoke('check-game-files', path);
            if (isValid) {
                // Verify cacheseoul
                const hasCache = await ipcRenderer.invoke('check-cache-exists', path);

                if (!hasCache) {
                    localStorage.setItem('gtapath', path);
                    // Also set Registry so game works immediately
                    const exePath = path + '\\gta_sa.exe';
                    await ipcRenderer.invoke('set-registry-value', 'HKCU\\Software\\SAMP', 'gta_sa_exe', exePath);
                    setStep('missing_cache');
                } else {
                    localStorage.setItem('gtapath', path);
                    // Also set Registry
                    const exePath = path + '\\gta_sa.exe';
                    await ipcRenderer.invoke('set-registry-value', 'HKCU\\Software\\SAMP', 'gta_sa_exe', exePath);
                    onComplete();
                }
            } else {
                alert('Esa carpeta no parece contener un GTA San Andreas válido (falta gta_sa.exe).');
            }
        }
    };

    const handleDownload = async () => {
        setDownloadType('game');
        setStep('downloading');

        const appPath = await ipcRenderer.invoke('get-app-path');
        const zipTarget = appPath + '\\gta_temp.zip';

        ipcRenderer.send('download-game-start', GAME_URL, zipTarget);
    };

    const handleCacheDownload = async () => {
        setDownloadType('cache');
        setStep('downloading');

        const appPath = await ipcRenderer.invoke('get-app-path');
        const zipTarget = appPath + '\\cache_temp.zip';

        ipcRenderer.send('download-game-start', CACHE_URL, zipTarget);
    };

    return (
        <div className="wizard-overlay">
            <motion.div
                className="wizard-card"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                {step === 'selection' && (
                    <>
                        <div className="wizard-header">
                            <h1>CONFIGURACIÓN INICIAL</h1>
                            <p>No detectamos una instalación de GTA San Andreas vinculada.</p>
                        </div>

                        <div className="options-container">
                            <motion.button
                                className="option-card download"
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleDownload}
                            >
                                <div className="icon-wrapper">
                                    <Download size={32} />
                                </div>
                                <div className="option-info">
                                    <h3>OBTENER EL JUEGO</h3>
                                    <p>Descargar versión optimizada (Recomendado)</p>
                                </div>
                            </motion.button>

                            <motion.button
                                className="option-card locate"
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleLocate}
                            >
                                <div className="icon-wrapper">
                                    <FolderOpen size={32} />
                                </div>
                                <div className="option-info">
                                    <h3>YA TENGO EL JUEGO</h3>
                                    <p>Seleccionar carpeta existente en mi PC.</p>
                                </div>
                            </motion.button>
                        </div>
                    </>
                )}

                {(step === 'downloading' || step === 'extracting') && (
                    <motion.div
                        className="progress-view"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="spinner-container">
                            <div className="hex-spinner"></div>
                        </div>
                        <h2 className="status-title">{statusText}</h2>

                        <div className="progress-container-cyber">
                            <div className="progress-bar-fill-cyber" style={{ width: `${downloadProgress}%` }} />
                            <div className="progress-glow" style={{ left: `${downloadProgress}%` }} />
                        </div>

                        <div className="stats-row">
                            <span>{step === 'downloading' ? 'Descargando archivos...' : 'Descomprimiendo y verificando...'}</span>
                            <span className="percent-text">{Math.round(downloadProgress)}%</span>
                        </div>

                        {step === 'downloading' && (
                            <motion.button
                                className="cancel-button"
                                whileHover={{ scale: 1.05, color: "#ef4444" }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    ipcRenderer.send('download-game-cancel');
                                    setStep('selection');
                                    setDownloadProgress(0);
                                }}
                            >
                                Cancelar Descarga
                            </motion.button>
                        )}

                        <p className="sub-text-warning">Por favor no cierres el launcher. Esto puede tomar unos minutos.</p>
                    </motion.div>
                )}

                {step === 'missing_cache' && (
                    <motion.div
                        className="cache-view"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="alert-icon-wrapper">
                            <HardDrive size={48} color="#fbbf24" />
                        </div>
                        <h2>¿DESCARGAR CACHÉ?</h2>
                        <p>No encontramos la carpeta oficial <code>cacheseoul</code>. ¿Quieres descargarla para ver los modelos personalizados?</p>

                        <div className="cache-actions">
                            <motion.button
                                className="primary-btn"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleCacheDownload}
                            >
                                <Download size={20} />
                                SÍ, DESCARGAR (RECOMENDADO)
                            </motion.button>

                            <button
                                className="secondary-btn"
                                onClick={() => {
                                    // User skips cache download
                                    // Just finish config with what they have
                                    const gtaPath = localStorage.getItem('gtapath');
                                    if (gtaPath) {
                                        onComplete();
                                    } else {
                                        setStep('selection');
                                    }
                                }}
                            >
                                NO GRACIAS, OMITIR
                            </button>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            <style>{`
                .wizard-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(5, 5, 10, 0.95);
                    backdrop-filter: blur(20px);
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }

                .wizard-card {
                    background: linear-gradient(145deg, #1a1a23, #111116);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 24px;
                    padding: 50px;
                    width: 90%;
                    max-width: 650px;
                    box-shadow: 0 0 50px rgba(0,0,0,0.6);
                    position: relative;
                    overflow: hidden;
                }
                
                .wizard-header {
                    text-align: center;
                    margin-bottom: 40px;
                }
                
                .wizard-header h1 {
                     font-size: 28px;
                     margin-bottom: 10px;
                }

                .options-container {
                    display: flex;
                    flex-direction: column;
                    gap: 20px; /* Separación clara entre los botones */
                    width: 100%;
                }

                .option-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 16px;
                    padding: 30px; /* Más padding para que sean "largos" (altos) */
                    display: flex;
                    align-items: center;
                    gap: 24px;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s;
                    color: white;
                    width: 100%; /* Ocupar todo el ancho disponible */
                    position: relative;
                }

                .option-card:hover {
                    background: rgba(255,255,255,0.06);
                    border-color: rgba(255,255,255,0.2);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }

                .option-card.download .icon-wrapper { background: linear-gradient(135deg, #60a5fa, #2563eb); box-shadow: 0 0 20px rgba(37, 99, 235, 0.3); }
                .option-card.locate .icon-wrapper { background: linear-gradient(135deg, #34d399, #059669); box-shadow: 0 0 20px rgba(5, 150, 105, 0.3); }
                
                .icon-wrapper { 
                    width: 64px; 
                    height: 64px; 
                    border-radius: 16px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    flex-shrink: 0; 
                    color: white; 
                }
                
                .option-info h3 {
                    font-size: 18px;
                    font-weight: 700;
                    margin-bottom: 6px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                 .option-info p {
                    font-size: 14px;
                    color: #94a3b8;
                    margin: 0;
                }

                /* Progress View Styles */
                .progress-view { display: flex; flex-direction: column; align-items: center; width: 100%; padding: 20px; }
                
                .hex-spinner {
                    width: 70px;
                    height: 70px;
                    border: 4px solid rgba(255,255,255,0.1);
                    border-left-color: var(--accent-primary, #6366f1);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 30px;
                }

                .status-title {
                    font-size: 22px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    margin-bottom: 30px;
                    background: linear-gradient(to right, white, #cbd5e1);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .progress-container-cyber {
                    width: 100%;
                    height: 14px;
                    background: rgba(0,0,0,0.4);
                    border-radius: 7px;
                    position: relative;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.1);
                }

                .progress-bar-fill-cyber {
                    height: 100%;
                    background: linear-gradient(90deg, #818cf8, #6366f1);
                    width: 0%;
                    transition: width 0.2s ease-out;
                    box-shadow: 0 0 20px #6366f1;
                }
                
                .progress-glow {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 40px;
                    background: rgba(255,255,255,0.6);
                    filter: blur(10px);
                    opacity: 0.5;
                    transition: left 0.2s ease-out;
                }

                .stats-row {
                    display: flex;
                    justify-content: space-between;
                    width: 100%;
                    margin-top: 15px;
                    font-size: 14px;
                    font-family: 'Consolas', monospace;
                    color: rgba(255,255,255,0.7);
                }

                .sub-text-warning {
                    margin-top: 40px;
                    font-size: 13px;
                    color: #fbbf24;
                    background: rgba(251, 191, 36, 0.1);
                    padding: 8px 16px;
                    border-radius: 20px;
                }

                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

                .cancel-button {
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.2);
                    color: rgba(255,255,255,0.7);
                    padding: 8px 16px;
                    border-radius: 20px;
                    margin-top: 20px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                }
                
                .cancel-button:hover {
                    border-color: #ef4444; 
                    background: rgba(239, 68, 68, 0.1);
                }

                /* Cache View */
                .cache-view {
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                }
                
                .alert-icon-wrapper {
                    background: rgba(251, 191, 36, 0.1);
                    padding: 20px;
                    border-radius: 50%;
                    border: 1px solid rgba(251, 191, 36, 0.2);
                    box-shadow: 0 0 30px rgba(251, 191, 36, 0.2);
                }

                .cache-view h2 {
                    font-size: 24px;
                    margin: 0;
                }
                
                .cache-view p {
                    color: #94a3b8;
                    max-width: 400px;
                    line-height: 1.5;
                }
                
                .cache-view code {
                    background: rgba(0,0,0,0.3);
                    padding: 2px 6px;
                    border-radius: 4px;
                    color: #fbbf24;
                    font-family: monospace;
                }

                .cache-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    width: 100%;
                    margin-top: 10px;
                }

                .primary-btn {
                    background: linear-gradient(135deg, #fbbf24, #d97706);
                    border: none;
                    border-radius: 12px;
                    padding: 16px;
                    color: black;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    cursor: pointer;
                    width: 100%;
                }

                .secondary-btn {
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.1);
                    color: rgba(255,255,255,0.5);
                    padding: 12px;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .secondary-btn:hover {
                    background: rgba(255,255,255,0.05);
                    color: white;
                }
            `}</style>
        </div>
    );
};

export default FirstRunWizard;
