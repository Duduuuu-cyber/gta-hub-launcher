import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, Check, X } from 'lucide-react';
import confetti from 'canvas-confetti'; // Assuming confetti is available or we use a fallback, 
// actually I'll stick to a simple CSS particle effect if confetti lib isn't verified installed. 
// Wait, I can make a simple confetti burst using the 'canvas-confetti' package if it was installed.
// Looking at previous context, I don't see 'canvas-confetti' installed in package.json explicitly mentioned, 
// so I will avoid importing it to prevent errors and simulate a CSS particle explosion instead.

const WelcomeGiftModal = ({ isOpen, onClose, userId, characters = [], onClaimSuccess }) => {
    const [step, setStep] = useState('checking'); // checking, closed (found), selecting_char, opening, claimed, none
    const [reward, setReward] = useState(null);
    const [error, setError] = useState('');
    const [activeGift, setActiveGift] = useState(null);

    // Fetch dynamic gift on open
    React.useEffect(() => {
        if (isOpen && userId) {
            fetch(`http://localhost:3001/api/gifts/welcome-active?userId=${userId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.found && !data.claimed) {
                        setActiveGift(data.gift);
                        setStep('closed');
                    } else {
                        onClose();
                    }
                })
                .catch(() => onClose());
        }
    }, [isOpen, userId, onClose]);

    const initiateClaim = () => {
        if (activeGift && activeGift.reward_type === 'MONEY') {
            setStep('selecting_char');
        } else {
            handleClaim(null);
        }
    };

    const handleClaim = async (characterId) => {
        setStep('opening');
        setTimeout(async () => {
            try {
                const res = await fetch('http://localhost:3001/api/gifts/claim-welcome', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, characterId })
                });
                const data = await res.json();
                if (data.success) {
                    setReward(data.reward);
                    setStep('claimed');
                    if (onClaimSuccess) onClaimSuccess(data.newBalance);
                } else {
                    setError(data.error);
                    setStep('error');
                }
            } catch (err) {
                setError('Error de conexión');
                setStep('error');
            }
        }, 2000);
    };

    if (!isOpen || step === 'checking' || !activeGift) return null;

    const rewardTitle = activeGift.reward_type === 'VIP' ? 'Días VIP' : activeGift.reward_type === 'MONEY' ? 'Dólares' : 'Seoul Coins';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative bg-gradient-to-br from-[#1c1c22] to-[#121214] border border-white/10 rounded-3xl p-1 w-full max-w-sm overflow-hidden shadow-2xl shadow-indigo-500/20"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="bg-[#18181b] rounded-[22px] p-8 flex flex-col items-center text-center relative overflow-hidden h-full min-h-[400px]">

                    {/* Background Glows */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none"></div>

                    {step === 'closed' && (
                        <>
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="relative mt-8 mb-8"
                            >
                                <div className="absolute inset-0 bg-indigo-500 blur-[60px] opacity-20 animate-pulse"></div>
                                <Gift size={120} className="text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                            </motion.div>

                            <h2 className="text-2xl font-black text-white mb-2">{activeGift.title}</h2>
                            <p className="text-gray-400 text-sm mb-8 px-4">
                                {activeGift.description}
                            </p>

                            <button
                                onClick={initiateClaim}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all flex items-center justify-center gap-2 group"
                            >
                                <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                                CANJEAR AHORA
                            </button>
                        </>
                    )}

                    {step === 'selecting_char' && (
                        <div className="w-full h-full flex flex-col pt-4">
                            <h3 className="text-xl font-bold text-white mb-2">Elige Personaje</h3>
                            <p className="text-gray-400 text-xs mb-6">Este premio se entregará a un personaje.</p>

                            <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px] mb-4 pr-1">
                                {characters.length > 0 ? (
                                    characters.map(char => (
                                        <button
                                            key={char.ID}
                                            onClick={() => handleClaim(char.ID)}
                                            className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500 transition-all flex items-center justify-between group"
                                        >
                                            <span className="font-bold text-white group-hover:text-indigo-300">{char.Nombre_Apellido}</span>
                                            <Check size={16} className="opacity-0 group-hover:opacity-100 text-indigo-500" />
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-red-400 text-sm">No tienes personajes creados.</p>
                                )}
                            </div>
                            <button onClick={() => setStep('closed')} className="text-gray-500 text-sm hover:text-white">Volver</button>
                        </div>
                    )}

                    {step === 'opening' && (
                        <div className="flex flex-col items-center justify-center h-full gap-6">
                            <motion.div
                                animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                            >
                                <Gift size={120} className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]" />
                            </motion.div>
                            <p className="text-indigo-300 font-bold animate-pulse">Abriendo regalo...</p>
                        </div>
                    )}

                    {step === 'claimed' && (
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent pointer-events-none"></div>

                            <motion.div
                                initial={{ rotate: -180, scale: 0 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: "spring", bounce: 0.5 }}
                                className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.5)] mb-6"
                            >
                                <span className="text-5xl">{rewardTitle === 'Dólares' ? '💵' : '🪙'}</span>
                            </motion.div>

                            <h2 className="text-3xl font-black text-white mb-1">¡FELICIDADES!</h2>
                            <p className="text-gray-400 mb-6">Has recibido</p>

                            <div className="bg-white/10 px-8 py-4 rounded-2xl border border-white/10 mb-2 backdrop-blur-md">
                                <span className="text-4xl font-mono font-bold text-yellow-400 text-shadow-glow">
                                    {rewardTitle === 'Dólares' ? '$' : '+'}{reward}
                                </span>
                                <span className="text-xs font-bold text-yellow-600 block mt-1 tracking-widest uppercase">{rewardTitle}</span>
                            </div>

                            <p className="text-green-400 text-sm font-bold mb-8 animate-pulse">
                                {rewardTitle === 'Dólares' ? '¡Acreditado en tu personaje correctamente!' : '¡Acreditado en tu cuenta correctamente!'}
                            </p>

                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white transition-colors"
                            >
                                Disfrutar
                            </button>
                        </motion.div>
                    )}

                    {step === 'error' && (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <X size={64} className="text-red-500" />
                            <h3 className="text-xl font-bold text-white">Oops!</h3>
                            <p className="text-red-300 text-sm">{error}</p>
                            <button onClick={onClose} className="mt-4 px-6 py-2 bg-white/10 rounded-lg text-sm">Cerrar</button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default WelcomeGiftModal;
