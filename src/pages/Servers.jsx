import React, { useState, useEffect, useCallback } from 'react';
import { Server, Plus, Trash2, Star, RefreshCw, Play, X, User, Activity, Globe, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CharacterSelector from '../components/CharacterSelector';
import RegistrationModal from '../components/RegistrationModal';
import CharacterCreatorModal from '../components/CharacterCreatorModal';

// Mock ipcRenderer for web dev
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { invoke: () => Promise.resolve({}), send: () => { } } };

// --- OPTIMIZED ROW COMPONENT ---
// Using React.memo to prevent re-renders of the entire list when only one server updates
const ServerRow = React.memo(({ server, data, isLoading, isOnline, onConnect, onToggleFav, onRemove }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className={`group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer mb-2
                ${server.favorite
                    ? 'bg-gradient-to-r from-yellow-500/5 to-transparent border-yellow-500/20 hover:border-yellow-500/40'
                    : 'bg-[#18181b]/60 hover:bg-[#18181b] border-white/5 hover:border-white/10'
                } hover:shadow-lg hover:shadow-black/20 hover:scale-[1.005]`}
            onClick={() => onConnect(server)}
        >
            {/* Status Dot */}
            <div className="flex-shrink-0 pl-1">
                <div className={`relative flex items-center justify-center w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`}>
                    {isOnline && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>}
                </div>
            </div>

            {/* Server Info */}
            <div className="flex-grow min-w-0">
                <h3 className={`font-bold text-sm truncate transition-colors ${server.favorite ? 'text-yellow-100' : 'text-gray-200 group-hover:text-white'}`}>
                    {isLoading ? 'Cargando...' : (data.hostname || 'Sin respuesta')}
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-500 font-mono mt-0.5">
                    <span className="flex items-center gap-1"><Globe size={10} /> {server.address}</span>
                    <span className="hidden sm:inline-block opacity-50">|</span>
                    <span className="hidden sm:inline-block">{data.gamemode || '-'}</span>
                </div>
            </div>

            {/* Players */}
            <div className="w-24 text-right flex-shrink-0">
                <div className="flex flex-col items-end">
                    <span className={`text-xs font-bold font-mono ${isOnline ? 'text-indigo-400' : 'text-gray-600'}`}>
                        {isOnline ? `${data.players}/${data.maxPlayers}` : '-/-'}
                    </span>
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">Players</span>
                </div>
            </div>

            {/* Ping */}
            <div className="w-16 text-right flex-shrink-0">
                <div className="flex flex-col items-end">
                    <span className={`text-xs font-bold font-mono ${!isOnline ? 'text-gray-600' : data.ping < 100 ? 'text-emerald-400' : data.ping < 200 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {isOnline ? `${data.ping}ms` : '-'}
                    </span>
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">Ping</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 pl-2 border-l border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                    className={`p-2 rounded-lg transition-colors ${server.favorite ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-gray-500 hover:text-yellow-400 hover:bg-white/5'}`}
                    onClick={(e) => onToggleFav(server.address, e)}
                    title="Favorito"
                >
                    <Star size={16} fill={server.favorite ? "currentColor" : "none"} />
                </button>
                <button
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    onClick={(e) => onRemove(server.address, e)}
                    title="Eliminar"
                >
                    <Trash2 size={16} />
                </button>
                <button
                    className="p-2 rounded-lg text-indigo-400 hover:text-white hover:bg-indigo-600 transition-colors"
                    onClick={() => onConnect(server)}
                    title="Conectar"
                >
                    <Play size={16} fill="currentColor" />
                </button>
            </div>
        </motion.div>
    );
});


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

    // SSO State
    const [userSession, setUserSession] = useState(null);
    const [ssoCharacters, setSsoCharacters] = useState([]);
    const [isLaunching, setIsLaunching] = useState(false);

    // Auth Modals
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showCreateCharModal, setShowCreateCharModal] = useState(false);

    useEffect(() => {
        refreshAll();
        loadNickname();
        loadSession();
        window.addEventListener('auth-change', loadSession);
        return () => window.removeEventListener('auth-change', loadSession);
    }, []);

    const loadSession = () => {
        const saved = localStorage.getItem('user_session');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setUserSession(parsed);
                let chars = [];
                if (Array.isArray(parsed.characters)) chars = parsed.characters;
                else if (parsed.characters) chars = [parsed.characters];
                setSsoCharacters(chars);
            } catch (e) { console.error("Session parse error", e); }
        } else {
            setUserSession(null);
            setSsoCharacters([]);
        }
    };

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

    const queryServer = useCallback(async (address) => {
        setLoading(prev => ({ ...prev, [address]: true }));
        try {
            const data = await ipcRenderer.invoke('query-server', address);
            setServerData(prev => ({ ...prev, [address]: data }));
        } catch (e) {
            setServerData(prev => ({ ...prev, [address]: { online: false } }));
        } finally {
            setLoading(prev => ({ ...prev, [address]: false }));
        }
    }, []);

    const refreshAll = useCallback(() => {
        servers.forEach(s => queryServer(s.address));
    }, [servers, queryServer]);

    const handleAddServer = async () => {
        if (!newServerIp) return;
        let address = newServerIp.trim();
        if (servers.some(s => s.address === address)) {
            alert('Este servidor ya está en la lista.');
            return;
        }
        const newServer = { address, favorite: false };
        setServers(prev => [...prev, newServer]);
        setNewServerIp('');
        setIsAddModalOpen(false);
        queryServer(address);
    };

    const removeServer = useCallback((address, e) => {
        e.stopPropagation();
        if (confirm('¿Eliminar este servidor de la lista?')) {
            setServers(prev => prev.filter(s => s.address !== address));
            setServerData(prev => {
                const newData = { ...prev };
                delete newData[address];
                return newData;
            });
            if (connectModalServer?.address === address) setConnectModalServer(null);
        }
    }, [connectModalServer]);

    const toggleFavorite = useCallback((address, e) => {
        e.stopPropagation();
        setServers(prev => prev.map(s =>
            s.address === address ? { ...s, favorite: !s.favorite } : s
        ));
    }, []);

    const openConnectModal = useCallback((server) => {
        setConnectModalServer(server);
    }, []);

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

    const handleSSOConnect = async (char) => {
        if (isLaunching) return;
        setIsLaunching(true);

        const gamePath = localStorage.getItem('gtapath');
        if (!gamePath) {
            alert('Configura la ruta del juego en Ajustes primero.');
            setIsLaunching(false);
            return;
        }

        try {
            // 1. Request SSO Token
            // TODO: Use Config
            const res = await fetch('http://localhost:3001/api/auth/sso-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userSession.user.id, characterName: char.Nombre_Apellido, characterId: char.ID })
            });
            const data = await res.json();

            if (data.success) {
                // 2. Set Registry Name to Character Name
                await ipcRenderer.invoke('set-registry-value', 'HKCU\\Software\\SAMP', 'PlayerName', char.Nombre_Apellido);
                ipcRenderer.send('update-player-name', char.Nombre_Apellido);

                // 3. Launch
                ipcRenderer.send('launch-game', gamePath, connectModalServer.address);
                setConnectModalServer(null);
            } else {
                alert('Error de autorización: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Error conectando con el servidor de autenticación.');
        } finally {
            setIsLaunching(false);
        }
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


    // Helper to identify Official Servers
    const isOfficialServer = (address) => {
        if (!address) return false;
        // Check for official domains and local dev environments
        const official = ['samp.seoul-rp.net:7777', '127.0.0.1:7777', 'localhost:7777'];
        return official.includes(address) || address.includes('seoul-rp.net');
    };

    return (
        <div className="h-full flex flex-col p-10 overflow-hidden text-white relative">
            {/* Background Gradient */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-indigo-900/20 via-purple-900/10 to-transparent blur-3xl pointer-events-none -mr-20 -mt-20"></div>

            <div className="flex justify-between items-end mb-8 relative z-10 flex-shrink-0">
                <div>
                    <h2 className="text-3xl font-black flex items-center gap-3 mb-2 tracking-tight">
                        <Server className="text-indigo-500" size={32} />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Servidores
                        </span>
                    </h2>
                    <p className="text-gray-400 text-sm">Gestiona tus servidores favoritos de SA-MP.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors border border-white/5"
                        onClick={refreshAll}
                        title="Refrescar todo"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <Plus size={18} /> AÑADIR SERVIDOR
                    </button>
                </div>
            </div>

            {/* HEADER COLUMNS */}
            <div className="flex px-4 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider relative z-10 flex-shrink-0">
                <div className="w-8"></div>
                <div className="flex-grow">Nombre / IP</div>
                <div className="w-24 text-right">Jugadores</div>
                <div className="w-16 text-right">Ping</div>
                <div className="w-24"></div> {/* Actions Spacer */}
            </div>

            {/* LIST LAYOUT */}
            <div className="flex-grow overflow-y-auto pr-4 -mr-4 relative z-10">
                {sortedServers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-600">
                        <Server size={64} strokeWidth={1} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">No tienes servidores guardados.</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {sortedServers.map((server, index) => (
                            <ServerRow
                                key={`${server.address}-${index}`}
                                server={server}
                                data={serverData[server.address] || {}}
                                isLoading={loading[server.address]}
                                isOnline={serverData[server.address]?.online}
                                onConnect={openConnectModal}
                                onToggleFav={toggleFavorite}
                                onRemove={removeServer}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </div>

            <AnimatePresence>
                {/* Add Server Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            className="bg-[#18181b] p-6 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <h3 className="text-xl font-bold text-white mb-4">Añadir Servidor</h3>
                            <input
                                type="text"
                                placeholder="IP:Puerto (ej: 127.0.0.1:7777)"
                                className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-white mb-6 focus:border-indigo-500 focus:outline-none transition-colors font-mono"
                                value={newServerIp}
                                onChange={(e) => setNewServerIp(e.target.value)}
                                autoFocus
                            />
                            <div className="flex justify-end gap-3">
                                <button className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/5 transition-colors" onClick={() => setIsAddModalOpen(false)}>Cancelar</button>
                                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors" onClick={handleAddServer}>Añadir</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Connect Modal (Same Premium Design) */}
                {connectModalServer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <motion.div
                            className="bg-[#18181b] w-full max-w-lg rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative"
                            initial={{ y: 50, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 50, opacity: 0, scale: 0.95 }}
                        >
                            <button
                                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors z-20"
                                onClick={() => setConnectModalServer(null)}
                            >
                                <X size={20} />
                            </button>

                            {/* Header */}
                            <div className="relative p-10 text-center bg-gradient-to-b from-indigo-900/20 to-transparent">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-6 border ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></span>
                                    {isOnline ? 'Online' : 'Offline'}
                                </div>

                                <h2 className="text-2xl font-black text-white mb-2 leading-tight">{modalData?.hostname || 'Servidor Desconocido'}</h2>
                                <p className="text-indigo-400 font-mono text-sm font-medium bg-indigo-500/10 inline-block px-3 py-1 rounded-lg">
                                    {connectModalServer.address}
                                </p>
                            </div>

                            {/* Players Bar */}
                            <div className="h-1 w-full bg-white/5">
                                <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${fillPercent}%` }}></div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 divide-x divide-white/5 border-b border-white/5 bg-[#121214]/50">
                                <div className="p-4 text-center">
                                    <div className="text-xs text-gray-500 uppercase font-black tracking-wider mb-1">Latencia</div>
                                    <div className="text-emerald-400 font-mono font-bold">{modalData?.ping || '-'}ms</div>
                                </div>
                                <div className="p-4 text-center">
                                    <div className="text-xs text-gray-500 uppercase font-black tracking-wider mb-1">Jugadores</div>
                                    <div className="text-white font-mono font-bold">{playerCount}/{maxPlayers}</div>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-8">
                                {userSession && isOfficialServer(connectModalServer.address) ? (
                                    <div className="animate-fade-in">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Selecciona Personaje</h4>
                                            <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
                                                {userSession.user.name}
                                            </span>
                                        </div>

                                        <div className="max-h-[220px] overflow-y-auto pr-2 -mr-2">
                                            <CharacterSelector
                                                characters={ssoCharacters}
                                                onSelect={handleSSOConnect}
                                                onManage={() => setShowCreateCharModal(true)}
                                            />
                                            {isLaunching && <div className="text-center text-xs text-indigo-400 mt-4 font-mono animate-pulse">Iniciando juego...</div>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tu Nombre de Jugador</label>
                                            <div className="flex items-center gap-3 bg-[#121214] border border-white/10 p-1 rounded-xl focus-within:border-indigo-500/50 transition-colors">
                                                <div className="p-2.5 bg-white/5 rounded-lg text-gray-400">
                                                    <User size={20} />
                                                </div>
                                                <input
                                                    type="text"
                                                    className="bg-transparent border-none text-white font-medium w-full focus:outline-none"
                                                    value={nickname}
                                                    placeholder="Nombre_Apellido"
                                                    onChange={(e) => setNickname(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                            onClick={handleConnect}
                                        >
                                            <Play fill="currentColor" size={18} />
                                            CONECTAR AHORA
                                        </button>

                                        {isOfficialServer(connectModalServer.address) && (
                                            <div className="flex gap-3 pt-6 border-t border-white/5">
                                                <button
                                                    className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                                                    onClick={() => alert("Función Login pendiente.")}
                                                >
                                                    YA TENGO CUENTA
                                                </button>
                                                <button
                                                    className="flex-1 py-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors border border-indigo-500/20"
                                                    onClick={() => { setConnectModalServer(null); setShowRegisterModal(true); }}
                                                >
                                                    CREAR CUENTA
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/*Auth Modals*/}
            <AnimatePresence>
                <CharacterCreatorModal
                    isOpen={showCreateCharModal}
                    onClose={() => setShowCreateCharModal(false)}
                    userId={userSession?.user?.id}
                    onCreateSuccess={() => {
                        const saved = localStorage.getItem('user_session');
                        if (saved) {
                            const parsed = JSON.parse(saved);
                            fetch(`http://localhost:3001/api/user/${parsed.user.id}/refresh`)
                                .then(r => r.json())
                                .then(fresh => {
                                    setUserSession(fresh);
                                    localStorage.setItem('user_session', JSON.stringify(fresh));
                                    setSsoCharacters(Array.isArray(fresh.characters) ? fresh.characters : [fresh.characters]);
                                    setShowCreateCharModal(false);
                                })
                                .catch(err => console.error(err));
                        }
                    }}
                />

                <RegistrationModal
                    isOpen={showRegisterModal}
                    onClose={() => setShowRegisterModal(false)}
                    onRegisterSuccess={(userId, username) => {
                        alert(`Cuenta creada con éxito! Usuario: ${username}`);
                        // Future: Auto-login logic
                    }}
                />
            </AnimatePresence>
        </div>
    );
};

export default Servers;
