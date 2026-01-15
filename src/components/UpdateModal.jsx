import React from 'react';
import { Megaphone } from 'lucide-react';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { send: () => { } } };

const UpdateModal = ({
    updateInfo,
    onClose,
    isDownloading,
    downloadProgress,
    readyToInstall,
    onStartUpdate,
    onInstallUpdate
}) => {
    return (
        <div className="modal-overlay">
            <div className="update-modal">
                <div className="modal-header">
                    <Megaphone size={24} className="modal-icon" />
                    <h2>¡Nueva Actualización Disponible!</h2>
                </div>

                {!isDownloading && !readyToInstall && (
                    <>
                        <p className="modal-text">
                            Se ha encontrado una nueva versión del launcher
                            <span className="version-tag">v{updateInfo?.version}</span>.
                            ¿Deseas actualizar ahora?
                        </p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={onClose}>Más tarde</button>
                            <button className="btn-confirm" onClick={onStartUpdate}>ACTUALIZAR AHORA</button>
                        </div>
                    </>
                )}

                {isDownloading && (
                    <div className="download-status">
                        <p>Descargando actualización...</p>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${downloadProgress}%` }}></div>
                        </div>
                        <span className="progress-text">{Math.round(downloadProgress)}%</span>
                    </div>
                )}

                {readyToInstall && (
                    <>
                        <p className="modal-text success">
                            ¡Descarga completada correctamente!
                            El launcher necesita reiniciarse para aplicar los cambios.
                        </p>
                        <div className="modal-actions">
                            <button className="btn-confirm" onClick={onInstallUpdate}>REINICIAR E INSTALAR</button>
                        </div>
                    </>
                )}
            </div>
            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.8);
                    backdrop-filter: blur(5px);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIn 0.3s ease-out;
                }

                .update-modal {
                    background: #1e1b4b;
                    border: 1px solid var(--accent-primary);
                    padding: 32px;
                    border-radius: 16px;
                    width: 450px;
                    box-shadow: 0 0 50px rgba(99, 102, 241, 0.4);
                    text-align: center;
                    color: white;
                    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .modal-header {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .modal-icon {
                    color: var(--accent-primary);
                    filter: drop-shadow(0 0 10px var(--accent-primary));
                }

                .update-modal h2 {
                    margin: 0;
                    font-size: 24px;
                    background: linear-gradient(to right, white, #cbd5e1);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .modal-text {
                    color: #94a3b8;
                    margin-bottom: 32px;
                    line-height: 1.6;
                }

                .version-tag {
                    color: var(--accent-primary);
                    background: rgba(99, 102, 241, 0.1);
                    padding: 2px 8px;
                    border-radius: 4px;
                    margin: 0 6px;
                    font-family: monospace;
                    border: 1px solid rgba(99, 102, 241, 0.2);
                }

                .modal-actions {
                    display: flex;
                    gap: 16px;
                    justify-content: center;
                }

                .btn-cancel {
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-cancel:hover {
                    background: rgba(255, 255, 255, 0.05);
                }

                .btn-confirm {
                    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
                    border: none;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
                    transition: all 0.2s;
                }

                .btn-confirm:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
                }

                .progress-bar-container {
                    width: 100%;
                    height: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    overflow: hidden;
                    margin: 16px 0;
                }

                .progress-bar-fill {
                    height: 100%;
                    background: var(--accent-primary);
                    border-radius: 4px;
                    transition: width 0.3s ease-out;
                }

                .success {
                    color: #4ade80;
                }
            `}</style>
        </div>
    );
};

export default UpdateModal;
