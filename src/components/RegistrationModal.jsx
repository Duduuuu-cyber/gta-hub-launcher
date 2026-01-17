import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, Mail, Shield, Check } from 'lucide-react';
import { API_BASE_URL } from '../api/config';

const RegistrationModal = ({ isOpen, onClose, onRegisterSuccess }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        securityQuestion: 'Nombre de tu primera mascota',
        securityAnswer: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const questions = [
        "Nombre de tu primera mascota",
        "Ciudad donde nacieron tus padres",
        "Nombre de tu mejor amigo de la infancia",
        "Marca de tu primer coche",
        "Tu película favorita"
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (formData.password !== formData.confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                    email: formData.email,
                    securityQuestion: formData.securityQuestion,
                    securityAnswer: formData.securityAnswer
                })
            });
            const data = await res.json();

            if (data.success) {
                onRegisterSuccess(data.userId, formData.username);
                onClose();
            } else {
                setError(data.error || "Error al registrar");
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
                className="bg-[#18181b] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            >
                <div className="p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                        <X size={20} />
                    </button>

                    <h2 className="text-2xl font-bold text-white mb-1">Crear Cuenta</h2>
                    <p className="text-gray-400 text-sm mb-6">Únete a GTA Seoul Roleplay</p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Usuario</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-indigo-500 transition-colors"
                                    placeholder="Nombre_Usuario"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-gray-500" size={16} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-indigo-500 transition-colors"
                                    placeholder="correo@ejemplo.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-gray-500" size={16} />
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-indigo-500 transition-colors"
                                        placeholder="••••••"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Confirmar</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-gray-500" size={16} />
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-indigo-500 transition-colors"
                                        placeholder="••••••"
                                        value={formData.confirmPassword}
                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Seguridad</label>
                            <div className="relative mb-2">
                                <Shield className="absolute left-3 top-3 text-gray-500" size={16} />
                                <select
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-indigo-500 appearance-none cursor-pointer"
                                    value={formData.securityQuestion}
                                    onChange={e => setFormData({ ...formData, securityQuestion: e.target.value })}
                                >
                                    {questions.map(q => <option key={q} value={q}>{q}</option>)}
                                </select>
                            </div>
                            <input
                                type="text"
                                required
                                className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 px-4 text-white focus:border-indigo-500 transition-colors"
                                placeholder="Tu respuesta..."
                                value={formData.securityAnswer}
                                onChange={e => setFormData({ ...formData, securityAnswer: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl mt-4 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creando cuenta...' : (
                                <>
                                    <Check size={18} /> CREAR CUENTA
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default RegistrationModal;
