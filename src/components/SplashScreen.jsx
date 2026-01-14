import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ onComplete }) => {
    const [progress, setProgress] = React.useState(0);

    React.useEffect(() => {
        // Simulate loading process
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(timer);
                    setTimeout(onComplete, 500); // Wait a bit before finishing
                    return 100;
                }
                return prev + Math.floor(Math.random() * 15) + 5; // Random increment
            });
        }, 200);

        return () => clearInterval(timer);
    }, [onComplete]);

    return (
        <motion.div
            className="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
        >
            <div className="splash-content">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="splash-logo-container"
                >
                    <h1 className="splash-title">GTA<span className="text-gradient">Seoul</span></h1>
                    <p className="splash-subtitle">PREPARING EXPERIENCE</p>
                </motion.div>

                <div className="progress-container">
                    <motion.div
                        className="progress-bar"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                    />
                </div>

                <div className="loading-text">
                    {progress < 100 ? `LOADING ASSETS... ${progress}%` : 'READY'}
                </div>
            </div>

            <style>{`
        .splash-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #050505;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          overflow: hidden;
        }

        .splash-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
          width: 100%;
          max-width: 400px;
        }

        .splash-logo-container {
          text-align: center;
        }

        .splash-title {
          font-size: 64px;
          font-weight: 800;
          letter-spacing: -2px;
          margin: 0;
          line-height: 1;
          color: white;
          text-shadow: 0 0 40px rgba(139, 92, 246, 0.3);
        }

        .splash-subtitle {
          font-size: 12px;
          letter-spacing: 6px;
          color: var(--text-muted);
          margin-top: 10px;
          opacity: 0.8;
        }

        .progress-container {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          position: relative;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #8b5cf6, #3b82f6);
          border-radius: 2px;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
        }

        .loading-text {
            font-family: 'Consolas', monospace;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.4);
        }
      `}</style>
        </motion.div>
    );
};

export default SplashScreen;
