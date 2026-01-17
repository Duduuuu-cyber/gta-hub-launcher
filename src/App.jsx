import React, { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Home as HomeIcon, Settings as SettingsIcon, Server, Shield, Package, History, User as UserIcon, Gift } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import logoSeoul from './assets/Logo_Seoul_Prueba_8.png'
import TitleBar from './components/TitleBar'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Mods from './pages/Mods'
import Gifts from './pages/Gifts'
import Changelog from './pages/Changelog'
import SplashScreen from './components/SplashScreen'
import WelcomeGiftModal from './components/WelcomeGiftModal'
import FirstRunWizard from './components/FirstRunWizard'
import UpdateModal from './components/UpdateModal'
import Servers from './pages/Servers'
import Login from './pages/Login'
import Profile from './pages/Profile'
import OfflineBlocker from './components/OfflineBlocker'

// ... (ipcRenderer config is same)
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { invoke: () => Promise.resolve(null), on: () => { }, removeListener: () => { }, send: () => { } } };

const Sidebar = () => {
  const location = useLocation();
  const [version, setVersion] = useState('...');

  // ... (useEffect for version is same)
  useEffect(() => {
    const getVersion = async () => {
      try {
        const ver = await ipcRenderer.invoke('get-app-version');
        setVersion(ver || '1.0.0');
      } catch (err) {
        console.error('Failed to get version:', err);
      }
    };
    getVersion();
  }, []);

  return (
    <div className="sidebar">
      <div className="logo-area">
        <img src={logoSeoul} alt="GTASeoul" className="logo-img" />
        <span>GTASeoul</span>
      </div>

      <nav className="nav-menu">
        <NavLink to="/" className="nav-item">
          <HomeIcon size={20} />
          <span>Inicio</span>
          {location.pathname === '/' && <div className="active-indicator" />}
        </NavLink>
        <NavLink to="/servers" className="nav-item">
          <Server size={20} />
          <span>Servidores</span>
          {location.pathname === '/servers' && <div className="active-indicator" />}
        </NavLink>
        <NavLink to="/gifts" className="nav-item">
          <Gift size={20} />
          <span>Regalos</span>
          {location.pathname === '/gifts' && <div className="active-indicator" />}
        </NavLink>
        <NavLink to="/mods" className="nav-item">
          <Package size={20} />
          <span>Mods</span>
          {location.pathname === '/mods' && <div className="active-indicator" />}
        </NavLink>
        <NavLink to="/changelog" className="nav-item">
          <History size={20} />
          <span>Changelog</span>
          {location.pathname === '/changelog' && <div className="active-indicator" />}
        </NavLink>
        <NavLink to="/settings" className="nav-item">
          <SettingsIcon size={20} />
          <span>Ajustes</span>
          {location.pathname === '/settings' && <div className="active-indicator" />}
        </NavLink>

        <div className="border-t border-white/10 my-2 mx-4"></div>

        <NavLink to={localStorage.getItem('user_session') ? "/profile" : "/login"} className="nav-item">
          <UserIcon size={20} />
          <span>{localStorage.getItem('user_session') ? "Perfil" : "Cuenta"}</span>
          {(location.pathname === '/profile' || location.pathname === '/login') && <div className="active-indicator" />}
        </NavLink>
      </nav>

      <div className="version-tag">v{version}</div>
    </div>
  )
}

// Strict Login Logic implemented
function App() {
  // State
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userSession, setUserSession] = useState(null);
  const [showWelcomeGift, setShowWelcomeGift] = useState(false); // NEW: Control Modal Visibility

  // Update State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [readyToInstall, setReadyToInstall] = useState(false);

  useEffect(() => {
    // 1. Listen for Auth Changes from Login Component
    const handleAuthChange = () => {
      const session = localStorage.getItem('user_session');
      setIsAuthenticated(!!session);
      if (session) {
        try {
          const parsed = JSON.parse(session);
          // Ensure characters is array
          let chars = [];
          if (Array.isArray(parsed.characters)) chars = parsed.characters;
          else if (parsed.characters) chars = [parsed.characters];
          parsed.characters = chars;
          setUserSession(parsed);
          setShowWelcomeGift(true); // Reset to true on login/load to check again
        } catch (e) { console.error("Session parse error", e); }
      } else {
        setUserSession(null);
        setShowWelcomeGift(false);
      }
    };
    window.addEventListener('auth-change', handleAuthChange);
    // ... existing code ...
    {/* Welcome Gift Global Check */ }
    {
      isAuthenticated && userSession && showWelcomeGift && (
        <WelcomeGiftModal
          isOpen={true}
          onClose={() => setShowWelcomeGift(false)}
          userId={userSession.user?.id}
          characters={userSession.characters}
          onClaimSuccess={(newBalance) => {
            if (newBalance !== undefined) {
              const newSession = { ...userSession };
              newSession.user.coins = newBalance;
              localStorage.setItem('user_session', JSON.stringify(newSession));
              // Dispatch event so other components update
              window.dispatchEvent(new Event('auth-change'));
            }
            // Don't close immediately here, let user click "Disfrutar"
          }}
        />
      )
    }

    // Initial Auth Check
    handleAuthChange();

    const checkSetup = async () => {
      let path = localStorage.getItem('gtapath');
      const isSetupCompleted = localStorage.getItem('setup_completed') === 'true';

      // If path invalid, remove it
      if (path) {
        const isValid = await ipcRenderer.invoke('check-game-files', path);
        if (!isValid) {
          localStorage.removeItem('gtapath');
          path = null;
        }
      }

      if (path && isSetupCompleted) {
        setNeedsSetup(false);
      } else {
        const detectedPath = await ipcRenderer.invoke('check-local-game');
        if (detectedPath) {
          const isValid = await ipcRenderer.invoke('check-game-files', detectedPath);
          if (isValid) {
            localStorage.setItem('gtapath', detectedPath);
            localStorage.setItem('setup_completed', 'true');
            setNeedsSetup(false);
            return;
          }
        }
        setNeedsSetup(true);
      }
    };
    checkSetup();

    // Global Update Listeners
    const onUpdateAvailable = (event, info) => {
      console.log('Update Available:', info);
      setUpdateInfo(info);
      setShowUpdateModal(true);
    };

    const onDownloadProgress = (event, percent) => {
      setIsDownloading(true);
      setDownloadProgress(percent);
    };

    const onReadyToInstall = (event, info) => {
      setIsDownloading(false);
      setReadyToInstall(true);
    };

    ipcRenderer.on('update-available-prompt', onUpdateAvailable);
    ipcRenderer.on('update-download-progress', onDownloadProgress);
    ipcRenderer.on('update-ready-to-install', onReadyToInstall);
    ipcRenderer.send('check-for-updates');

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      ipcRenderer.removeListener('update-available-prompt', onUpdateAvailable);
      ipcRenderer.removeListener('update-download-progress', onDownloadProgress);
      ipcRenderer.removeListener('update-ready-to-install', onReadyToInstall);
    };
  }, []);

  const handleSetupComplete = () => {
    localStorage.setItem('setup_completed', 'true');
    setNeedsSetup(false);
  };

  const handleStartUpdate = () => {
    setIsDownloading(true);
    ipcRenderer.send('start-download-update');
  };

  const handleInstallUpdate = () => {
    ipcRenderer.send('install-update-now');
  };

  // 1. Loading Screen
  if (loading) {
    return (
      <AnimatePresence>
        <SplashScreen key="splash" onComplete={() => setLoading(false)} />
      </AnimatePresence>
    );
  }

  // 2. Strict Login Guard (If not authenticated, ONLY show Login)
  // This satisfies: "que cargue el launcher, y me muestre la pagina del LOGIN sin posibilidad de salirme"
  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <TitleBar />
        <Login />
      </div>
    );
  }

  // 3. First Run Wizard (Only if authenticated but not setup)
  if (needsSetup) {
    return (
      <AnimatePresence>
        <FirstRunWizard key="wizard" onComplete={handleSetupComplete} />
      </AnimatePresence>
    );
  }

  // 4. Main App Layout (Authenticated & Setup)
  return (
    <div className="app-container">
      <TitleBar />
      <OfflineBlocker />
      {showUpdateModal && (
        <UpdateModal
          updateInfo={updateInfo}
          onClose={() => setShowUpdateModal(false)}
          isDownloading={isDownloading}
          downloadProgress={downloadProgress}
          readyToInstall={readyToInstall}
          onStartUpdate={handleStartUpdate}
          onInstallUpdate={handleInstallUpdate}
        />
      )}
      <Router>
        <div className="main-layout">
          <Sidebar />
          <div className="page-content">
            <Routes>
              {/* Default redirect to Home */}
              <Route path="/" element={<Home />} />
              <Route path="/servers" element={<Servers />} />
              <Route path="/gifts" element={<Gifts />} />
              <Route path="/mods" element={<Mods />} />
              <Route path="/changelog" element={<Changelog />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              {/* Login route redundant here but kept for fallback */}
              <Route path="/login" element={<Login />} />
            </Routes>
          </div>

          {/* Welcome Gift Global Check */}
          {isAuthenticated && userSession && showWelcomeGift && (
            <WelcomeGiftModal
              isOpen={true}
              onClose={() => setShowWelcomeGift(false)}
              userId={userSession.user?.id}
              characters={userSession.characters}
              onClaimSuccess={(newBalance) => {
                if (newBalance !== undefined) {
                  const newSession = { ...userSession };
                  newSession.user.coins = newBalance;
                  localStorage.setItem('user_session', JSON.stringify(newSession));
                  // Dispatch event so other components update
                  window.dispatchEvent(new Event('auth-change'));
                }
              }}
            />
          )}

        </div>
      </Router>
      <style>{`
        * {
          -webkit-user-drag: none;
          user-select: none;
        }
        input, textarea, [contenteditable], select {
          -webkit-user-drag: auto;
          user-select: text;
          cursor: text;
          pointer-events: auto;
        }
      `}</style>
    </div>
  )
}

export default App
