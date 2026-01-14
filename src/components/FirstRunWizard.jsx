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
        // Example URL - user should probably provide a real one or we host one
        // Using a dummy small file for test if real url not provided
        // But per request: "descargará desde la nube". 
        // I will use a placeholder or if user provides one. 
        // For now let's assume a variable we can easily change.
        const GAME_URL = "https://example.com/gta_sa_lite.zip";

        if (GAME_URL.includes("example.com")) {
            alert("¡OJO! No tengo una URL real del GTA. Por favor edita el componente FirstRunWizard.jsx con el link directo a tu .zip");
            setStep('selection');
            return;
        }

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
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleDownload}
                            >
                                <div className="icon-wrapper">
                                    <Download size={32} />
                                </div>
                                <div className="option-info">
                                    <h3>OBTENER EL JUEGO</h3>
                                    <p>Descargar e instalar automáticamente versión optimizada.</p>
                                </div>
                            </motion.button>

                            <motion.button
                                className="option-card locate"
                                whileHover={{ scale: 1.02 }}
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
                    <div className="progress-view">
                        <div className="spinner-container">
                            <HardDrive size={48} className="animate-pulse" />
                        </div>
                        <h2>{statusText}</h2>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${downloadProgress}%` }} />
                        </div>
                        <p className="sub-text">Por favor no cierres el launcher.</p>
                    </div>
                )}
            </motion.div>

            <style>{`
                .wizard-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.85);
                    backdrop-filter: blur(10px);
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }

                .wizard-card {
                    background: #141419;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 16px;
                    padding: 40px;
                    width: 90%;
                    max-width: 600px;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                }

                .wizard-header {
                    text-align: center;
                    margin-bottom: 30px;
                }

                .wizard-header h1 {
                    font-size: 24px;
                    font-weight: 800;
                    margin-bottom: 8px;
                    background: linear-gradient(to right, white, #94a3b8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .wizard-header p {
                    color: var(--text-muted, #94a3b8);
                    font-size: 14px;
                }

                .options-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 16px;
                }

                .option-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 12px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s;
                    color: white;
                }

                .option-card:hover {
                    background: rgba(255,255,255,0.06);
                    border-color: rgba(255,255,255,0.2);
                }

                .option-card.download .icon-wrapper {
                    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                }

                .option-card.locate .icon-wrapper {
                   background: linear-gradient(135deg, #10b981, #059669);
                }

                .icon-wrapper {
                    width: 50px;
                    height: 50px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .option-info h3 {
                    font-size: 16px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }

                .option-info p {
                    font-size: 13px;
                    color: var(--text-muted, #94a3b8);
                    margin: 0;
                }

                .progress-view {
                    text-align: center;
                    padding: 20px 0;
                }

                .progress-bar-container {
                    width: 100%;
                    height: 6px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                    margin: 20px 0;
                    overflow: hidden;
                }

                .progress-bar-fill {
                    height: 100%;
                    background: var(--accent-primary, #8b5cf6);
                    transition: width 0.3s;
                }
                
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
            `}</style>
        </div>
    );
};

export default FirstRunWizard;
