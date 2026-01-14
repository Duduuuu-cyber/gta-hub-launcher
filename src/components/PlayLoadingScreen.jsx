import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const PlayLoadingScreen = ({ onComplete }) => {
    const [status, setStatus] = useState('INITIATING LINK');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const statuses = [
            { p: 15, text: 'CONNECTING TO SEOUL MAIN NETWORK...' },
            { p: 35, text: 'AUTHENTICATING USER CREDENTIALS...' },
            { p: 60, text: 'SYNCHRONIZING ASSETS...' },
            { p: 85, text: 'PREPARING GAME ENGINE...' },
            { p: 95, text: 'LAUNCHING...' }
        ];

        let currentStep = 0;

        const timer = setInterval(() => {
            setProgress((prev) => {
                const nextProgress = prev + 1;

                // Update status text based on progress thresholds
                if (currentStep < statuses.length && nextProgress >= statuses[currentStep].p) {
                    setStatus(statuses[currentStep].text);
                    currentStep++;
                }

                if (nextProgress >= 100) {
                    clearInterval(timer);
                    setTimeout(onComplete, 800); // Slight delay at 100% for effect
                    return 100;
                }
                return nextProgress;
            });
        }, 40); // Total time approx 4 seconds (100 * 40ms)

        return () => clearInterval(timer);
    }, [onComplete]);

    return (
        <motion.div
            className="play-loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="content-wrapper">
                <motion.div
                    className="spinner-outer"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />

                <motion.div
                    className="spinner-inner"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />

                <div className="center-logo">
                    <span className="logo-text">GS</span>
                </div>

                <div className="status-container">
                    <motion.h2
                        key={status} // Animate on text change
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="status-text"
                    >
                        {status}
                    </motion.h2>

                    <div className="progress-bar-track">
                        <motion.div
                            className="progress-bar-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <span className="percentage">{progress}%</span>
                </div>
            </div>

            <style>{`
                .play-loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(5, 5, 10, 0.9);
                    backdrop-filter: blur(20px);
                    z-index: 1000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    color: white;
                }

                .content-wrapper {
                    position: relative;
                    width: 300px;
                    height: 300px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }

                .spinner-outer {
                    position: absolute;
                    width: 120px;
                    height: 120px;
                    border: 2px solid transparent;
                    border-top-color: var(--accent-primary);
                    border-right-color: var(--accent-primary);
                    border-radius: 50%;
                    box-shadow: 0 0 30px rgba(139, 92, 246, 0.2);
                }

                .spinner-inner {
                    position: absolute;
                    width: 80px;
                    height: 80px;
                    border: 2px solid transparent;
                    border-bottom-color: var(--accent-secondary);
                    border-left-color: var(--accent-secondary);
                    border-radius: 50%;
                }

                .center-logo {
                    position: absolute;
                    font-weight: 900;
                    font-size: 24px;
                    letter-spacing: -1px;
                    background: linear-gradient(135deg, white, #a0aec0);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .status-container {
                    position: absolute;
                    bottom: -80px;
                    width: 300px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                }

                .status-text {
                    font-size: 14px;
                    font-weight: 600;
                    letter-spacing: 2px;
                    color: var(--text-muted);
                    text-align: center;
                    margin: 0;
                    height: 20px; /* Fixed height to prevent jumping */
                }

                .progress-bar-track {
                    width: 100%;
                    height: 2px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
                    box-shadow: 0 0 10px var(--accent-primary);
                }

                .percentage {
                    font-family: monospace;
                    font-size: 12px;
                    color: rgba(255,255,255,0.3);
                }
            `}</style>
        </motion.div>
    );
};

export default PlayLoadingScreen;
