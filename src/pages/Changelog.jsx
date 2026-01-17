import React, { useState } from 'react';
import { History, Star, Wrench, Bug, Zap, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Changelog = () => {
    // Example data - normally this would fetch from a JSON
    const [changes] = useState([
        {
            version: '1.1.0',
            date: '17 Enero 2026',
            isLatest: true,
            features: [
                { type: 'new', text: 'Inventario Visual en Perfil (Items, Skins, Equipamiento).' },
                { type: 'improve', text: 'Seguridad Mejorada: Anti-Bruteforce y Subnet Auth.' },
                { type: 'new', text: 'Soporte Regalos de Bienvenida (Dinero/Vip).' },
                { type: 'fix', text: 'Solucionado error de conexión 127.0.0.1 (IP Dinámica).' },
                { type: 'improve', text: 'Bloqueador Offline nativo (Sin falsos positivos).' },
                { type: 'fix', text: 'Corrección visual de Skills (0 Pts) y Badges.' },
                { type: 'improve', text: 'Backend optimizado con Connection Pooling.' }
            ]
        },
        {
            version: '1.0.9',
            date: '16 Enero 2026',
            isLatest: false,
            features: [
                { type: 'improve', text: 'Re-diseño Premium de "Servidores" y ventana de conexión (Glassmorphism).' },
                { type: 'new', text: 'Soporte para IPs y Dominios en conexión directa.' },
                { type: 'new', text: 'Botón "Cancelar Descarga" en la configuración.' },
                { type: 'fix', text: 'Corrección ruta de caché personalizada.' },
                { type: 'fix', text: 'Lectura de servidores mejorada (UTF-8).' },
                { type: 'improve', text: 'Timeout de consulta aumentado.' }
            ]
        },
        {
            version: '1.0.8',
            date: '16 Enero 2026',
            features: [
                { type: 'new', text: 'Protección Total: Instalación segura en Documentos.' },
                { type: 'new', text: 'Auto-Recuperación de instalación.' },
                { type: 'new', text: 'Opción "Re-descargar Juego".' },
                { type: 'fix', text: 'ModLoader 100% funcional.' },
                { type: 'fix', text: 'Mejoras visuales y correcciones.' }
            ]
        },
        {
            version: '1.0.7',
            date: '15 Enero 2026',
            features: [
                { type: 'fix', text: 'Corregido: Guardado de FPS y Timestamp.' },
                { type: 'fix', text: 'Corregido: Extracción de Mods.' },
                { type: 'improve', text: 'Mejorado diseño Discord RPC.' },
                { type: 'improve', text: 'Nuevos iconos en ajustes.' },
                { type: 'new', text: 'Rebranding completo a GTASeoul.' }
            ]
        },
        {
            version: '1.0.6',
            date: '15 Enero 2026',
            features: [
                { type: 'new', text: 'Nueva sección de Changelog.' },
                { type: 'fix', text: 'Corrección reinstalación de Mods.' },
                { type: 'improve', text: 'Mejoras Auto-Updater.' },
                { type: 'improve', text: 'Bloqueo multi-instancia.' }
            ]
        },
        {
            version: '1.0.5',
            date: '14 Enero 2026',
            features: [
                { type: 'new', text: 'Integración Mods GitHub.' },
                { type: 'fix', text: 'Error permisos Win 11.' },
            ]
        },
        {
            version: '1.0.0',
            date: '01 Enero 2026',
            features: [
                { type: 'new', text: 'Lanzamiento oficial.' },
            ]
        }
    ]);

    const getIcon = (type) => {
        switch (type) {
            case 'new': return <Zap size={14} className="text-yellow-400" />;
            case 'fix': return <Bug size={14} className="text-red-400" />;
            case 'improve': return <Wrench size={14} className="text-blue-400" />;
            default: return <div className="w-2 h-2 rounded-full bg-gray-500" />;
        }
    };

    const getBadgeStyle = (type) => {
        switch (type) {
            case 'new': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'fix': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'improve': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-gray-500/10 text-gray-400';
        }
    };

    const getLabel = (type) => {
        switch (type) {
            case 'new': return 'NUEVO';
            case 'fix': return 'FIX';
            case 'improve': return 'MEJORA';
            default: return '';
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="h-full flex flex-col p-10 overflow-hidden text-white">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-black flex items-center gap-3 mb-2 tracking-tight">
                        <History className="text-indigo-500" size={32} />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Historial de Cambios
                        </span>
                    </h2>
                    <p className="text-gray-400 text-sm">Todas las novedades y mejoras del launcher.</p>
                </div>
                <div className="text-right">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Última Versión</span>
                    <div className="text-2xl font-mono font-bold text-indigo-400">v{changes[0].version}</div>
                </div>
            </div>

            <motion.div
                className="overflow-y-auto pr-4 -mr-4 pb-10 grid grid-cols-1 xl:grid-cols-2 gap-6"
                variants={container}
                initial="hidden"
                animate="show"
            >
                {changes.map((release, idx) => (
                    <motion.div
                        key={idx}
                        variants={item}
                        className={`relative group rounded-3xl p-6 border transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1
                            ${release.isLatest
                                ? 'bg-gradient-to-br from-[#1c1c1f] to-[#121214] border-indigo-500/30'
                                : 'bg-[#18181b]/50 border-white/5 hover:bg-[#18181b]'
                            }`}
                    >
                        {release.isLatest && (
                            <div className="absolute top-0 right-0 p-3 bg-gradient-to-bl from-indigo-600/20 to-transparent rounded-tr-3xl">
                                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest px-2 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                                    LATEST
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className={`text-2xl font-black font-mono tracking-tighter ${release.isLatest ? 'text-white' : 'text-gray-400'}`}>
                                    v{release.version}
                                </h3>
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-wide">{release.date}</span>
                            </div>
                            {/* Decorative Icon */}
                            {!release.isLatest && <ArrowUpRight className="text-gray-700 group-hover:text-gray-500 transition-colors" />}
                        </div>

                        <div className="space-y-3">
                            {release.features.map((feat, fIdx) => (
                                <div key={fIdx} className="flex items-start gap-3 group/item">
                                    <div className={`mt-0.5 p-1 rounded-md shrink-0 border ${getBadgeStyle(feat.type)}`}>
                                        {getIcon(feat.type)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-gray-400 group-hover/item:text-white transition-colors`}>
                                                {getLabel(feat.type)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-300 leading-relaxed font-medium">
                                            {feat.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
};

export default Changelog;
