import React, { useState, useEffect } from 'react';
import { Server, Plus, Trash2, Star, RefreshCw, Play, X, User, Activity, Globe, Zap, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock ipcRenderer for web dev
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { invoke: () => Promise.resolve({}), send: () => { } } };

const Servers = () => {
    // Initial servers list
    const [servers, setServers] = useState(() => {
        const saved = localStorage.getItem('saved_servers');
        return saved ? JSON.parse(saved) : [
            { address: 'samp.seoul-rp.net:7777', favorite: true },
            { address: '192.99.245.207:7777', favorite: true }
        ];
    });

    const [serverData, setServerData] = useState({});
    const [loading, setLoading] = useState({});

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newServerIp, setNewServerIp] = useState('');

    const [connectModalServer, setConnectModalServer] = useState(null); // Server Object or null
    const [nickname, setNickname] = useState('');

    useEffect(() => {
        refreshAll();
        loadNickname();
    }, []);

    // Save servers on change
    useEffect(() => {
        const toSave = servers.map(s => ({ address: s.address, favorite: s.favorite }));
        localStorage.setItem('saved_servers', JSON.stringify(toSave));
    }, [servers]);

    const loadNickname = async () => {
        try {
            const name = await ipcRenderer.invoke('get-registry-value', 'HKCU\\Software\\SAMP', 'PlayerName');
            if (name) setNickname(name);
        } catch (e) { console.error('Error loading nick', e); }
    };

    const queryServer = async (address) => {
        setLoading(prev => ({ ...prev, [address]: true }));
        try {
            const data = await ipcRenderer.invoke('query-server', address);
            setServerData(prev => ({ ...prev, [address]: data }));
        } catch (e) {
            setServerData(prev => ({ ...prev, [address]: { online: false } }));
        } finally {
            setLoading(prev => ({ ...prev, [address]: false }));
        }
    };

    const refreshAll = () => {
        servers.forEach(s => queryServer(s.address));
    };

    const handleAddServer = async () => {
        if (!newServerIp) return;
        let address = newServerIp.trim();
        if (servers.some(s => s.address === address)) {
            alert('Este servidor ya está en la lista.');
            return;
        }
        const newServer = { address, favorite: false };
        setServers([...servers, newServer]);
        setNewServerIp('');
        setIsAddModalOpen(false);
        queryServer(address);
    };

    const removeServer = (address, e) => {
        e.stopPropagation();
        if (confirm('¿Eliminar este servidor de la lista?')) {
            setServers(servers.filter(s => s.address !== address));
            const newData = { ...serverData };
            delete newData[address];
            setServerData(newData);
            if (connectModalServer?.address === address) setConnectModalServer(null);
        }
    };

    const toggleFavorite = (address, e) => {
        e.stopPropagation();
        setServers(servers.map(s =>
            s.address === address ? { ...s, favorite: !s.favorite } : s
        ));
    };

    const openConnectModal = (server) => {
        setConnectModalServer(server);
    };

    const handleConnect = async () => {
        if (!nickname) {
            alert('Por favor introduce un nombre de usuario.');
            return;
        }
        const gamePath = localStorage.getItem('gtapath');
        if (!gamePath) {
            alert('Configura la ruta del juego en Ajustes primero.');
            return;
        }

        // Save nickname
        await ipcRenderer.invoke('set-registry-value', 'HKCU\\Software\\SAMP', 'PlayerName', nickname);
        // Also sync main proc just in case
        ipcRenderer.send('update-player-name', nickname);

        // Launch
        ipcRenderer.send('launch-game', gamePath, connectModalServer.address);
        setConnectModalServer(null);
    };

    const sortedServers = [...servers].sort((a, b) => {
        if (a.favorite === b.favorite) return 0;
        return a.favorite ? -1 : 1;
    });

    const getModalData = () => {
        if (!connectModalServer) return null;
        return serverData[connectModalServer.address] || { hostname: connectModalServer.address, online: false };
    }

    // Modal Details
    const modalData = getModalData();
    const isOnline = modalData?.online;
    const playerCount = modalData?.players || 0;
    const maxPlayers = modalData?.maxPlayers || 0;
    const fillPercent = maxPlayers > 0 ? (playerCount / maxPlayers) * 100 : 0;

    return (
        <div className="servers-container animate-fade-in">
            <div className="header">
                <div>
                    <h2 className="page-title"><Server className="icon-title" /> Servidores</h2>
                    <p className="page-subtitle">Gestiona tus servidores favoritos de SA-MP.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-icon" onClick={refreshAll} title="Refrescar todos">
                        <RefreshCw size={20} />
                    </button>
                    <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={18} /> AÑADIR SERVIDOR
                    </button>
                </div>
            </div>

            <div className="servers-list">
                <div className="list-header">
                    <div className="col-status"></div>
                    <div className="col-name">Nombre</div>
                    <div className="col-ip">IP / Puerto</div>
                    <div className="col-mode">Modo</div>
                    <div className="col-players">Jugadores</div>
                    <div className="col-ping">Ping</div>
                    <div className="col-actions"></div>
                </div>

                {sortedServers.length === 0 ? (
                    <div className="empty-state">
                        <Server size={48} opacity={0.2} />
                        <p>No tienes servidores guardados.</p>
                    </div>
                ) : (
                    sortedServers.map((server) => {
                        const data = serverData[server.address] || {};
                        const isLoading = loading[server.address];
                        const isOnline = data.online;

                        return (
                            <motion.div
                                key={server.address}
                                className={`server-row ${server.favorite ? 'favorite' : ''}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                layout
                                onClick={() => openConnectModal(server)}
                            >
                                <div className="col-status">
                                    <div className={`status-dot ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Online' : 'Offline'} />
                                </div>
                                <div className="col-name">
                                    {isLoading ? (
                                        <span className="loading-text">Cargando info...</span>
                                    ) : (
                                        <span className="hostname">{data.hostname || 'Sin información'}</span>
                                    )}
                                </div>
                                <div className="col-ip">{server.address}</div>
                                <div className="col-mode">{data.gamemode || '-'}</div>
                                <div className="col-players">
                                    {isOnline ? (
                                        <span className="player-count">
                                            {data.players}/{data.maxPlayers}
                                        </span>
                                    ) : '-'}
                                </div>
                                <div className="col-ping">
                                    {isOnline ? (
                                        <span className={`ping-badge ${data.ping < 100 ? 'good' : data.ping < 200 ? 'med' : 'bad'}`}>
                                            {data.ping}ms
                                        </span>
                                    ) : '-'}
                                </div>
                                <div className="col-actions">
                                    <button
                                        className={`action-btn fav ${server.favorite ? 'active' : ''}`}
                                        onClick={(e) => toggleFavorite(server.address, e)}
                                    >
                                        <Star size={16} fill={server.favorite ? "currentColor" : "none"} />
                                    </button>
                                    <button
                                        className="action-btn delete"
                                        onClick={(e) => removeServer(server.address, e)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            <AnimatePresence>
                {/* Add Server Modal */}
                {isAddModalOpen && (
                    <div className="modal-overlay">
                        <motion.div
                            className="modal-content"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <h3>Añadir Nuevo Servidor</h3>
                            <input
                                type="text"
                                placeholder="IP:Puerto (ej: 127.0.0.1:7777)"
                                className="input-text"
                                value={newServerIp}
                                onChange={(e) => setNewServerIp(e.target.value)}
                                autoFocus
                            />
                            <div className="modal-actions">
                                <button className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancelar</button>
                                <button className="btn-primary" onClick={handleAddServer}>Añadir</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Premium Connect Modal */}
                {connectModalServer && (
                    <div className="modal-overlay glass-heavy">
                        <motion.div
                            className="premium-modal"
                            initial={{ y: 50, opacity: 0, scale: 0.9 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 50, opacity: 0, scale: 0.9 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                            <button className="close-btn-premium" onClick={() => setConnectModalServer(null)}>
                                <X size={24} />
                            </button>

                            {/* Hero Header */}
                            <div className="pm-header">
                                <div className={`pm-status-indicator ${isOnline ? 'on' : 'off'}`}>
                                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                                </div>
                                <div className="pm-icon-wrapper">
                                    <Globe size={40} className="pm-icon" />
                                </div>
                                <h2 className="pm-title">{modalData?.hostname || 'Unknown Server'}</h2>
                                <div className="pm-address">
                                    <span>{connectModalServer.address}</span>
                                </div>
                            </div>

                            {/* Stats Bar */}
                            <div className="pm-stats">
                                <div className="pm-stat-box">
                                    <Activity size={16} className="stat-icon" />
                                    <div className="stat-info">
                                        <span className="stat-val">{modalData?.ping || '-'}ms</span>
                                        <span className="stat-label">Latencia</span>
                                    </div>
                                </div>
                                <div className="pm-stat-box">
                                    <User size={16} className="stat-icon" />
                                    <div className="stat-info">
                                        <span className="stat-val">{playerCount}/{maxPlayers}</span>
                                        <span className="stat-label">Jugadores</span>
                                    </div>
                                </div>

                            </div>

                            {/* Player Progress Visual */}
                            <div className="pm-progress-container">
                                <div className="pm-progress-bar" style={{ width: `${fillPercent}%` }}></div>
                            </div>

                            <div className="pm-body">
                                <div className="pm-input-group">
                                    <label>TU NOMBRE DE JUGADOR</label>
                                    <div className="pm-input-wrapper">
                                        <User size={20} className="pm-input-icon" />
                                        <input
                                            type="text"
                                            className="pm-input"
                                            value={nickname}
                                            placeholder="Nombre_Apellido"
                                            onChange={(e) => setNickname(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button className="pm-connect-btn" onClick={handleConnect}>
                                    <Play fill="currentColor" size={20} />
                                    <span>CONECTAR AL SERVIDOR</span>
                                    <div className="pm-btn-shine"></div>
                                </button>
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                /* ... Keep existing styles for list ... */
                .servers-container { padding: 40px; height: 100%; overflow-y: auto; color: white; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
                .page-title { display: flex; align-items: center; gap: 12px; font-size: 28px; margin-bottom: 5px; font-weight: 700; }
                .icon-title { color: var(--accent-primary); }
                .page-subtitle { color: var(--text-muted); font-size: 14px; }
                
                .header-actions { display: flex; gap: 10px; }
                .btn-icon { background: rgba(255,255,255,0.05); border: none; width: 40px; height: 40px; border-radius: 8px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
                .btn-icon:hover { background: rgba(255,255,255,0.1); }
                
                .btn-primary { background: var(--accent-primary); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; transition: filter 0.2s; }
                .btn-primary:hover { filter: brightness(1.2); }

                .servers-list { background: rgba(0,0,0,0.2); border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); }
                .list-header { display: flex; background: rgba(255,255,255,0.03); padding: 15px 20px; font-size: 12px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 1px; }
                
                .server-row { display: flex; align-items: center; padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; cursor: pointer; }
                .server-row:hover { background: rgba(255,255,255,0.05); }
                .server-row.favorite { background: linear-gradient(90deg, rgba(234, 179, 8, 0.05), transparent); border-left: 2px solid #eab308; }
                
                .col-status { width: 40px; display: flex; justify-content: center; }
                .col-name { flex: 2; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 20px; }
                .col-ip { flex: 1; color: var(--text-muted); font-family: monospace; font-size: 13px; }
                .col-mode { flex: 1; color: var(--text-muted); font-size: 13px; }
                .col-players { width: 100px; text-align: center; font-variant-numeric: tabular-nums; }
                .col-ping { width: 80px; text-align: center; }
                .col-actions { width: 100px; display: flex; justify-content: flex-end; gap: 8px; opacity: 0; transition: opacity 0.2s; }
                .server-row:hover .col-actions { opacity: 1; }

                .status-dot { width: 8px; height: 8px; border-radius: 50%; }
                .status-dot.online { background: #4ade80; box-shadow: 0 0 10px rgba(74, 222, 128, 0.5); }
                .status-dot.offline { background: #ef4444; }

                .hostname { color: #f1f5f9; }
                .loading-text { color: var(--text-muted); font-style: italic; }

                .ping-badge { padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; min-width: 40px; display: inline-block; }
                .ping-badge.good { color: #4ade80; background: rgba(74, 222, 128, 0.1); }
                .ping-badge.med { color: #facc15; background: rgba(250, 204, 21, 0.1); }
                .ping-badge.bad { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

                .action-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 6px; border-radius: 6px; transition: all 0.2s; }
                .action-btn:hover { background: rgba(255,255,255,0.1); color: white; }
                .action-btn.fav.active { color: #eab308; }
                .action-btn.delete:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

                .empty-state { padding: 60px; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 20px; }

                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(5px); }
                .modal-content { background: #1e1e24; padding: 30px; border-radius: 16px; width: 400px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
                .modal-content h3 { margin-bottom: 20px; font-size: 20px; }
                .input-text { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; color: white; margin-bottom: 20px; font-family: monospace; }
                
                .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
                .btn-secondary { background: rgba(255,255,255,0.05); border: none; padding: 10px 20px; border-radius: 8px; color: white; cursor: pointer; }

                /* NEW PREMIUM MODAL STYLES */
                .glass-heavy { backdrop-filter: blur(15px); background: rgba(0,0,0,0.85); }
                
                .premium-modal {
                    width: 500px;
                    background: linear-gradient(165deg, #18181b 0%, #09090b 100%);
                    border-radius: 24px;
                    border: 1px solid rgba(255,255,255,0.08);
                    box-shadow: 0 0 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05);
                    overflow: hidden;
                    position: relative;
                }

                .close-btn-premium {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: rgba(255,255,255,0.05);
                    border: none;
                    color: rgba(255,255,255,0.5);
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    z-index: 10;
                }
                .close-btn-premium:hover { background: rgba(255,255,255,0.1); color: white; transform: rotate(90deg); }

                .pm-header {
                    padding: 40px 40px 30px;
                    text-align: center;
                    background: radial-gradient(circle at top, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
                    position: relative;
                }
                
                .pm-status-indicator {
                    position: absolute;
                    top: 24px;
                    left: 24px;
                    font-size: 10px;
                    font-weight: 800;
                    padding: 4px 10px;
                    border-radius: 20px;
                    letter-spacing: 1px;
                }
                .pm-status-indicator.on { background: rgba(74, 222, 128, 0.1); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.2); box-shadow: 0 0 15px rgba(74, 222, 128, 0.1); }
                .pm-status-indicator.off { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }

                .pm-icon-wrapper {
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02));
                    border-radius: 24px;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .pm-icon { color: var(--accent-primary); filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.5)); }

                .pm-title { font-size: 22px; font-weight: 800; color: white; margin-bottom: 8px; line-height: 1.2; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
                .pm-address { font-family: monospace; color: var(--accent-primary); background: rgba(99, 102, 241, 0.1); display: inline-block; padding: 4px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; }

                .pm-stats { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); }
                .pm-stat-box { padding: 15px; display: flex; flex-direction: column; align-items: center; gap: 8px; border-right: 1px solid rgba(255,255,255,0.05); }
                .pm-stat-box:last-child { border-right: none; }
                .stat-icon { color: var(--text-muted); opacity: 0.5; }
                .stat-info { display: flex; flex-direction: column; align-items: center; }
                .stat-val { color: white; font-weight: 700; font-size: 14px; }
                .stat-label { color: var(--text-muted); font-size: 10px; text-transform: uppercase; font-weight: 600; margin-top: 2px; }

                .pm-progress-container { height: 4px; background: rgba(255,255,255,0.05); width: 100%; position: relative; }
                .pm-progress-bar { height: 100%; background: var(--accent-primary); box-shadow: 0 0 10px var(--accent-primary); transition: width 1s ease-out; }

                .pm-body { padding: 30px 40px; }
                
                .pm-input-group label { display: block; font-size: 11px; font-weight: 800; color: var(--text-muted); margin-bottom: 12px; letter-spacing: 1px; }
                .pm-input-wrapper { position: relative; background: rgba(0,0,0,0.3); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s; padding: 4px; display: flex; align-items: center; }
                .pm-input-wrapper:focus-within { border-color: var(--accent-primary); box-shadow: 0 0 20px rgba(99, 102, 241, 0.15); background: rgba(0,0,0,0.5); transform: translateY(-1px); }
                
                .pm-input-icon { color: var(--text-muted); margin: 0 12px; }
                .pm-input { background: transparent; border: none; width: 100%; color: white; padding: 12px 0; font-weight: 600; font-size: 15px; outline: none; }
                .pm-input::placeholder { color: rgba(255,255,255,0.2); }

                .pm-connect-btn {
                    margin-top: 24px;
                    width: 100%;
                    background: linear-gradient(135deg, var(--accent-primary), #4f46e5);
                    border: none;
                    padding: 16px;
                    border-radius: 12px;
                    color: white;
                    font-weight: 800;
                    font-size: 14px;
                    letter-spacing: 1px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.2s;
                    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
                }
                .pm-connect-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5); }
                .pm-connect-btn:active { transform: translateY(1px); }
                
                .pm-btn-shine {
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    transform: skewX(-20deg);
                    animation: shine 3s infinite;
                }
                
                @keyframes shine {
                    0% { left: -100%; }
                    20% { left: 200%; }
                    100% { left: 200%; }
                }

            `}</style>
        </div>
    );
};

export default Servers;
