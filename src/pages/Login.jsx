import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import RegistrationModal from '../components/RegistrationModal';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    // Note: useNavigate might not be available if we render Login outside Router in App.jsx
    // But we will keep it for compatibility if we decide to wrap it.
    // For the "Event based" auth, we just trigger the event.

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!username || !password) {
            setError('Por favor completa todos los campos.');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                localStorage.setItem('user_session', JSON.stringify(data));

                // CRITICAL FIX: Reset the router hash to ensure we start at Home/Profile
                // and NOT stay at #/login, which causes double login screens.
                window.location.hash = '/';

                // Dispatch event to notify Parent (App.jsx)
                window.dispatchEvent(new Event('auth-change'));
            } else {
                setError(data.error || 'Credenciales incorrectas');
            }
        } catch (err) {
            setError('No se pudo conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#0f0f13] relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[420px] z-10 p-6"
            >
                <div className="bg-[#18181b]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative">

                    {/* Floating Icon */}
                    <div className="flex justify-center mb-8">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <ShieldCheck size={40} className="text-white drop-shadow-md" />
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Bienvenido</h1>
                        <p className="text-gray-400 text-sm">Inicia sesión para acceder al Launcher</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="bg-red-500/10 border border-red-500/20 text-red-200 p-3 rounded-xl mb-6 flex items-center gap-3 text-sm font-medium"
                        >
                            <AlertCircle size={18} className="text-red-400 shrink-0" />
                            {error}
                        </motion.div>
                    )}

                    {successMessage && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="bg-green-500/10 border border-green-500/20 text-green-200 p-3 rounded-xl mb-6 flex items-center gap-3 text-sm font-medium"
                        >
                            <ShieldCheck size={18} className="text-green-400 shrink-0" />
                            {successMessage}
                        </motion.div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Usuario</label>
                            <div className="relative group transition-all">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-[#09090b] border border-white/10 group-hover:border-white/20 rounded-xl py-3.5 pl-11 pr-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium placeholder:text-gray-700"
                                    placeholder="Tu nombre de usuario"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Contraseña</label>
                            <div className="relative group transition-all">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#09090b] border border-white/10 group-hover:border-white/20 rounded-xl py-3.5 pl-11 pr-11 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium placeholder:text-gray-700"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 p-1 rounded-md transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-indigo-600/20 active:scale-[0.98] ${loading ? 'opacity-80' : ''}`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Ingresar</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center space-y-2">
                        <p className="text-gray-600 text-xs">
                            ¿Olvidaste tu contraseña? <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">Recuperar acceso</a>
                        </p>
                        <p className="text-gray-600 text-xs">
                            ¿No tienes cuenta? <button onClick={() => setShowRegister(true)} className="text-indigo-400 hover:text-indigo-300 transition-colors font-bold hover:underline">Crear cuenta gratis</button>
                        </p>
                    </div>
                </div>

                <p className="text-center text-gray-700 text-xs mt-8">
                    GTA Seoul Launcher v1.0.9
                </p>
            </motion.div>
            <AnimatePresence>
                {showRegister && (
                    <RegistrationModal
                        isOpen={showRegister}
                        onClose={() => setShowRegister(false)}
                        onRegisterSuccess={(uid, user) => {
                            setShowRegister(false);
                            setUsername(user);
                            setError(null);
                            setSuccessMessage('¡Cuenta creada! Introduce tu contraseña para entrar.');
                        }}
                    />
                )}
            </AnimatePresence>
        </div >
    );
};

export default Login;
