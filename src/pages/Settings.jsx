import React from 'react';
import { Save, Shield, Zap, Trash2, AlertTriangle, DownloadCloud } from 'lucide-react';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { invoke: () => Promise.resolve(null) } };

const Settings = () => {
  const [gamePath, setGamePath] = React.useState(localStorage.getItem('gtapath') || '');
  const [cachePath, setCachePath] = React.useState(localStorage.getItem('cachepath') || '');
  const [statusMsg, setStatusMsg] = React.useState('');
  const [updateStatus, setUpdateStatus] = React.useState('');

  /* Optimization Logic */
  const [fpsLimit, setFpsLimit] = React.useState(false);
  const [timestamp, setTimestamp] = React.useState(false);
  const [discordRpc, setDiscordRpc] = React.useState(localStorage.getItem('discordRpc') !== 'false'); // Default true

  React.useEffect(() => {
    // Load Game Path from Registry
    const loadFromRegistry = async () => {
      const regGamePath = await ipcRenderer.invoke('get-registry-value', 'HKCU\\Software\\SAMP', 'gta_sa_exe');
      if (regGamePath) {
        let folderPath = regGamePath;
        if (folderPath.toLowerCase().endsWith('\\gta_sa.exe')) {
          folderPath = folderPath.substring(0, folderPath.lastIndexOf('\\'));
        }
        // Only override if we don't have a path, or maybe we just want to trust LS?
        // Let's only set if local state is empty to respect the Wizard's choice
        if (!gamePath) {
          setGamePath(folderPath);
        }
      }

      const regCachePath = await ipcRenderer.invoke('get-registry-value', 'HKCU\\Software\\SAMP', 'model_cache');
      if (regCachePath) {
        setCachePath(regCachePath);
      }
    };
    loadFromRegistry();

    // Load SA-MP Config
    const loadSampConfig = async () => {
      const content = await ipcRenderer.invoke('read-samp-config');
      if (content) {
        setTimestamp(content.includes('timestamp=1'));
        const match = content.match(/fpslimit=(\d+)/);
        if (match) {
          const val = parseInt(match[1]);
          setFpsLimit(val > 0 && val < 200);
        }
      }
    };
    loadSampConfig();
    loadSampConfig();

    // Listen for auto-update events
    ipcRenderer.on('update-status', (event, text) => {
      setUpdateStatus(text);
    });

    return () => {
      ipcRenderer.removeAllListeners('update-status');
    };
  }, []);

  const selectGameDirectory = async () => {
    const path = await ipcRenderer.invoke('select-directory', 'Selecciona la carpeta raíz de tu GTA San Andreas');
    if (path) {
      setGamePath(path);
    }
  };

  const selectCacheDirectory = async () => {
    const path = await ipcRenderer.invoke('select-directory', 'Selecciona la carpeta de Cache (model_cache)');
    if (path) {
      setCachePath(path);
    }
  };

  const toggleTimestamp = async () => {
    const newStatus = !timestamp;
    setTimestamp(newStatus);

    let content = await ipcRenderer.invoke('read-samp-config') || '';
    if (content.includes('timestamp=')) {
      content = content.replace(/timestamp=\d+/, `timestamp=${newStatus ? 1 : 0}`);
    } else {
      content += `\ntimestamp=${newStatus ? 1 : 0}`;
    }
    await ipcRenderer.invoke('write-samp-config', content);
  };

  const toggleFpsLimit = async () => {
    const newStatus = !fpsLimit;
    setFpsLimit(newStatus);

    let content = await ipcRenderer.invoke('read-samp-config') || '';
    const limitLine = newStatus ? 'fpslimit=90' : 'fpslimit=100';

    if (content.includes('fpslimit=')) {
      content = content.replace(/fpslimit=\d+/, limitLine);
    } else {
      content += `\n${limitLine}`;
    }
    await ipcRenderer.invoke('write-samp-config', content);
  };

  const toggleDiscordRpc = () => {
    const newVal = !discordRpc;
    setDiscordRpc(newVal);
    localStorage.setItem('discordRpc', newVal);
    ipcRenderer.send('toggle-discord-rpc', newVal);
  };


  const clearCache = async () => {
    const success = await ipcRenderer.invoke('clear-model-cache', cachePath);
    if (success) {
      setStatusMsg('Caché limpiada correctamente');
      setTimeout(() => setStatusMsg(''), 3000);
    } else {
      setStatusMsg('Error al limpiar caché');
    }
  };

  const deleteGtaSet = async () => {
    if (confirm('¿Estás seguro? Esto reseteará tu brillo, controles y resolución.')) {
      const success = await ipcRenderer.invoke('delete-gta-set');
      if (success) {
        setStatusMsg('gta_sa.set eliminado');
        setTimeout(() => setStatusMsg(''), 3000);
      }
    }
  };

  const handleSave = () => {
    localStorage.setItem('gamepath', gamePath);
    localStorage.setItem('cachepath', cachePath);

    if (gamePath) {
      const exePath = gamePath.endsWith('gta_sa.exe') ? gamePath : `${gamePath}\\gta_sa.exe`;
      ipcRenderer.invoke('set-registry-value', 'HKCU\\Software\\SAMP', 'gta_sa_exe', exePath);
    }

    if (cachePath) {
      ipcRenderer.invoke('set-registry-value', 'HKCU\\Software\\SAMP', 'model_cache', cachePath);
    }

    setStatusMsg('¡Cambios guardados correctamente!');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  /* Cache Redownload Logic */
  const CACHE_URL = "https://github.com/Duduuuu-cyber/gta-hub-launcher/releases/download/cache-v1/cacheseoul.zip";
  const [downloadingCache, setDownloadingCache] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);

  React.useEffect(() => {
    const handleProgress = (event, percent) => {
      if (downloadingCache) setDownloadProgress(percent);
    };

    const handleComplete = async (event, zipPath) => {
      if (!downloadingCache) return;
      setStatusMsg('Descomprimiendo caché...');

      // Extract to game folder
      const targetDir = gamePath;
      if (!targetDir) {
        alert('Error: No hay ruta de juego definida para instalar la caché.');
        setDownloadingCache(false);
        return;
      }

      const result = await ipcRenderer.invoke('extract-game', zipPath, targetDir);

      if (result.success) {
        const fullCachePath = targetDir + '\\cacheseoul';
        setCachePath(fullCachePath);
        localStorage.setItem('cachepath', fullCachePath);
        await ipcRenderer.invoke('set-registry-value', 'HKCU\\Software\\SAMP', 'model_cache', fullCachePath);

        setStatusMsg('¡Caché re-descargada e instalada!');
        setTimeout(() => setStatusMsg(''), 4000);
      } else {
        alert('Error al extraer caché: ' + result.error);
      }
      setDownloadingCache(false);
      setDownloadProgress(0);
    };

    const handleError = (event, error) => {
      if (!downloadingCache) return;
      alert('Error en descarga: ' + error);
      setDownloadingCache(false);
      setDownloadProgress(0);
    };

    ipcRenderer.on('download-progress', handleProgress);
    ipcRenderer.on('download-complete', handleComplete);
    ipcRenderer.on('download-error', handleError);

    return () => {
      ipcRenderer.removeListener('download-progress', handleProgress);
      ipcRenderer.removeListener('download-complete', handleComplete);
      ipcRenderer.removeListener('download-error', handleError);
    };
  }, [downloadingCache, gamePath]);

  const handleRedownloadCache = async () => {
    if (!gamePath) {
      alert('Primero debes seleccionar la carpeta de tu GTA San Andreas.');
      return;
    }
    if (confirm('¿Seguro que quieres borrar la caché actual y descargarla de nuevo?')) {
      setDownloadingCache(true);
      setDownloadProgress(0);

      // Clean old cache first? Maybe safer to just overwrite/extract over. 
      // But let's try to clear it using our new handler for a clean install
      await ipcRenderer.invoke('clear-model-cache', cachePath);

      const appPath = await ipcRenderer.invoke('get-app-path');
      const zipTarget = appPath + '\\cache_temp_redo.zip';

      ipcRenderer.send('download-game-start', CACHE_URL, zipTarget);
    }
  };

  return (
    <div className="settings-container animate-fade-in">
      <h2 className="page-title">Configuración</h2>

      <div className="settings-section">
        <h3><Shield size={18} /> Juego</h3>
        <div className="control-group">
          <label>Directorio de GTA San Andreas</label>
          <div className="input-row">
            <input type="text" className="input-text" value={gamePath} readOnly />
            <button className="btn-secondary" onClick={selectGameDirectory}>Explorar</button>
          </div>
        </div>
        <div className="control-group">
          <label>Ubicación de Caché (model_cache)</label>
          <div className="input-row">
            <input type="text" className="input-text" value={cachePath} readOnly placeholder="Selecciona la carpeta de caché..." />
            <button className="btn-secondary" onClick={selectCacheDirectory}>Explorar</button>
          </div>

          <div style={{ marginTop: '16px' }}>
            {!downloadingCache ? (
              <button className="cache-download-btn" onClick={handleRedownloadCache}>
                <DownloadCloud size={18} />
                <span>Obtener / Re-descargar Caché Oficial</span>
              </button>
            ) : (
              <div className="download-card-active">
                <div className="d-status">
                  <span>DESCARGANDO CACHÉ</span>
                  <span className="d-percent">{Math.round(downloadProgress)}%</span>
                </div>
                <div className="progress-bar-cyber">
                  <div className="fill" style={{ width: `${downloadProgress}%` }}></div>
                  <div className="glow" style={{ left: `${downloadProgress}%` }}></div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="settings-section">
        <h3><Zap size={18} /> Optimización y Herramientas</h3>

        <div className="switches-grid">
          <div className="switch-item">
            <div className="switch-info">
              <span className="switch-title">Discord Rich Presence</span>
              <span className="switch-desc">Muestra tu estado en Discord.</span>
            </div>
            <button className={`toggle-btn ${discordRpc ? 'active' : ''}`} onClick={toggleDiscordRpc}>
              <div className="toggle-thumb" />
            </button>
          </div>

          <div className="switch-item">
            <div className="switch-info">
              <span className="switch-title">Limitar FPS (90)</span>
              <span className="switch-desc">Recomendado para evitar bugs de físicas.</span>
            </div>
            <button className={`toggle-btn ${fpsLimit ? 'active' : ''}`} onClick={toggleFpsLimit}>
              <div className="toggle-thumb" />
            </button>
          </div>

          <div className="switch-item">
            <div className="switch-info">
              <span className="switch-title">Timestamp en Chat</span>
              <span className="switch-desc">Muestra la hora en los mensajes del chat.</span>
            </div>
            <button className={`toggle-btn ${timestamp ? 'active' : ''}`} onClick={toggleTimestamp}>
              <div className="toggle-thumb" />
            </button>
          </div>
        </div>

        <div className="tools-grid">
          <button className="tool-btn warning" onClick={clearCache}>
            <Trash2 size={16} />
            Limpiar Cache (Modelos)
          </button>
          <button className="tool-btn danger" onClick={deleteGtaSet}>
            <AlertTriangle size={16} />
            Borrar gta_sa.set
          </button>
        </div>
      </div>

      <div className="actions">
        {updateStatus && <span className="update-status-msg" style={{ color: '#60a5fa', marginRight: 20 }}>{updateStatus}</span>}
        {statusMsg && <span className="status-msg">{statusMsg}</span>}
        <button className="btn-secondary" style={{ marginRight: 10 }} onClick={() => ipcRenderer.send('manual-check-update')}>
          Buscar actualizaciones
        </button>
        <button className="btn-primary" onClick={handleSave}>
          <Save size={18} />
          Guardar Cambios
        </button>
      </div>

      <style>{`
        .status-msg { color: #4ade80; font-weight: 600; margin-right: 16px; animation: fadeIn 0.3s; }
        .settings-container { padding: 40px; height: 100%; overflow-y: auto; color: white; }
        .page-title { font-size: 32px; margin-bottom: 32px; font-weight: 700; }
        .settings-section { background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 24px; margin-bottom: 24px; }
        .settings-section h3 { display: flex; align-items: center; gap: 10px; font-size: 18px; margin-bottom: 20px; color: var(--accent-primary); }
        .control-group { margin-bottom: 16px; }
        .control-group label { display: block; margin-bottom: 8px; font-size: 14px; color: var(--text-muted); }
        .input-select, .input-text { width: 100%; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-color); padding: 10px; border-radius: 4px; color: white; font-family: inherit; }
        .input-select:focus, .input-text:focus { border-color: var(--accent-primary); outline: none; }
        .input-row { display: flex; gap: 10px; }
        .btn-secondary { background: rgba(255, 255, 255, 0.1); border: none; padding: 0 16px; color: white; border-radius: 4px; cursor: pointer; }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.2); }
        .actions { margin-top: 40px; display: flex; justify-content: flex-end; }
        .btn-primary { background: var(--accent-primary); color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.2s; }
        .btn-primary:hover { background: #7c3aed; }

        .switches-grid {
            display: grid;
            gap: 16px;
            margin-bottom: 24px;
        }
        .switch-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255,255,255,0.02);
            padding: 12px;
            border-radius: 6px;
        }
        .switch-info { display: flex; flex-direction: column; gap: 4px; }
        .switch-title { font-weight: 600; font-size: 14px; }
        .switch-desc { font-size: 12px; color: var(--text-muted); }
        
        .toggle-btn {
            width: 44px;
            height: 24px;
            background: #3f3f46;
            border-radius: 12px;
            border: none;
            cursor: pointer;
            position: relative;
            transition: background 0.2s;
        }
        .toggle-btn.active { background: var(--accent-primary); }
        .toggle-thumb {
            width: 18px;
            height: 18px;
            background: white;
            border-radius: 50%;
            position: absolute;
            top: 3px;
            left: 3px;
            transition: transform 0.2s;
        }
        .toggle-btn.active .toggle-thumb { transform: translateX(20px); }

        .tools-grid { display: flex; gap: 12px; }
        .tool-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            font-weight: 500;
            font-size: 13px;
            cursor: pointer;
            color: white;
            flex: 1;
            justify-content: center;
            transition: opacity 0.2s;
        }
        .tool-btn:hover { opacity: 0.9; }
        .tool-btn.warning { background: #f59e0b; }
        .tool-btn.danger { background: #ef4444; }

        /* Ultra Premium Cache Button */
        .cache-download-btn {
            width: 100%;
            background: linear-gradient(90deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
            border: 1px solid rgba(129, 140, 248, 0.3);
            color: #c7d2fe;
            padding: 16px;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            text-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
        }
        
        .cache-download-btn::before {
            content: '';
            position: absolute;
            top: 0; left: -100%; width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            transition: 0.5s;
        }

        .cache-download-btn:hover {
            border-color: #818cf8;
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.4), inset 0 0 10px rgba(99, 102, 241, 0.2);
            color: white;
            transform: translateY(-2px);
            background: linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
        }
        
        .cache-download-btn:hover::before {
            left: 100%;
        }

        /* Active Download Card */
        .download-card-active {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(99, 102, 241, 0.3);
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            animation: fadeIn 0.3s ease-out;
        }
        .d-status {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            font-weight: 800;
            color: white;
            margin-bottom: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .d-percent { 
            color: #818cf8; 
            text-shadow: 0 0 10px rgba(129, 140, 248, 0.6);
        }
        
        .progress-bar-cyber {
            height: 10px;
            background: rgba(0,0,0,0.6);
            border-radius: 5px;
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .progress-bar-cyber .fill {
            height: 100%;
            background: linear-gradient(90deg, #4338ca, #6366f1, #a855f7, #ec4899);
            background-size: 200% 100%;
            animation: gradientMove 2s linear infinite;
            border-radius: 5px;
            box-shadow: 0 0 15px rgba(99, 102, 241, 0.6);
            transition: width 0.2s linear;
        }
        
        @keyframes gradientMove {
            0% { background-position: 100% 0; }
            100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
};

export default Settings;
