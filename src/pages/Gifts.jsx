import React, { useState, useEffect } from 'react';
import { Gift, Star, Zap, Award, Check, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const GiftCard = ({ gift, onClaim, onDelete, isAdmin, loading }) => {
    const isMoney = gift.reward_type === 'MONEY';
    const isVIP = gift.reward_type === 'VIP';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5 }}
            className={`relative overflow-hidden rounded-3xl border p-6 flex flex-col items-center text-center gap-4 transition-all group
            ${gift.claimed
                    ? 'bg-[#18181b]/50 border-white/5 opacity-70 grayscale'
                    : 'bg-gradient-to-br from-[#1c1c22] to-[#121214] border-white/10 shadow-xl shadow-indigo-900/10'}`}
        >
            {/* Delete Button (Admin Only) */}
            {isAdmin && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(gift); }}
                    className="absolute top-4 right-4 p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20"
                    title="Eliminar Regalo"
                >
                    <X size={16} />
                </button>
            )}

            {/* Shine Effect for active */}
            {!gift.claimed && (
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none"></div>
            )}

            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-inner
                ${gift.claimed ? 'bg-gray-800 text-gray-600' : 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-indigo-500/30'}`}>
                {gift.icon === 'star' && <Star fill="currentColor" size={32} />}
                {gift.icon === 'zap' && <Zap fill="currentColor" size={32} />}
                {gift.icon === 'award' && <Award size={32} />}
                {/* Default */}
                {(!['star', 'zap', 'award'].includes(gift.icon)) && <Gift size={32} />}
            </div>

            <div className="z-10">
                <h3 className="text-xl font-bold text-white mb-1">{gift.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-4 max-w-[200px] mx-auto min-h-[32px]">{gift.description}</p>

                <div className="bg-black/40 rounded-lg px-4 py-2 border border-white/5 inline-flex items-center gap-2 mb-6">
                    <span className="text-yellow-400 font-bold font-mono text-lg">
                        {isMoney ? '$' : '+'}{gift.reward_data || gift.reward_coins}
                    </span>
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">
                        {isMoney ? 'Dinero' : isVIP ? 'Días VIP' : 'Coins'}
                    </span>
                </div>

                {gift.claimed ? (
                    <div className="flex items-center justify-center gap-2 text-green-400 font-bold text-sm bg-green-500/10 py-2 px-6 rounded-xl w-full">
                        <Check size={16} />
                        CANJEADO
                    </div>
                ) : (
                    <button
                        onClick={() => onClaim(gift)}
                        disabled={loading}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-white/20 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? '...' : 'RECLAMAR'}
                    </button>
                )}
            </div>
        </motion.div>
    );
};

const CreateGiftModal = ({ isOpen, onClose, onCreate }) => {
    const [form, setForm] = useState({ title: '', description: '', reward: 1000, type: 'COINS', icon: 'gift', isWelcome: false });

    const handleSubmit = () => {
        if (!form.title || !form.reward) return;
        onCreate(form);
        setForm({ title: '', description: '', reward: 1000, type: 'COINS', icon: 'gift', isWelcome: false });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-white">Crear Nuevo Regalo</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-500 hover:text-white" /></button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-black mb-1 block">Título</label>
                        <input
                            type="text"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                            placeholder="Ej. Bono de Bienvenida"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-black mb-1 block">Descripción</label>
                        <textarea
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none h-20 resize-none"
                            placeholder="Mensaje para el usuario..."
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-black mb-1 block">Tipo de Premio</label>
                            <select
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none"
                                value={form.type}
                                onChange={e => setForm({ ...form, type: e.target.value })}
                            >
                                <option value="COINS">Seoul Coins (Cuenta)</option>
                                <option value="MONEY">Dinero (PJ - No Usar en Bienvenida)</option>
                                <option value="VIP">VIP (Días)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-black mb-1 block">
                                {form.type === 'VIP' ? 'Días' : 'Cantidad'}
                            </label>
                            <input
                                type="number"
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none font-mono"
                                value={form.reward}
                                onChange={e => setForm({ ...form, reward: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20">
                        <input
                            type="checkbox"
                            id="isWelcome"
                            className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                            checked={form.isWelcome}
                            onChange={e => setForm({ ...form, isWelcome: e.target.checked })}
                        />
                        <label htmlFor="isWelcome" className="text-sm font-bold text-indigo-300 cursor-pointer select-none">
                            Marcar como Regalo de Bienvenida ÚNICO
                        </label>
                    </div>
                    <p className="text-[10px] text-gray-500">
                        Nota: Al marcar esto, se desactivará cualquier otro regalo de bienvenida activo. Este será el que se muestre al iniciar sesión.
                    </p>

                    <div>
                        <label className="text-xs text-gray-500 uppercase font-black mb-1 block">Icono Visual</label>
                        <div className="flex gap-4">
                            {['gift', 'star', 'zap', 'award'].map(ic => (
                                <button
                                    key={ic}
                                    onClick={() => setForm({ ...form, icon: ic })}
                                    className={`p-3 rounded-xl border transition-all ${form.icon === ic ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'border-white/10 text-gray-500 hover:text-white'}`}
                                >
                                    {ic === 'gift' && <Gift size={20} />}
                                    {ic === 'star' && <Star fill="currentColor" size={20} />}
                                    {ic === 'zap' && <Zap fill="currentColor" size={20} />}
                                    {ic === 'award' && <Award size={20} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-0">
                    <button
                        onClick={handleSubmit}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        PUBLICAR REGALO
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const ClaimModal = ({ isOpen, onClose, characters, onConfirm }) => {
    const [selectedChar, setSelectedChar] = useState(null);

    // Auto-select if only one char exists
    useEffect(() => {
        if (characters && characters.length === 1) setSelectedChar(characters[0].ID);
    }, [characters]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden p-6"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-xl font-bold text-white mb-2 text-center">Selecciona Personaje</h3>
                <p className="text-gray-400 text-sm text-center mb-6">¿En qué personaje deseas recibir el premio?</p>

                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                    {characters.map(char => (
                        <button
                            key={char.ID}
                            onClick={() => setSelectedChar(char.ID)}
                            className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all
                                ${selectedChar === char.ID
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                            <span className="font-bold">{char.Nombre_Apellido}</span>
                            {selectedChar === char.ID && <Check size={16} />}
                        </button>
                    ))}
                    {characters.length === 0 && (
                        <p className="text-red-400 text-center text-xs">No tienes personajes creados.</p>
                    )}
                </div>

                <div className="flex gap-4">
                    <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-gray-400">Cancelar</button>
                    <button
                        onClick={() => selectedChar && onConfirm(selectedChar)}
                        disabled={!selectedChar}
                        className="flex-1 py-3 bg-white text-black rounded-xl text-sm font-bold disabled:opacity-50"
                    >
                        Confirmar
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const Gifts = () => {
    const [gifts, setGifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [characters, setCharacters] = useState([]); // Chars for selection
    const [isAdmin, setIsAdmin] = useState(false);

    // UI State
    const [showCreate, setShowCreate] = useState(false);
    const [claimTarget, setClaimTarget] = useState(null); // The gift being claimed
    const [claimLoading, setClaimLoading] = useState(null);

    useEffect(() => {
        const session = localStorage.getItem('user_session');
        if (session) {
            const parsed = JSON.parse(session);
            setUser(parsed.user);
            // Characters Parsing
            let chars = [];
            if (Array.isArray(parsed.characters)) chars = parsed.characters;
            else if (parsed.characters) chars = [parsed.characters];
            setCharacters(chars);

            // Is Admin? Rank >= 5 (Leadership)
            setIsAdmin(parsed.user.rank >= 5);

            fetchGifts(parsed.user.id);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchGifts = async (userId) => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3001/api/gifts?userId=${userId}`);
            const data = await res.json();
            if (Array.isArray(data)) setGifts(data);
        } catch (e) {
            console.error("Error loading gifts", e);
        }
        setLoading(false);
    };

    const initiateClaim = (gift) => {
        // Prepare to claim: Open char select modal
        setClaimTarget(gift);
    };

    const confirmClaim = async (characterId) => {
        const giftId = claimTarget.id;

        if (claimLoading) return;
        setClaimLoading(giftId);

        try {
            const res = await fetch('http://localhost:3001/api/gifts/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, giftId, characterId })
            });

            const result = await res.json();
            if (res.ok) {
                // Success FX
                confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: ['#fbbf24', '#f59e0b', '#818cf8', '#ffffff']
                });

                // Update List
                setGifts(prev => prev.map(g => g.id === giftId ? { ...g, claimed: true } : g));
                setClaimTarget(null); // Close modal only on success

                // If reward was COINS, update session balance locally
                if (claimTarget.reward_type === 'COINS' || !claimTarget.reward_type) { // Default coins
                    const session = JSON.parse(localStorage.getItem('user_session'));
                    if (session) {
                        session.user.coins = result.newBalance;
                        localStorage.setItem('user_session', JSON.stringify(session));
                        window.dispatchEvent(new Event('auth-change'));
                    }
                }
            } else {
                // Play error sound?
                alert(result.error);
                setClaimTarget(null);
            }
        } catch (e) {
            alert("Error de conexión");
            setClaimTarget(null);
        }
        setClaimLoading(null);
    };

    const handleDelete = async (gift) => {
        if (!confirm(`¿Estás seguro de eliminar "${gift.title}"?`)) return;

        try {
            const res = await fetch(`http://localhost:3001/api/gifts/${gift.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            if (res.ok) {
                setGifts(prev => prev.filter(g => g.id !== gift.id));
            } else {
                alert("Error eliminando regalo");
            }
        } catch (e) { console.error(e); }
    };

    const handleCreate = async (formData) => {
        try {
            const res = await fetch('http://localhost:3001/api/gifts/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, userId: user.id })
            });
            if (res.ok) {
                setShowCreate(false);
                fetchGifts(user.id);
            } else {
                const data = await res.json();
                alert('Error: ' + (data.error || 'Server error'));
            }
        } catch (e) { console.error(e); }
    };

    if (!user) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
                <div className="bg-white/5 p-6 rounded-full mb-6 text-gray-400">
                    <Gift size={48} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Inicia Sesión</h2>
                <p className="text-gray-500 max-w-sm">Para ver y reclamar tus regalos exclusivos debes acceder con tu cuenta.</p>
            </div>
        );
    }

    return (
        <div className="p-10 max-w-7xl mx-auto h-full overflow-y-auto no-scrollbar">

            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter mb-2">Zona de Regalos</h1>
                    <p className="text-gray-400">Recompensas exclusivas por jugar en GTA Seoul.</p>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition-all text-indigo-400 hover:text-white font-bold text-sm"
                    >
                        <Plus size={18} />
                        CREAR REGALO (LIDER)
                    </button>
                )}
            </div>

            {/* Gifts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-[300px] bg-white/5 rounded-3xl animate-pulse"></div>)
                ) : (
                    gifts.map(gift => (
                        <GiftCard
                            key={gift.id}
                            gift={gift}
                            onClaim={initiateClaim}
                            onDelete={handleDelete}
                            isAdmin={isAdmin}
                            loading={claimLoading === gift.id}
                        />
                    ))
                )}
            </div>

            {!loading && gifts.length === 0 && (
                <div className="text-center py-20 opacity-50">
                    <p className="text-gray-500 text-xl font-bold">No hay regalos disponibles por ahora.</p>
                </div>
            )}

            <CreateGiftModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                onCreate={handleCreate}
            />

            <ClaimModal
                isOpen={!!claimTarget}
                onClose={() => setClaimTarget(null)}
                characters={characters}
                onConfirm={confirmClaim}
            />
        </div>
    );
};

export default Gifts;
