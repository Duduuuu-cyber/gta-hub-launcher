import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, User, MapPin, Plus, Sun, Building, Zap } from 'lucide-react';
import { API_BASE_URL } from '../api/config';

const CharacterCreatorModal = ({ isOpen, onClose, userId, onCreateSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        sex: 1, // 1 = Hombre, 0 = Mujer
        city: 1 // 1 = VC, 2 = SF, 3 = LV
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Name Validation
        if (!formData.name || !formData.surname) {
            setError("Debes ingresar Nombre y Apellido");
            return;
        }

        // Capitalize
        const cleanName = formData.name.charAt(0).toUpperCase() + formData.name.slice(1).toLowerCase();
        const cleanSurname = formData.surname.charAt(0).toUpperCase() + formData.surname.slice(1).toLowerCase();
        const fullName = `${cleanName}_${cleanSurname}`;

        if (!/^[A-Z][a-z]+_[A-Z][a-z]+$/.test(fullName)) {
            setError("Formato incorrecto. Ejemplo: Gabriel_Yanquetruz");
            return;
        }

        setLoading(true);

        try {
            // Determine default skin based on sex (match PAWN logic)
            // Male (1) -> 299, Female (0) -> 41
            const defaultSkin = formData.sex === 1 ? 299 : 41;

            const res = await fetch(`${API_BASE_URL}/api/characters/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    name: fullName,
                    sex: formData.sex,
                    city: formData.city,
                    skin: defaultSkin
                })
            });
            const data = await res.json();

            if (data.success) {
                onCreateSuccess();
                onClose();
            } else {
                setError(data.error || "Error al crear personaje");
            }
        } catch (err) {
            setError("Error de conexión con el servidor");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#18181b] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            >
                <div className="p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                        <X size={20} />
                    </button>

                    <h2 className="text-2xl font-bold text-white mb-1">Crear Nuevo Personaje</h2>
                    <p className="text-gray-400 text-sm mb-6">Define tu identidad en GTA Seoul</p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name Section */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <User size={12} /> Nombre del Personaje
                            </label>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-black/20 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-indigo-500 transition-colors"
                                        placeholder="Nombre"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-black/20 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-indigo-500 transition-colors"
                                        placeholder="Apellido"
                                        value={formData.surname}
                                        onChange={e => setFormData({ ...formData, surname: e.target.value })}
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-600">Formato: Nombre_Apellido. Sin caracteres especiales.</p>
                        </div>

                        {/* Gender Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Género</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, sex: 1 })}
                                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.sex === 1
                                        ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    <User size={32} />
                                    <span className="font-bold">Masculino</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, sex: 0 })}
                                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.sex === 0
                                        ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    <User size={32} />
                                    <span className="font-bold">Femenino</span>
                                </button>
                            </div>
                        </div>

                        {/* Origin Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <MapPin size={12} /> Ciudad de Origen
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 1, name: "Vice City", icon: <Sun size={20} />, color: "text-cyan-400" },
                                    { id: 2, name: "San Fierro", icon: <Building size={20} />, color: "text-green-400" },
                                    { id: 3, name: "Las Venturas", icon: <Zap size={20} />, color: "text-yellow-400" }
                                ].map(city => (
                                    <button
                                        key={city.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, city: city.id })}
                                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-sm font-bold transition-all ${formData.city === city.id
                                            ? `bg-white/10 border-white text-white shadow-lg`
                                            : 'bg-black/20 border-white/5 text-gray-500 hover:bg-white/5'
                                            }`}
                                    >
                                        <span className={formData.city === city.id ? 'text-white' : 'text-gray-500'}>
                                            {city.icon}
                                        </span>
                                        {city.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creando...' : (
                                <>
                                    <Plus size={20} /> FINALIZAR CREACIÓN
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default CharacterCreatorModal;
