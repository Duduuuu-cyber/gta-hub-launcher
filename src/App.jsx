import React, { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Home as HomeIcon, Settings as SettingsIcon, Server, Shield } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import TitleBar from './components/TitleBar'
import Home from './pages/Home'
import Settings from './pages/Settings'
import SplashScreen from './components/SplashScreen'
import FirstRunWizard from './components/FirstRunWizard'

const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="sidebar">
      <div className="logo-area">
        <div className="logo-icon">GS</div>
        <span>GTASeoul</span>
      </div>

      <nav className="nav-menu">
        <NavLink to="/" className="nav-item">
          <HomeIcon size={20} />
          <span>Inicio</span>
          {location.pathname === '/' && <div className="active-indicator" />}
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
      const path = localStorage.getItem('gtapath');
      if (!path) setNeedsSetup(true);
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
