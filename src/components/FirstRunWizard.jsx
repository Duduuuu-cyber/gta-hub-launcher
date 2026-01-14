import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Download, HardDrive } from 'lucide-react';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { send: () => { }, on: () => { }, removeListener: () => { }, invoke: () => { } } };

const FirstRunWizard = ({ onComplete }) => {
    const [step, setStep] = useState('selection'); // selection, downloading, extracting, success
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [statusText, setStatusText] = useState('');

    useEffect(() => {
        // Listeners
        const handleProgress = (event, percent) => {
            setDownloadProgress(percent);
            setStatusText(`DESCARGANDO: ${Math.round(percent)}%`);
        };

        const handleDownloadComplete = async (event, zipPath) => {
            setStep('extracting');
            setStatusText('DESCOMPRIMIENDO JUEGO...');
            // Need the app path to extract
            const appPath = await ipcRenderer.invoke('get-app-path');
            const targetDir = appPath; // Extract to root or a subfolder? Let's say user wants it "in the launcher root"

            const result = await ipcRenderer.invoke('extract-game', zipPath, targetDir);
            if (result.success) {
                // Set path in LS
                localStorage.setItem('gtapath', targetDir);
                setStatusText('¡INSTALACIÓN COMPLETADA!');
                setTimeout(onComplete, 1500);
            } else {
                alert('Error al extraer: ' + result.error);
                setStep('selection');
            }
        };

        const handleError = (event, error) => {
            alert('Error en descarga: ' + error);
            setStep('selection');
        };

        ipcRenderer.on('download-progress', handleProgress);
        ipcRenderer.on('download-complete', handleDownloadComplete);
        ipcRenderer.on('download-error', handleError);

        return () => {
            ipcRenderer.removeListener('download-progress', handleProgress);
            ipcRenderer.removeListener('download-complete', handleDownloadComplete);
            ipcRenderer.removeListener('download-error', handleError);
        }
    }, [onComplete]);

    const handleLocate = async () => {
        const path = await ipcRenderer.invoke('select-directory', 'Selecciona tu carpeta GTA San Andreas');
        if (path) {
            // Verify
            const isValid = await ipcRenderer.invoke('check-game-files', path);
            if (isValid) {
                localStorage.setItem('gtapath', path);
                onComplete();
            } else {
                alert('Esa carpeta no parece contener un GTA San Andreas válido (falta gta_sa.exe).');
            }
        }
    };

    const handleDownload = async () => {
        setStep('downloading');
        // Real URL provided by user
        const GAME_URL = "https://launcher.seoul-rp.net/archivos/GTA_FULL.zip";

        const appPath = await ipcRenderer.invoke('get-app-path');
        const zipTarget = appPath + '\\gta_temp.zip';

        ipcRenderer.send('download-game-start', GAME_URL, zipTarget);
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

                        <div className="options-grid">
                            <motion.button
                                className="option-card download"
                                whileHover={{ scale: 1.02, borderColor: "rgba(59, 130, 246, 0.5)" }}
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
                                whileHover={{ scale: 1.02, borderColor: "rgba(16, 185, 129, 0.5)" }}
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

                        <p className="sub-text-warning">Por favor no cierres el launcher. Esto puede tomar unos minutos.</p>
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

                .option-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 16px;
                    padding: 24px;
                    display: flex;
                    align-items: center;
                    gap: 24px;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s;
                    color: white;
                }

                .option-card:hover {
                    background: rgba(255,255,255,0.06);
                    border-color: rgba(255,255,255,0.2);
                }

                .option-card.download .icon-wrapper { background: linear-gradient(135deg, #60a5fa, #2563eb); box-shadow: 0 0 20px rgba(37, 99, 235, 0.3); }
                .option-card.locate .icon-wrapper { background: linear-gradient(135deg, #34d399, #059669); box-shadow: 0 0 20px rgba(5, 150, 105, 0.3); }
                
                .icon-wrapper { width: 60px; height: 60px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; }

                /* Progress View Styles */
                .progress-view { display: flex; flex-direction: column; align-items: center; width: 100%; }
                
                .hex-spinner {
                    width: 60px;
                    height: 60px;
                    border: 4px solid rgba(255,255,255,0.1);
                    border-left-color: var(--accent-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 24px;
                }

                .status-title {
                    font-size: 20px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    margin-bottom: 30px;
                    background: linear-gradient(to right, white, #cbd5e1);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .progress-container-cyber {
                    width: 100%;
                    height: 12px;
                    background: rgba(0,0,0,0.4);
                    border-radius: 6px;
                    position: relative;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.1);
                }

                .progress-bar-fill-cyber {
                    height: 100%;
                    background: linear-gradient(90deg, var(--accent-secondary), var(--accent-primary));
                    width: 0%;
                    transition: width 0.2s ease-out;
                    box-shadow: 0 0 20px var(--accent-primary);
                }
                
                .progress-glow {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 20px;
                    background: rgba(255,255,255,0.8);
                    filter: blur(5px);
                    opacity: 0.6;
                    transition: left 0.2s ease-out;
                }

                .stats-row {
                    display: flex;
                    justify-content: space-between;
                    width: 100%;
                    margin-top: 12px;
                    font-size: 14px;
                    font-family: monospace;
                    color: rgba(255,255,255,0.6);
                }

                .sub-text-warning {
                    margin-top: 30px;
                    font-size: 13px;
                    color: #fbbf24;
                    background: rgba(251, 191, 36, 0.1);
                    padding: 8px 16px;
                    border-radius: 20px;
                }

                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default FirstRunWizard;
