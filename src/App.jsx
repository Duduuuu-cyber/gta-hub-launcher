import React, { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Home as HomeIcon, Settings as SettingsIcon, Server, Shield, Package, History } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import logoSeoul from './assets/Logo_Seoul_Prueba_8.png'
import TitleBar from './components/TitleBar'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Mods from './pages/Mods'
import Changelog from './pages/Changelog'
import SplashScreen from './components/SplashScreen'
import FirstRunWizard from './components/FirstRunWizard'
import UpdateModal from './components/UpdateModal'
import Servers from './pages/Servers'

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { invoke: () => Promise.resolve(null), on: () => { }, removeListener: () => { }, send: () => { } } };

const Sidebar = () => {
  const location = useLocation();
  const [version, setVersion] = useState('...');

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
      </nav>

      <div className="version-tag">v{version}</div>
    </div>
  )
}

function App() {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  // Update State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [readyToInstall, setReadyToInstall] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      let path = localStorage.getItem('gtapath');
      const isSetupCompleted = localStorage.getItem('setup_completed') === 'true';
      console.log('[DEBUG-RENDERER] Start Check. Stored path:', path, 'SetupCompleted:', isSetupCompleted);

      // 1. If path is stored, verify it acts like a valid game folder
      if (path) {
        const isValid = await ipcRenderer.invoke('check-game-files', path);
        console.log('[DEBUG-RENDERER] Path validation result:', isValid);
        if (!isValid) {
          console.log('[DEBUG-RENDERER] Ruta guardada inválida. Reseteando...');
          localStorage.removeItem('gtapath');
          path = null;
        }
      }

      // 2. Decide next step: Force Wizard if NO Valid Path OR Setup NOT Completed explicitly
      // This ensures that even if a path exists from a previous install, if we haven't marked "setup_completed", we ask again.
      // NOTE: If the user manually deleted the flag, they see the wizard.
      if (path && isSetupCompleted) {
        console.log('[DEBUG-RENDERER] Setup OK. Path:', path);
        setNeedsSetup(false);
      } else {
        console.log('[DEBUG-RENDERER] Enforcing Wizard (No path OR No Setup Flag).');

        // LAST RESORT: Try to auto-detect game (e.g. from Documents/GTA Seoul) to restore session
        // This handles the "Update wiped my config" or "Reinstall" scenario
        const detectedPath = await ipcRenderer.invoke('check-local-game');
        if (detectedPath) {
          console.log('[DEBUG-RENDERER] Auto-detected game at:', detectedPath);
          const isValid = await ipcRenderer.invoke('check-game-files', detectedPath);
          if (isValid) {
            console.log('[DEBUG-RENDERER] Auto-detection Validated! Restoring session.');
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

    // Trigger check on startup
    ipcRenderer.send('check-for-updates');

    return () => {
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

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <SplashScreen key="splash" onComplete={() => setLoading(false)} />
      ) : needsSetup ? (
        <FirstRunWizard key="wizard" onComplete={handleSetupComplete} />
      ) : (
        <div className="app-container">
          <TitleBar />
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
                  <Route path="/" element={<Home />} />
                  <Route path="/servers" element={<Servers />} />
                  <Route path="/mods" element={<Mods />} />
                  <Route path="/changelog" element={<Changelog />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>
            </div>
          </Router>
        </div>
      )}
    </AnimatePresence>
  )
}

export default App
