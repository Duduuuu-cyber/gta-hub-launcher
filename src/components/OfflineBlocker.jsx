import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OfflineBlocker = () => {
    // navigator.onLine is the standard "Hardware/Network" check.
    // It detects if: Cable is unplugged, WiFi disabled, or Airplane mode.
    // It does NOT detect if ISP is down (router on, but no internet), 
    // BUT it guarantees 0 false positives as long as you are connected to the router.
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8 select-none"
                >
                    <motion.div
                        initial={{ scale: 0.8, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-[#18181b] border border-red-500/20 p-10 rounded-3xl shadow-2xl shadow-red-900/20 max-w-md w-full"
                    >
                        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <WifiOff size={48} className="text-red-500" />
                        </div>

                        <h2 className="text-3xl font-black text-white mb-2">CONEXIÓN PERDIDA</h2>
                        <p className="text-gray-400 mb-8">
                            Parece que internet se ha ido de sabático. <br />
                            El Launcher se pausará hasta que vuelva.
                        </p>

                        <div className="flex items-center justify-center gap-3 text-xs font-bold text-red-500/80 bg-red-500/5 py-4 rounded-xl border border-red-500/10">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            RECONECTANDO...
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OfflineBlocker;
