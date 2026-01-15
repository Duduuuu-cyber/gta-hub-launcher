import React, { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Home as HomeIcon, Settings as SettingsIcon, Server, Shield, Package } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import logoSeoul from './assets/Logo_Seoul_Prueba_8.png'
import TitleBar from './components/TitleBar'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Mods from './pages/Mods'
import SplashScreen from './components/SplashScreen'
import FirstRunWizard from './components/FirstRunWizard'

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { invoke: () => Promise.resolve(null) } };

const Sidebar = () => {
  const location = useLocation();

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
        <NavLink to="/mods" className="nav-item">
          <Package size={20} />
          <span>Mods</span>
          {location.pathname === '/mods' && <div className="active-indicator" />}
        </NavLink>
        <NavLink to="/settings" className="nav-item">
          <SettingsIcon size={20} />
          <span>Ajustes</span>
          {location.pathname === '/settings' && <div className="active-indicator" />}
        </NavLink>
      </nav>

      <div className="version-tag">v1.0.0</div>
    </div>
  )
}

function App() {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      let path = localStorage.getItem('gtapath');
      console.log('[DEBUG-RENDERER] Start Check. Stored path:', path);

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

      // 2. Decide next step
      if (path) {
        console.log('[DEBUG-RENDERER] Setup OK. Path:', path);
        setNeedsSetup(false);
      } else {
        // If not configured in localStorage, ALWAYS show wizard so user can choose
        // checking local auto-detect is fine for hints, but we won't auto-apply it.
        console.log('[DEBUG-RENDERER] No localStorage path. Enforcing Wizard.');
        setNeedsSetup(true);
      }
    };
    checkSetup();
  }, []);

  const handleSetupComplete = () => {
    setNeedsSetup(false);
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
          <Router>
            <div className="main-layout">
              <Sidebar />
              <div className="page-content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/mods" element={<Mods />} />
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
