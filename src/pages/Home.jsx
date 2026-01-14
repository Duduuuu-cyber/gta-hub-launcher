import React from 'react';
import { Play } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import PlayLoadingScreen from '../components/PlayLoadingScreen';

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

// URL del JSON de noticias (Cámbiala por tu URL real de GitHub/Pastebin)
const NEWS_API_URL = 'https://raw.githubusercontent.com/Duduuuu-cyber/gta-hub-launcher/refs/heads/main/news.json';

const Home = () => {
  const [serverData, setServerData] = React.useState({ players: 0, maxPlayers: 0, online: false });
  const [playerName, setPlayerName] = React.useState('');
  const [news, setNews] = React.useState(DEFAULT_NEWS);
  const [isLaunching, setIsLaunching] = React.useState(false);

  React.useEffect(() => {
    // Initial fetch server info
    ipcRenderer.send('get-server-info');

    // Load Player Name from Registry
    const loadRegistry = async () => {
      try {
        const name = await ipcRenderer.invoke('get-registry-value', 'HKCU\\Software\\SAMP', 'PlayerName');
        if (name) setPlayerName(name);
      } catch (err) {
        console.error('Error loading registry:', err);
      }
    };
    loadRegistry();

    // Fetch News dynamically
    const fetchNews = async () => {
      try {
        // Add timestamp to query to bypass GitHub raw cache
        const response = await fetch(`${NEWS_API_URL}?t=${new Date().getTime()}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setNews(data);
          }
        }
      } catch (error) {
        console.log('Using default news due to fetch error:', error);
      }
    };
    fetchNews();

    // Listen for updates
    const handleUpdate = (event, data) => {
      setServerData(data);
    };

    ipcRenderer.on('server-info-reply', handleUpdate);

    // Poll every 5 seconds
    const interval = setInterval(() => {
      ipcRenderer.send('get-server-info');
    }, 5000);

    return () => {
      ipcRenderer.removeListener('server-info-reply', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const handlePlay = () => {
    const path = localStorage.getItem('gtapath');
    if (!path) {
      alert('Por favor configura la ruta del juego en Ajustes primero.');
      return;
    }
    // Start the loading animation
    setIsLaunching(true);
  };

  const handleLaunchComplete = () => {
    const path = localStorage.getItem('gtapath');
    if (path) {
      ipcRenderer.send('launch-game', path);
    }
    // Optional: Reset state or keep it true until app closes
    setIsLaunching(false);
  };

  const savePlayerName = () => {
    // Save to Registry
    if (playerName) {
      ipcRenderer.invoke('set-registry-value', 'HKCU\\Software\\SAMP', 'PlayerName', playerName);
    }
  };

  return (
    <div className="home-container animate-fade-in">
      <AnimatePresence>
        {isLaunching && <PlayLoadingScreen onComplete={handleLaunchComplete} />}
      </AnimatePresence>

      {/* Background with Gradient Mesh (simulated via CSS) */}
      <div className="bg-gradient-mesh" />

      <div className="content">
        <header className="hero-section">
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

          <button className="play-btn" onClick={handlePlay}>
            <div className="btn-content">
              <Play fill="currentColor" size={24} />
              <span>JUGAR AHORA</span>
            </div>
            <div className="btn-glow"></div>
          </button>

          <div className="social-hub animate-fade-in-delayed">

            {/* Discord Main CTA */}
            <a href="#" className="social-card discord-card" onClick={(e) => { e.preventDefault(); ipcRenderer.send('open-external', 'https://discord.gg/your-invite'); }}>
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

          <div className="player-input-container">
            <label>Nombre de Jugador:</label>
            <input
              type="text"
              className="player-name-input"
              placeholder="Nombre_Apellido"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onBlur={savePlayerName}
            />
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
                className="news-image"
                style={{ backgroundImage: `linear-gradient(45deg, ${item.startColor || '#1e1b4b'}, ${item.endColor || '#312e81'})` }}
              />
              <div className="news-info">
                <span className="news-tag">{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </section>
      </div>

      <style>{`
        .home-container {
          height: 100%;
          position: relative;
          color: white;
          padding: 40px;
          display: flex;
          flex-direction: column;
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
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
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
          position: absolute;
          top: 0;
          right: 0;
          display: flex;
          flex-direction: column; 
          align-items: flex-end; /* Align to right edge */
          gap: 12px;
          z-index: 20;
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

        .social-row {
           display: flex;
           gap: 10px;
        }

        .mini-btn {
           width: 40px;
           height: 40px;
           border-radius: 10px;
           display: flex;
           align-items: center;
           justify-content: center;
           background: rgba(255, 255, 255, 0.03);
           border: 1px solid rgba(255, 255, 255, 0.08);
           color: var(--text-muted);
           transition: all 0.2s;
           cursor: pointer;
        }

        .mini-btn:hover {
           background: rgba(255, 255, 255, 0.1);
           transform: translateY(-2px);
           color: white;
           box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
        }

        .yt-btn:hover {
           color: #ef4444;
           border-color: rgba(239, 68, 68, 0.3);
        }

        .animate-fade-in-delayed {
            animation: fadeIn 0.8s ease-out 0.2s backwards;
        }

        .player-input-container {
            margin-top: 24px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
            max-width: 300px;
        }

        .player-input-container label {
            font-size: 12px;
            color: var(--text-muted);
            font-weight: 600;
            margin-left: 4px;
        }

        .player-name-input {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 12px 16px;
            border-radius: 8px;
            color: white;
            font-family: inherit;
            font-weight: 600;
            transition: all 0.2s;
            outline: none;
        }

        .player-name-input:focus {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--accent-primary);
            box-shadow: 0 0 15px rgba(139, 92, 246, 0.2);
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

        .news-image {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          background-color: var(--bg-card);
          background-size: cover;
          background-position: center;
        }

        .news-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
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
      `}</style>
    </div>
  );
};

export default Home;
