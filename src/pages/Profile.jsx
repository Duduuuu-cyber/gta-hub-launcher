import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Wallet, Briefcase, Clock, Shield, Star, Award, Car, Home, Zap, Settings, UserPlus, FileText, ChevronDown, CheckCircle, Package, Sprout, Axe, Trash2, Truck, Skull, Hammer, LogOut, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getItemInfo } from '../utils/items';

const StatRow = ({ label, value, subValue, highlight }) => (
    <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0 hover:bg-white/5 px-3 rounded-lg transition-colors">
        <span className="text-gray-500 font-medium capitalize text-xs tracking-wide">{label}</span>
        <div className="text-right">
            <span className={`font-bold font-mono text-sm ${highlight ? 'text-green-400' : 'text-gray-200'}`}>{value}</span>
            {subValue && <span className="text-[10px] text-gray-600 block uppercase tracking-wider">{subValue}</span>}
        </div>
    </div>
);

const ActionButton = ({ icon: Icon, label, isNew, color = "indigo", onClick }) => (
    <button onClick={onClick} className="w-full bg-[#1A1A1D]/60 hover:bg-[#202025] border border-white/5 hover:border-white/10 p-5 rounded-2xl flex items-center gap-4 transition-all group relative overflow-hidden backdrop-blur-sm">
        <div className={`p-3.5 rounded-xl bg-${color}-500/10 text-${color}-400 group-hover:bg-${color}-500 group-hover:text-white transition-colors shadow-none group-hover:shadow-lg group-hover:shadow-${color}-500/20`}>
            <Icon size={22} />
        </div>
        <span className="font-bold text-gray-300 group-hover:text-white text-sm tracking-wide">{label}</span>
        {isNew && (
            <span className="absolute top-3 right-3 text-[9px] font-black bg-gradient-to-r from-green-500 to-emerald-500 text-black px-1.5 py-0.5 rounded shadow-lg shadow-green-500/20">NEW</span>
        )}
    </button>
);

const CharacterCard = ({ char, isSelected, onClick }) => (
    <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`cursor-pointer rounded-2xl p-4 border transition-all relative overflow-hidden ${isSelected
            ? 'bg-gradient-to-br from-indigo-600/20 to-purple-800/20 border-indigo-500/50 shadow-lg shadow-indigo-900/20'
            : 'bg-[#18181b] border-white/5 hover:border-white/10 hover:bg-[#202023]'}`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${isSelected ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40' : 'bg-white/10 text-gray-400'}`}>
                {char.Nombre_Apellido.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className={`font-bold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {char.Nombre_Apellido.replace('_', ' ')}
                </h4>
                <p className="text-xs text-gray-500 truncate">ID: {char.ID} • Horas: {char.FugaoVicio || 0}</p>
            </div>
            {isSelected && <CheckCircle size={20} className="text-indigo-400" />}
        </div>
    </motion.div>
)

const InfoModal = ({ title, isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-[#121214] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl shadow-black/50"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                    <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-white">
                        <span className="text-xs font-mono">ESC</span>
                    </button>
                </div>
                {children}
            </motion.div>
        </div>
    );
};

const Profile = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [allCharacters, setAllCharacters] = useState([]);
    const [selectedCharacter, setSelectedCharacter] = useState(null);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalContent, setModalContent] = useState(null);
    const [loadingInfo, setLoadingInfo] = useState(false);

    const checkSession = () => {
        const session = localStorage.getItem('user_session');
        if (session) {
            try {
                const parsed = JSON.parse(session);
                // Initial load from cache (fast)
                setUserData(parsed.user);

                // Helper to organize chars
                const processChars = (data) => {
                    let chars = [];
                    if (Array.isArray(data) && data.length > 0) chars = data;
                    else if (data && !Array.isArray(data)) chars = [data]; // Handle single object edge case
                    else if (data && data.length > 0) chars = data; // Handle array
                    return chars;
                };

                setAllCharacters(processChars(parsed.characters));

                // DYNAMIC REFRESH: Fetch fresh data from backend
                fetchFreshData(parsed.user.id);

            } catch (e) {
                console.error("Profile Error:", e);
            }
        } else {
            // Session missing? Let App.jsx handle global auth state.
            console.warn("Profile: Session not found immediately.");
        }
    };

    const fetchFreshData = async (userId) => {
        try {
            const res = await fetch(`http://localhost:3001/api/user/${userId}/refresh`);
            if (res.ok) {
                const freshData = await res.json();
                if (freshData.success) {
                    // Update State
                    setUserData(freshData.user);
                    setAllCharacters(freshData.characters);

                    // Update LocalStorage so it persists
                    localStorage.setItem('user_session', JSON.stringify(freshData));
                    console.log("Profile: Data refreshed dynamically.");
                }
            }
        } catch (err) {
            console.error("Failed to refresh profile data:", err);
        }
    };

    useEffect(() => {
        checkSession();
        // Listen for login/logout events
        window.addEventListener('auth-change', checkSession);
        return () => window.removeEventListener('auth-change', checkSession);
    }, []);

    // Fallback if data isn't loaded yet (avoids blank screen)
    if (!userData) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 text-sm animate-pulse">Cargando perfil...</p>
                {/* Emergency Logout if stuck */}
                <button
                    onClick={async () => {
                        if (userData?.id) {
                            try {
                                await fetch('http://localhost:3001/api/auth/logout', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: userData.id })
                                });
                            } catch (e) { console.error("Logout failed", e); }
                        }
                        localStorage.removeItem('user_session');
                        window.dispatchEvent(new Event('auth-change'));
                        navigate('/login');
                    }}
                    className="mt-8 text-xs text-red-500/50 hover:text-red-400"
                >
                    Reiniciar Sesión
                </button>
            </div>
        );
    }

    const fetchVehicles = async () => {
        if (!selectedCharacter) return;
        setModalTitle('Mis Vehículos');
        setModalOpen(true);
        setLoadingInfo(true);
        try {
            const res = await fetch(`http://localhost:3001/api/vehicles/${selectedCharacter.Nombre_Apellido}`);
            if (!res.ok) throw new Error('Error de servidor');

            const data = await res.json();

            if (!Array.isArray(data)) throw new Error('Formato inválido');

            setModalContent(
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.map(v => (
                        <div key={v.ID} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors flex gap-4 items-center">
                            {/* Vehicle Image */}
                            <div className="w-24 h-16 shrink-0 bg-black/20 rounded-lg overflow-hidden flex items-center justify-center border border-white/5">
                                <img
                                    src={`http://weedarr.wdfiles.com/local--files/veh/${v.Modelo}.png`}
                                    alt={`Vehicle ${v.Modelo}`}
                                    className="w-full h-full object-contain hover:scale-110 transition-transform duration-500"
                                    onError={(e) => { e.target.style.display = 'none' }}
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-indigo-300 truncate">Modelo {v.Modelo}</span>
                                    <span className="text-[10px] font-mono text-gray-400 bg-black/40 px-2 py-1 rounded border border-white/5 shrink-0">{v.matricula || '---'}</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div>
                                        <div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Gasolina</span> <span>{Math.round(v.Gasolina)}%</span></div>
                                        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden"><div style={{ width: `${v.Gasolina}%` }} className="h-full bg-yellow-600 rounded-full"></div></div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Estado</span> <span>{Math.round(v.Vida / 10)}%</span></div>
                                        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden"><div style={{ width: `${v.Vida / 10}%` }} className="h-full bg-green-600 rounded-full"></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && <div className="col-span-2 text-center py-12 text-gray-500 italic">No tienes vehículos asignados a este personaje.</div>}
                </div>
            );
        } catch (err) {
            console.error(err);
            setModalContent(
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                    <AlertTriangle size={48} className="text-red-400 opacity-50" />
                    <div className="text-center">
                        <p className="text-white font-bold">Error cargando vehículos</p>
                        <p className="text-xs text-gray-500 mt-1">No se pudo conectar con el garaje.</p>
                    </div>
                    <button
                        onClick={() => fetchVehicles()}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors text-white"
                    >
                        Reintentar
                    </button>
                </div>
            );
        }
        setLoadingInfo(false);
    };

    const fetchProperties = async () => {
        if (!selectedCharacter) return;
        setModalTitle('Mis Propiedades');
        setModalOpen(true);
        setLoadingInfo(true);
        try {
            const res = await fetch(`http://localhost:3001/api/properties/${selectedCharacter.Nombre_Apellido}`);
            const data = await res.json();

            // Helper Component
            const PropertyCard = ({ icon: Icon, title, subtitle, color, detailLabel, detailValue }) => (
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center hover:border-indigo-500/30 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 bg-${color}-500/10 rounded-lg text-${color}-400 ml-0`}><Icon size={20} /></div>
                        <div className="text-left">
                            <h4 className="font-bold text-gray-200 text-sm">{title}</h4>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wider">{subtitle}</p>
                        </div>
                    </div>
                    {detailLabel && (
                        <div className="text-right">
                            <div className="text-[10px] text-gray-500">{detailLabel}</div>
                            <div className="font-mono text-xs font-bold text-white">{detailValue}</div>
                        </div>
                    )}
                </div>
            );

            setModalContent(
                <div className="space-y-6">
                    {/* HOUSES */}
                    {data.houses?.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Home size={12} /> Casas</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {data.houses.map(p => (
                                    <PropertyCard
                                        key={`house-${p.ID}`}
                                        icon={Home}
                                        title={`Casa #${p.ID}`}
                                        subtitle={p.Tipo}
                                        color="indigo"
                                        detailLabel="Caja Fuerte"
                                        detailValue={fmt(p.BolosUwU)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* BUSINESSES */}
                    {data.businesses?.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Briefcase size={12} /> Negocios</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {data.businesses.map(b => (
                                    <PropertyCard
                                        key={`biz-${b.ID}`}
                                        icon={Briefcase}
                                        title={b.Nombre || `Negocio #${b.ID}`}
                                        subtitle={`Entrada: ${fmt(b.CostoEntrada || 0)}`}
                                        color="green"
                                        detailLabel="Ganancias"
                                        detailValue={fmt(b.Ganancias || 0)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* COMPANIES */}
                    {data.companies?.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Settings size={12} /> Empresas</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {data.companies.map(c => (
                                    <PropertyCard
                                        key={`comp-${c.ID}`}
                                        icon={Settings}
                                        title={c.Nombre || `Empresa #${c.ID}`}
                                        subtitle="Corporación"
                                        color="blue"
                                        detailLabel="Presupuesto"
                                        detailValue={fmt(c.Presupuesto || 0)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GARAGES */}
                    {data.garages?.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Car size={12} /> Garages</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {data.garages.map(g => (
                                    <PropertyCard
                                        key={`gar-${g.ID}`}
                                        icon={Car}
                                        title={`Garage #${g.ID}`}
                                        subtitle="Privado"
                                        color="orange"
                                        detailLabel="Valor"
                                        detailValue={fmt(g.Precio || 0)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {(!data.houses?.length && !data.businesses?.length && !data.companies?.length && !data.garages?.length) && (
                        <div className="text-center py-12 text-gray-500 italic">No tienes propiedades registradas con este personaje.</div>
                    )}
                </div>
            );
        } catch (err) { setModalContent(<p className="text-red-400">Error cargando propiedades</p>); }
        setLoadingInfo(false);
    };

    const fetchSkills = async () => {
        if (!selectedCharacter) return;
        setModalTitle(`Habilidades de ${selectedCharacter.Nombre_Apellido.replace('_', ' ')}`);
        setModalContent(null);
        setModalOpen(true);
        setLoadingInfo(true);

        try {
            const skills = [
                { id: 'h1', name: 'Repartidor', value: selectedCharacter.Habilidad1, icon: Package },
                { id: 'h2', name: 'Granjero', value: selectedCharacter.Habilidad2, icon: Sprout },
                { id: 'h3', name: 'Aserrador', value: selectedCharacter.Habilidad3, icon: Axe },
                { id: 'h4', name: 'Basurero', value: selectedCharacter.Habilidad4, icon: Trash2 },
                { id: 'h5', name: 'Trailero', value: selectedCharacter.Habilidad5, icon: Truck },
                { id: 'h6', name: 'Delincuente', value: selectedCharacter.Habilidad6, icon: Skull },
                { id: 'h7', name: 'Minero', value: selectedCharacter.Habilidad7, icon: Hammer },
                { id: 'h8', name: 'Contrabando', value: selectedCharacter.Habilidad8, icon: Briefcase },
            ];

            setModalContent(
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {skills.map((s, idx) => {
                        const Icon = s.icon;
                        return (
                            <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4 hover:bg-white/10 transition-colors">
                                <div className={`p-3 rounded-lg ${s.value > 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-700/30 text-gray-600'}`}>
                                    <Icon size={24} strokeWidth={1.5} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className={`font-bold ${s.value > 0 ? 'text-gray-200' : 'text-gray-500'}`}>{s.name}</h4>
                                        <span className="text-xs font-mono text-gray-400">Pts: {s.value || 0}</span>
                                    </div>
                                    <div className="w-full bg-gray-700/30 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min((s.value || 0), 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );

        } catch (err) {
            setModalContent(<p className="text-red-400">Error cargando habilidades.</p>);
        }
        setLoadingInfo(false);
    };

    if (!userData) return null;

    // Helper to format money
    const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

    // Admin Ranks Mapping
    const getAdminTitle = (level) => {
        switch (level) {
            case 1: return "Support";
            case 2: return "Moderator";
            case 3: return "Game Admin";
            case 4: return "Senior Admin";
            case 5: return "Leadership";
            default: return `Nivel ${level}`;
        }
    };

    // VIP Level Mapping
    const getVIPTitle = (level) => {
        switch (level) {
            case 1: return "Plata";
            case 2: return "Oro";
            case 3: return "Minerva";
            case 4: return "Otis";
            case 5: return "Titan";
            default: return "VIP";
        }
    };

    // Format Expiration Date
    const getExpirationDate = (timestamp) => {
        if (!timestamp) return "";
        return new Date(timestamp * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // VIEW: CHARACTER SELECTION
    if (!selectedCharacter) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-10 max-w-7xl mx-auto h-[calc(100vh-40px)] overflow-y-auto no-scrollbar relative flex flex-col"
            >
                {/* Logout Button (Top Right) */}
                <div className="absolute top-10 right-10">
                    <button
                        onClick={async () => {
                            if (userData?.id) {
                                try {
                                    await fetch('http://localhost:3001/api/auth/logout', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: userData.id })
                                    });
                                } catch (e) { console.error("Logout failed", e); }
                            }
                            localStorage.removeItem('user_session');
                            window.dispatchEvent(new Event('auth-change'));
                            navigate('/login');
                        }}
                        className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20"
                    >
                        <span className="text-xs font-bold uppercase tracking-wider">Cerrar Sesión</span>
                    </button>
                </div>

                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-white mb-2">Selecciona tu Personaje</h1>
                    <p className="text-gray-400">Elige con quién deseas jugar hoy</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
                    {allCharacters.map(char => {
                        const isBanned = char.OtakuN_N > 0;
                        return (
                            <motion.button
                                key={char.ID}
                                whileHover={!isBanned ? { scale: 1.05, borderColor: 'rgba(99, 102, 241, 0.5)' } : {}}
                                whileTap={!isBanned ? { scale: 0.95 } : {}}
                                onClick={() => !isBanned && setSelectedCharacter(char)}
                                className={`relative border rounded-3xl p-8 flex flex-col items-center gap-4 group transition-all overflow-hidden
                                    ${isBanned
                                        ? 'bg-red-900/10 border-red-500/30 cursor-not-allowed grayscale-[0.5]'
                                        : 'bg-[#18181b] border-white/10 cursor-pointer hover:border-indigo-500/30'
                                    }`}
                            >
                                {isBanned && (
                                    <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg z-10">
                                        BANEADO
                                    </div>
                                )}

                                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg transition-transform ${isBanned ? 'bg-gray-800' : 'bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-indigo-500/30 group-hover:scale-110'}`}>
                                    {char.Nombre_Apellido.charAt(0)}
                                </div>
                                <div className="text-center">
                                    <h3 className={`text-xl font-bold transition-colors ${isBanned ? 'text-red-300 line-through' : 'text-white group-hover:text-indigo-400'}`}>
                                        {char.Nombre_Apellido.replace('_', ' ')}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">{char.FugaoVicio || 0} Horas • {char.MiembroFaccion === 0 ? "Civil" : "Facción"}</p>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Account Summary Footer */}
                <div className="mt-16 text-center">
                    <div className="inline-flex items-center gap-10 bg-[#121214] border border-white/10 px-10 py-5 rounded-3xl shadow-2xl backdrop-blur-sm">

                        <div className="flex flex-col items-center text-center">
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Coins</span>
                            <span className="text-yellow-400 font-mono font-bold text-xl drop-shadow-sm">
                                {userData.coins !== undefined ? userData.coins : 0}
                            </span>
                        </div>

                        <div className="w-px h-10 bg-white/10"></div>

                        <div className="flex flex-col items-center text-center">
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Estado VIP</span>
                            <span className={`font-bold text-lg ${userData.vip ? "text-purple-400" : "text-gray-500"}`}>
                                {userData.vip ? "ACTIVO" : "INACTIVO"}
                            </span>
                        </div>

                        <div className="w-px h-10 bg-white/10"></div>

                        <div className="flex flex-col items-center text-center">
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Rango Admin</span>
                            <span className={`font-bold text-lg ${userData.rank > 0 ? "text-red-400" : "text-gray-500"}`}>
                                {userData.rank > 0 ? getAdminTitle(userData.rank) : "NINGUNO"}
                            </span>
                        </div>

                    </div>
                </div>
            </motion.div>
        );
    }




    // Job Name Mapping
    const getJobName = (id) => {
        switch (id) {
            case 1: return "Repartidor";
            case 2: return "Granjero";
            case 3: return "Aserrador";
            case 4: return "Prostituta";
            case 5: return "Basurero";
            case 6: return "Trailero";
            case 7: return "Carnicero";
            case 8: return "Delincuente";
            case 9: return "Contrabandista";
            case 10: return "Minero";
            case 11: return "Colectivero";
            case 12: return "Tec. Cajeros";
            default: return null;
        }
    };

    // VIEW: DASHBOARD (Selected Character)
    if (!selectedCharacter) return null; // Safety Guard
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-10 max-w-7xl mx-auto h-[calc(100vh-40px)] overflow-y-auto no-scrollbar"
        >
            {/* Header with Back Button */}
            <div className="flex justify-between items-center mb-8">
                <button
                    onClick={() => setSelectedCharacter(null)}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                >
                    <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10"><ChevronDown className="rotate-90" size={16} /></div>
                    <span className="font-bold text-sm">Volver a Selección</span>
                </button>

                <div className="flex items-center gap-4">
                    <span className="text-gray-500 text-xs font-mono">{selectedCharacter.ID}</span>
                    <div className="h-4 w-px bg-white/10"></div>
                    <button
                        onClick={async () => {
                            if (userData?.id) {
                                try {
                                    await fetch('http://localhost:3001/api/auth/logout', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: userData.id })
                                    });
                                } catch (e) { console.error("Logout failed", e); }
                            }
                            localStorage.removeItem('user_session');
                            window.dispatchEvent(new Event('auth-change'));
                            navigate('/login');
                        }}
                        className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                    >
                        <LogOut size={14} />
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            {/* Character Banner */}
            <div className="relative rounded-3xl overflow-hidden bg-[#18181b] border border-white/5 p-8 mb-6 group">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-indigo-600/10 via-purple-900/10 to-transparent blur-3xl opacity-50 pointer-events-none -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-indigo-500/20">
                            {selectedCharacter.Nombre_Apellido.charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-4xl font-black text-white italic tracking-tighter">{selectedCharacter.Nombre_Apellido.replace('_', ' ')}</h1>
                                {selectedCharacter.OtakuN_N > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">BANNED</span>}
                            </div>
                            <div className="flex items-center gap-3 text-gray-400 text-sm font-medium">
                                <span className={`px-2 py-0.5 rounded bg-white/5 ${selectedCharacter.JotoOtaku > 0 ? 'text-red-400 border border-red-500/20' : ''}`}>
                                    {selectedCharacter.JotoOtaku > 0 ? getAdminTitle(selectedCharacter.JotoOtaku) : 'Usuario'}
                                </span>
                                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                <span>{selectedCharacter.FugaoVicio || 0} Horas</span>
                                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                <span>{selectedCharacter.MiembroFaccion === 0 ? "Civil" : "Facción " + selectedCharacter.MiembroFaccion}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-8 text-right">
                        <div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Efectivo</div>
                            <div className="text-2xl font-mono font-bold text-emerald-400">{fmt(selectedCharacter.BolosUwU || 0)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Banco</div>
                            <div className="text-2xl font-mono font-bold text-indigo-400">{fmt(selectedCharacter.BanescoOwO || 0)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <ActionButton icon={Car} label="Gestionar Vehículos" color="blue" onClick={fetchVehicles} />
                <ActionButton icon={Home} label="Propiedades" color="green" onClick={fetchProperties} />
                <ActionButton icon={Zap} label="Habilidades" color="orange" onClick={fetchSkills} />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Briefcase size={18} className="text-gray-400" />
                        Ocupaciones
                    </h3>
                    <div className="space-y-1">
                        <StatRow label="Horas Jugadas" value={`${selectedCharacter.FugaoVicio || 0} h`} subValue="En Total" />
                        <StatRow label="Skin ID" value={selectedCharacter.Skin} />
                        {[selectedCharacter.Trabajo1, selectedCharacter.Trabajo2, selectedCharacter.Trabajo3]
                            .filter(id => id > 0)
                            .map((id, index) => (
                                <StatRow
                                    key={index}
                                    label={`Trabajo ${index + 1}`}
                                    value={getJobName(id) || "Desconocido"}
                                    highlight
                                />
                            ))}
                        {![selectedCharacter.Trabajo1, selectedCharacter.Trabajo2, selectedCharacter.Trabajo3].some(id => id > 0) && (
                            <StatRow label="Estado" value="Sin empleo" />
                        )}
                    </div>
                </div>

                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Settings size={18} className="text-gray-400" />
                        Cuenta
                    </h3>
                    <div className="space-y-1">
                        <StatRow
                            label="Membresía VIP"
                            value={userData.vip ? getVIPTitle(userData.vip) : "Inactivo"}
                            subValue={userData.vip ? `Vence: ${getExpirationDate(userData.expiration)}` : null}
                            highlight={userData.vip}
                        />
                        <StatRow label="Coins" value={userData.coins} subValue="" highlight />
                        <StatRow label="ID Cuenta" value={userData.id} />
                    </div>
                </div>
            </div>

            {/* INVENTORY SECTION */}
            <div className="mt-6 bg-[#18181b] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-900/10 blur-[100px] pointer-events-none"></div>
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                    <Package size={18} className="text-emerald-400" />
                    Inventario & Equipamiento
                </h3>

                <div className="flex flex-col lg:flex-row gap-8 relative z-10">
                    {/* EQUIPAMIENTO (Left/Right Hand + Back) */}
                    <div className="flex-1 flex flex-col gap-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Equipado</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* LEFT HAND */}
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center gap-2">
                                <span className="text-[10px] text-gray-500 uppercase font-bold">Mano Izquierda</span>
                                {selectedCharacter.Mano_izquierda > 0 ? (
                                    <>
                                        <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg"><Shield size={24} /></div>
                                        <div>
                                            <div className="font-bold text-white text-sm">{getItemInfo(selectedCharacter.Mano_izquierda).name}</div>
                                            {selectedCharacter.Cantidad_mano_izquierda > 1 && <div className="text-xs text-emerald-400">x{selectedCharacter.Cantidad_mano_izquierda}</div>}
                                        </div>
                                    </>
                                ) : <span className="text-gray-600 text-xs italic">Vacio</span>}
                            </div>

                            {/* RIGHT HAND */}
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center gap-2">
                                <span className="text-[10px] text-gray-500 uppercase font-bold">Mano Derecha</span>
                                {selectedCharacter.Mano_derecha > 0 ? (
                                    <>
                                        <div className="p-3 bg-red-500/20 text-red-400 rounded-lg"><Axe size={24} /></div>
                                        <div>
                                            <div className="font-bold text-white text-sm">{getItemInfo(selectedCharacter.Mano_derecha).name}</div>
                                            {selectedCharacter.Cantidad_mano_derecha > 1 && <div className="text-xs text-red-400">x{selectedCharacter.Cantidad_mano_derecha}</div>}
                                        </div>
                                    </>
                                ) : <span className="text-gray-600 text-xs italic">Vacio</span>}
                            </div>

                            {/* BACK */}
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center gap-2">
                                <span className="text-[10px] text-gray-500 uppercase font-bold">Espalda</span>
                                {selectedCharacter.Espalda > 0 ? (
                                    <>
                                        <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg"><Briefcase size={24} /></div>
                                        <div>
                                            <div className="font-bold text-white text-sm">{getItemInfo(selectedCharacter.Espalda).name}</div>
                                            {/* Quantity for back usually 1, but check if needed */}
                                        </div>
                                    </>
                                ) : <span className="text-gray-600 text-xs italic">Vacio</span>}
                            </div>
                        </div>
                    </div>

                    {/* LOCKER/POCKETS */}
                    <div className="flex-[1.5]">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Bolsillos</h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                            {Array.from({ length: 9 }).map((_, i) => {
                                const idx = i + 1;
                                const itemId = selectedCharacter[`Bolsillo_${idx}`];
                                const quantity = selectedCharacter[`Cantidad_bolsillo_${idx}`];
                                const itemReq = itemId > 0 ? getItemInfo(itemId) : null;

                                return (
                                    <div key={i} className={`aspect-square rounded-xl border flex flex-col items-center justify-center relative p-2 text-center transition-all
                                        ${itemReq
                                            ? 'bg-white/10 border-white/20 hover:bg-white/15'
                                            : 'bg-black/20 border-white/5'
                                        }`}>

                                        {itemReq ? (
                                            <>
                                                <div className="text-[10px] uppercase font-bold text-gray-400 absolute top-1.5 left-2">#{idx}</div>
                                                <div className="flex-1 flex items-center justify-center">
                                                    {/* Icon placeholder based on category */}
                                                    <div className={`p-2 rounded-full mb-1 ${itemReq.category === 'Armas' ? 'bg-red-500/20 text-red-400' :
                                                        itemReq.category === 'Drogas' ? 'bg-green-900/40 text-green-400' :
                                                            itemReq.category === 'Alimentos' ? 'bg-orange-500/20 text-orange-400' :
                                                                itemReq.category === 'Municion' ? 'bg-yellow-600/20 text-yellow-500' :
                                                                    'bg-gray-700/50 text-gray-400'
                                                        }`}>
                                                        {itemReq.category === 'Armas' ? <Axe size={16} /> :
                                                            itemReq.category === 'Alimentos' ? <Sprout size={16} /> :
                                                                <Package size={16} />}
                                                    </div>
                                                </div>
                                                <div className="text-[10px] font-bold text-gray-200 leading-tight line-clamp-2 w-full">{itemReq.name}</div>
                                                {quantity > 1 && (
                                                    <div className="absolute top-1.5 right-2 bg-white/20 text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow-lg backdrop-blur-sm">
                                                        x{quantity}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-gray-700 text-xs font-mono opacity-20">{idx}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <InfoModal title={modalTitle} isOpen={modalOpen} onClose={() => setModalOpen(false)}>
                {loadingInfo ? (
                    <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
                ) : modalContent}
            </InfoModal>

        </motion.div>
    );
};

export default Profile;
