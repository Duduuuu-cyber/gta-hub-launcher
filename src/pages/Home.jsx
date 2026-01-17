import React from 'react';
import { Play, Zap, Star, Gift, Megaphone, Calendar, User } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import PlayLoadingScreen from '../components/PlayLoadingScreen';
import CharacterSelector from '../components/CharacterSelector';
import CharacterCreatorModal from '../components/CharacterCreatorModal';
import WelcomeGiftModal from '../components/WelcomeGiftModal';
import VideoSpotlight from '../components/VideoSpotlight';
import { API_BASE_URL } from '../api/config';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { send: () => { }, on: () => { }, removeListener: () => { }, invoke: () => { } } };

const DEFAULT_NEWS = [
  {
    id: 1,
    tag: 'UPDATE',
    title: 'Nuevo Sistema de Crimen 2.0',
    description: 'Descubre las nuevas mecánicas de robo y la policía mejorada.',
    startColor: '#1e1b4b',
    endColor: '#312e81'
  },
  {
    id: 2,
    tag: 'EVENT',
    title: 'Carreras Clandestinas',
    description: 'Este fin de semana, premios dobles en todas las carreras.',
    startColor: '#831843',
    endColor: '#9d174d'
  }
];

const NEWS_API_URL = 'https://raw.githubusercontent.com/Duduuuu-cyber/gta-hub-launcher/refs/heads/main/news.json';

const Home = () => {
  const [serverData, setServerData] = React.useState({ players: 0, maxPlayers: 0, online: false, hostname: '' });
  const [playerName, setPlayerName] = React.useState('');
  const [news, setNews] = React.useState(DEFAULT_NEWS);
  const [isLaunching, setIsLaunching] = React.useState(false);

  // --------------------------------------------------------------------------
  // SSO Logic
  // --------------------------------------------------------------------------
  const [userSession, setUserSession] = React.useState(null);
  const [showCharModal, setShowCharModal] = React.useState(false);
  const [ssoCharacters, setSsoCharacters] = React.useState([]);

  // --------------------------------------------------------------------------
  // Gift Logic
  // --------------------------------------------------------------------------
  const [showGiftModal, setShowGiftModal] = React.useState(false);

  // --------------------------------------------------------------------------
  // Character Creator Logic
  // --------------------------------------------------------------------------
  const [showCreateCharModal, setShowCreateCharModal] = React.useState(false);

  React.useEffect(() => {
    // Initial fetch server info
    ipcRenderer.send('get-server-info');

    // Sync Discord RPC state
    const rpcEnabled = localStorage.getItem('discordRpc') !== 'false';
    ipcRenderer.send('toggle-discord-rpc', rpcEnabled);

    // Load Session if exists
    const loadSession = () => {
      const saved = localStorage.getItem('user_session');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Refresh data silently to get latest bans/chars
          setUserSession(parsed);
          // Process Characters
          let chars = [];
          if (Array.isArray(parsed.characters)) chars = parsed.characters;
          else if (parsed.characters) chars = [parsed.characters];
          setSsoCharacters(chars);

          // Check Gift Status
          if (parsed.user && parsed.user.giftClaimed === 0) {
            setTimeout(() => setShowGiftModal(true), 1500); // Delay for effect
          }

          // Fetch fresh properties
          // Fetch fresh properties
          fetch(`${API_BASE_URL}/api/user/${parsed.user.id}/refresh`)
            .then(r => r.json())
            .then(fresh => {
              if (fresh.success) {
                setUserSession(fresh);
                localStorage.setItem('user_session', JSON.stringify(fresh));
                setSsoCharacters(Array.isArray(fresh.characters) ? fresh.characters : [fresh.characters]);

                // Re-check gift in case it changed server-side
                if (fresh.user.giftClaimed === 0) {
                  setShowGiftModal(true);
                }
              }
            })
            .catch(err => console.log("Silent Refresh Error:", err));

        } catch (e) {
          console.error("Session parse error", e);
        }
      } else {
        // Not logged in -> Load Registry Name
        loadRegistry();
      }
    };

    loadSession();
    window.addEventListener('auth-change', loadSession);

    // Fetch News dynamically
    const fetchNews = async () => {
      try {
        const response = await fetch(`${NEWS_API_URL}?t=${new Date().getTime()}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) setNews(data);
        }
      } catch (error) { console.log('News error:', error); }
    };
    fetchNews();

    // Listen for updates
    const handleUpdate = (event, data) => setServerData(data);
    ipcRenderer.on('server-info-reply', handleUpdate);

    // Poll every 5 seconds
    const interval = setInterval(() => ipcRenderer.send('get-server-info'), 5000);

    return () => {
      clearInterval(interval);
      ipcRenderer.removeListener('server-info-reply', handleUpdate);
      window.removeEventListener('auth-change', loadSession);
    };
  }, []);

  const loadRegistry = async () => {
    try {
      const name = await ipcRenderer.invoke('get-registry-value', 'HKCU\\Software\\SAMP', 'PlayerName');
      if (name) {
        setPlayerName(name);
        ipcRenderer.send('update-player-name', name);
      }
    } catch (err) { console.error('Error loading registry:', err); }
  };

  /* Prevent spam clicking play */
  const handlePlay = () => {
    if (isLaunching) return;

    // 2. Validator: Game Path needed
    const path = localStorage.getItem('gtapath');
    if (!path) {
      alert('Por favor configura la ruta del juego en Ajustes primero.');
      return;
    }

    // 3. Logic: If Logged In -> Show Char Modal. If Guest -> Launch directly.
    if (userSession) {
      setShowCharModal(true);
    } else {
      // Guest Flow
      if (!playerName || playerName.trim().length === 0) {
        alert('Debes ingresar un nombre de usuario para jugar.');
        return;
      }
      launchGame(playerName);
    }
  };

  const handleSSOLaunch = async (charName, charId) => {
    setShowCharModal(false);
    setIsLaunching(true); // UI Block

    try {
      // 1. Request SSO Token
      const res = await fetch(`${API_BASE_URL}/api/auth/sso-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userSession.user.id, characterName: charName, characterId: charId })
      });
      const data = await res.json();

      if (data.success) {
        // 2. Launch Game with authorized IP
        launchGame(charName);
      } else {
        alert('Error de autorización: ' + data.error);
        setIsLaunching(false);
      }
    } catch (err) {
      console.error(err);
      alert('Error conectando con el servidor de autenticación.');
      setIsLaunching(false);
    }
  };

  const launchGame = async (name) => {
    setIsLaunching(true);

    // ALWAYS update Registry Name (SAMP Client reads this)
    if (name) {
      try {
        await ipcRenderer.invoke('set-registry-value', 'HKCU\\Software\\SAMP', 'PlayerName', name);
        console.log('[Home] Registry PlayerName updated to:', name);
      } catch (e) {
        console.error('[Home] Registry update failed:', e);
      }
    }

    // Update local name for display (Discord RPC, etc)
    ipcRenderer.send('update-player-name', name);

    const path = localStorage.getItem('gtapath');
    if (path) ipcRenderer.send('launch-game', path);

    setTimeout(() => setIsLaunching(false), 10000);
  };

  const handleCreateSuccess = () => {
    // Refresh session to get new character
    const saved = localStorage.getItem('user_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      fetch(`${API_BASE_URL}/api/user/${parsed.user.id}/refresh`)
        .then(r => r.json())
        .then(fresh => {
          if (fresh.success) {
            setUserSession(fresh);
            localStorage.setItem('user_session', JSON.stringify(fresh));
            setSsoCharacters(Array.isArray(fresh.characters) ? fresh.characters : [fresh.characters]);

            // Re-open selection modal
            setShowCreateCharModal(false);
            setShowCharModal(true);
          }
        })
        .catch(err => console.log("Refresh Error:", err));
    }
  };

  return (
    <div className="home-container animate-fade-in relative">
      {/* Modal Portals */}
      {showCharModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowCharModal(false)}>
          <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-4xl p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-3xl font-black text-white mb-2">Selecciona tu Personaje</h2>
            <p className="text-gray-400 mb-8">Debes elegir un personaje activo para entrar al servidor.</p>
            <CharacterSelector
              characters={ssoCharacters}
              onSelect={(char) => handleSSOLaunch(char.Nombre_Apellido, char.ID)}
              onManage={() => { setShowCharModal(false); setShowCreateCharModal(true); }}
            />
            <button
              onClick={() => setShowCharModal(false)}
              className="mt-8 w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <CharacterCreatorModal
        isOpen={showCreateCharModal}
        onClose={() => { setShowCreateCharModal(false); setShowCharModal(true); }}
        userId={userSession?.user?.id}
        onCreateSuccess={handleCreateSuccess}
      />

      <WelcomeGiftModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        userId={userSession?.user?.id}
        onClaimSuccess={(newBalance) => {
          // Update local balance immediately
          if (userSession) {
            const updated = { ...userSession, user: { ...userSession.user, coins: newBalance, giftClaimed: 1 } };
            setUserSession(updated);
            localStorage.setItem('user_session', JSON.stringify(updated));
          }
        }}
      />

      <AnimatePresence>
        {isLaunching && <PlayLoadingScreen onComplete={() => { }} />}
      </AnimatePresence>

      <div className="bg-gradient-mesh" />

      <div className="content">
        <header className="hero-section">

          <div className="hero-content">
            <div className="status-badge">
              <span className={`dot ${serverData.online ? 'online' : 'offline'}`}></span>
              GTA Seoul <span className="player-count">({serverData.players} / {serverData.maxPlayers})</span>
            </div>

            <h1 className="hero-title">
              BIENVENIDO A <br />
              <span className="text-gradient">GTASeoul</span>
            </h1>

            <p className="hero-subtitle">
              La experiencia de Roleplay definitiva. Únete ahora y forja tu destino.
            </p>

            {/* XP Bonus Indicators */}
            {(serverData.hostname && (serverData.hostname.includes('[x2 EXP]') || serverData.hostname.includes('[X5 EXP]'))) && (
              <div className="xp-bonus-container animate-bounce-subtle">
                {serverData.hostname.includes('[x2 EXP]') && (
                  <div className="xp-badge double-xp">
                    <Zap size={16} fill="white" />
                    <span>EXPERIENCIA DOBLE ACTIVA</span>
                  </div>
                )}
                {serverData.hostname.includes('[X5 EXP]') && (
                  <div className="xp-badge quintuple-xp">
                    <Star size={16} fill="white" />
                    <span>¡EXPERIENCIA x5 ACTIVA!</span>
                  </div>
                )}
              </div>
            )}

            {/* Auth-Aware Input Group */}
            {!userSession ? (
              <div className="player-input-group">
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    className="cyber-input"
                    placeholder="Nombre_Apellido"
                    value={playerName}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setPlayerName(newName);
                      ipcRenderer.send('update-player-name', newName);
                    }}
                    onBlur={() => { if (playerName) ipcRenderer.invoke('set-registry-value', 'HKCU\\Software\\SAMP', 'PlayerName', playerName); }}
                  />
                  <div className="input-border"></div>
                </div>
                <span className="input-hint">Tu identidad en el servidor (Invitado)</span>
              </div>
            ) : (
              <div className="mb-8 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl flex items-center gap-4 max-w-[400px]">
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/40">
                  {userSession.user.name ? userSession.user.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Sesión Activa</p>
                  <p className="text-white font-bold">{userSession.user.name || 'Usuario'}</p>
                </div>
              </div>
            )}

            <button className="play-btn" onClick={handlePlay} disabled={isLaunching} style={{ opacity: isLaunching ? 0.7 : 1, cursor: isLaunching ? 'not-allowed' : 'pointer' }}>
              <div className="btn-content">
                <Play fill="currentColor" size={24} />
                <span>{isLaunching ? 'INICIANDO...' : (userSession ? 'SELECCIONAR PERSONAJE' : 'JUGAR AHORA')}</span>
              </div>
              <div className="btn-glow"></div>
            </button>
          </div>


          <div className="hero-extras">
            <div className="social-hub animate-fade-in-delayed">
              {/* Discord Main CTA */}
              <a href="#" className="social-card discord-card" onClick={(e) => { e.preventDefault(); ipcRenderer.send('open-external', 'https://discord.gg/2ASjB4AHdS'); }}>
                <div className="icon-box discord-bg">
                  <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="white">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22c2.36-24.44-5.42-48.18-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                  </svg>
                </div>
                <div className="card-info">
                  <span className="label">Comunidad Oficial</span>
                  <span className="sub">Discord</span>
                </div>
              </a>

              {/* YouTube Channels - Stacked Cards */}
              <a href="#" className="social-card youtube-card" onClick={(e) => { e.preventDefault(); ipcRenderer.send('open-external', 'https://www.youtube.com/@TRIPLEKYT'); }}>
                <div className="icon-box youtube-bg">
                  <Play size={18} fill="white" />
                </div>
                <div className="card-info">
                  <span className="label">TRIPLEK</span>
                  <span className="sub">YouTube</span>
                </div>
              </a>

              <a href="#" className="social-card youtube-card" onClick={(e) => { e.preventDefault(); ipcRenderer.send('open-external', 'https://www.youtube.com/@Slnsvc'); }}>
                <div className="icon-box youtube-bg">
                  <Play size={18} fill="white" />
                </div>
                <div className="card-info">
                  <span className="label">SLNS</span>
                  <span className="sub">YouTube</span>
                </div>
              </a>

              <a href="#" className="social-card youtube-card" onClick={(e) => { e.preventDefault(); ipcRenderer.send('open-external', 'https://www.youtube.com/@DuduuDev'); }}>
                <div className="icon-box youtube-bg">
                  <Play size={18} fill="white" />
                </div>
                <div className="card-info">
                  <span className="label">DUDUU DEV</span>
                  <span className="sub">YouTube</span>
                </div>
              </a>
            </div>

            {/* Video Spotlight Component */}
            <VideoSpotlight />
          </div>
        </header>

        <section className="news-grid">
          {news.map((item) => (
            <div
              key={item.id}
              className="news-card glass-panel"
              onClick={() => item.link && ipcRenderer.send('open-external', item.link)}
              style={{ cursor: item.link ? 'pointer' : 'default' }}
            >
              <div
                className="news-icon-container"
                style={{ backgroundImage: `linear-gradient(135deg, ${item.startColor || '#1e1b4b'}, ${item.endColor || '#312e81'})` }}
              >
                {/* Icon Logic based on Tag/ID */}
                {(item.tag === 'NUEVO' || item.tag === 'UPDATE') && <Zap size={32} color="white" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.6))' }} />}
                {(item.tag === 'EVENT' || item.tag === 'EVENTO') && <Gift size={32} color="white" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.6))' }} />}
                {(!['NUEVO', 'UPDATE', 'EVENT', 'EVENTO'].includes(item.tag)) && <Megaphone size={32} color="white" />}
              </div>
              <div className="news-info">
                <span className="news-tag">{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </section>
      </div >

      <style>{`
        .home-container {
          height: 100%;
          position: relative;
          color: white;
          padding: 40px;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .bg-gradient-mesh {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(236, 72, 153, 0.1) 0%, transparent 40%);
          z-index: 0;
          pointer-events: none;
        }

        .content {
          position: relative;
          z-index: 10;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .hero-section {
          flex: 1;
          display: flex;
          flex-direction: row; /* Side-by-side layout */
          justify-content: space-between;
          align-items: flex-start; /* Align top */
          gap: 40px;
          margin-top: 20px;
        }

        .hero-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          max-width: 600px;
          padding-top: 40px; /* Center with social hub somewhat */
        }
        
        .hero-extras {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 24px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 24px;
        }

        .dot.online {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 10px #22c55e;
        }

        .dot.offline {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
        }

        .player-count {
          color: var(--text-muted);
          font-weight: 400;
        }

        .hero-title {
          font-size: 64px;
          line-height: 1.1;
          font-family: 'Inter', sans-serif; /* Fallback if decorative font fails */
          font-weight: 900;
          margin-bottom: 16px;
          letter-spacing: -2px;
        }

        .hero-subtitle {
          color: var(--text-muted);
          font-size: 18px;
          max-width: 500px;
          margin-bottom: 40px;
          line-height: 1.6;
        }

        /* Play Button - The Star */
        .play-btn {
          position: relative;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border: none;
          padding: 18px 48px;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .play-btn:hover {
          transform: translateY(-2px) scale(1.02);
        }

        .play-btn:active {
          transform: translateY(1px);
        }

        .btn-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          font-weight: 800;
          font-size: 18px;
          letter-spacing: 1px;
        }

        .btn-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }

        .play-btn:hover .btn-glow {
          opacity: 1;
        }

        .social-hub {
            display: flex;
            flex-direction: column; 
            align-items: flex-end; /* Align to right edge */
            gap: 12px;
            /* Removed absolute pos */
        }

        .social-card {
           display: flex;
           align-items: center;
           gap: 12px;
           background: rgba(255, 255, 255, 0.03);
           border: 1px solid rgba(255, 255, 255, 0.08);
           padding: 8px 16px 8px 8px; /* Compact padding */
           border-radius: 12px;
           text-decoration: none;
           transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
           min-width: 180px;
           backdrop-filter: blur(10px); /* Add blur for overlap */
        }

        .social-card:hover {
           background: rgba(255, 255, 255, 0.08);
           transform: translateY(-2px);
           border-color: rgba(255, 255, 255, 0.2);
        }

        .icon-box {
           width: 36px;
           height: 36px;
           border-radius: 8px;
           display: flex;
           align-items: center;
           justify-content: center;
        }

        .discord-bg {
           background: #5865F2;
           box-shadow: 0 4px 10px rgba(88, 101, 242, 0.3);
        }

        .youtube-bg {
           background: #ef4444;
           box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3);
        }

        .card-info {
           display: flex;
           flex-direction: column;
           align-items: flex-start; /* Align text to start */
        }

        .card-info .label {
           font-size: 10px;
           color: var(--text-muted);
           font-weight: 600;
           letter-spacing: 0.5px;
           text-transform: uppercase;
        }

        .card-info .sub {
           font-size: 14px;
           color: white;
           font-weight: 700;
        }

        .animate-fade-in-delayed {
            animation: fadeIn 0.8s ease-out 0.2s backwards;
        }

        /* Premium Input Group */
        .player-input-group {
            margin-bottom: 24px; /* Space before button */
            width: 100%;
            max-width: 380px;
        }

        .input-wrapper {
            position: relative;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 12px;
            display: flex;
            align-items: center;
            padding: 4px 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
        }

        .input-wrapper:focus-within {
            background: rgba(0, 0, 0, 0.6);
            border-color: var(--accent-primary);
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.15);
            transform: translateY(-1px);
        }

        .input-icon {
            color: var(--text-muted);
            margin-right: 12px;
            transition: color 0.3s;
        }

        .input-wrapper:focus-within .input-icon {
            color: var(--accent-primary);
        }

        .cyber-input {
            width: 100%;
            background: transparent;
            border: none;
            color: white;
            font-family: 'Inter', sans-serif;
            font-size: 16px;
            font-weight: 600;
            padding: 12px 0;
            outline: none;
            letter-spacing: 0.5px;
        }
        
        .cyber-input::placeholder {
            color: rgba(255, 255, 255, 0.3);
            font-weight: 500;
        }

        .input-hint {
            display: block;
            margin-top: 8px;
            margin-left: 4px;
            font-size: 11px;
            color: var(--text-muted);
            font-weight: 500;
            opacity: 0.7;
        }

        /* News Grid */
        .news-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: auto;
            padding-top: 40px;
        }

        .news-card {
          padding: 16px;
          display: flex;
          gap: 16px;
          transition: transform 0.2s, background 0.2s;
          cursor: pointer;
        }

        .news-card:hover {
          transform: translateY(-4px);
          background: rgba(20, 20, 25, 0.9);
        }

        .news-icon-container {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .news-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .progress-text {
            font-weight: 700;
            color: var(--accent-primary);
        }

        .news-tag {
          font-size: 10px;
          color: var(--accent-primary);
          font-weight: 700;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }

        .news-info h3 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .news-info p {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        /* XP Bonus Badges */
        .xp-bonus-container {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .xp-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.5px;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.2);
          text-transform: uppercase;
        }

        .double-xp {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
          animation: glowPulse 2s infinite;
        }

        .quintuple-xp {
          background: linear-gradient(135deg, #ec4899, #be185d);
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
          animation: glowPulseFast 1.5s infinite;
        }

        @keyframes glowPulse {
          0% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.5); }
          50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.8), 0 0 10px rgba(245, 158, 11, 0.4) inset; }
          100% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.5); }
        }

        @keyframes glowPulseFast {
          0% { box-shadow: 0 0 5px rgba(236, 72, 153, 0.5); }
          50% { box-shadow: 0 0 25px rgba(236, 72, 153, 0.9), 0 0 12px rgba(236, 72, 153, 0.5) inset; transform: scale(1.02); }
          100% { box-shadow: 0 0 5px rgba(236, 72, 153, 0.5); }
        }

        .animate-bounce-subtle {
           animation: bounceSubtle 3s infinite ease-in-out;
        }
        
        @keyframes bounceSubtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div >
  );
};

export default Home;
