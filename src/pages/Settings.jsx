import React from 'react';
import { Save, Monitor, Shield, Zap, Trash2, AlertTriangle } from 'lucide-react';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { invoke: () => Promise.resolve(null) } };

const Settings = () => {
  const [gamePath, setGamePath] = React.useState(localStorage.getItem('gtapath') || '');
  const [cachePath, setCachePath] = React.useState(localStorage.getItem('cachepath') || '');
  const [resolution, setResolution] = React.useState(localStorage.getItem('resolution') || '1920x1080');
  const [screenMode, setScreenMode] = React.useState(localStorage.getItem('screenMode') || 'fullscreen');
  const [statusMsg, setStatusMsg] = React.useState('');

  /* Optimization Logic */
  const [fpsLimit, setFpsLimit] = React.useState(false);
  const [timestamp, setTimestamp] = React.useState(false);

  React.useEffect(() => {
    // Load Game Path from Registry
    const loadFromRegistry = async () => {
      const regGamePath = await ipcRenderer.invoke('get-registry-value', 'HKCU\\Software\\SAMP', 'gta_sa_exe');
      if (regGamePath) {
        let folderPath = regGamePath;
        if (folderPath.toLowerCase().endsWith('\\gta_sa.exe')) {
          folderPath = folderPath.substring(0, folderPath.lastIndexOf('\\'));
        }
        setGamePath(folderPath);
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
    localStorage.setItem('gtapath', gamePath);
    localStorage.setItem('cachepath', cachePath);
    localStorage.setItem('resolution', resolution);
    localStorage.setItem('screenMode', screenMode);

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

  return (
    <div className="settings-container animate-fade-in">
      <h2 className="page-title">Configuración</h2>

      <div className="settings-section">
        <h3><Monitor size={18} /> Gráficos</h3>
        <div className="control-group">
          <label>Resolución</label>
          <select className="input-select" value={resolution} onChange={(e) => setResolution(e.target.value)}>
            <option value="1920x1080">1920x1080</option>
            <option value="1280x720">1280x720</option>
          </select>
        </div>
        <div className="control-group">
          <label>Modo de Pantalla</label>
          <select className="input-select" value={screenMode} onChange={(e) => setScreenMode(e.target.value)}>
            <option value="fullscreen">Pantalla Completa</option>
            <option value="windowed">Ventana</option>
          </select>
        </div>
      </div>

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
        </div>
      </div>

      <div className="settings-section">
        <h3><Zap size={18} /> Optimización y Herramientas</h3>

        <div className="switches-grid">
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
        {statusMsg && <span className="status-msg">{statusMsg}</span>}
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
      `}</style>
    </div>
  );
};

export default Settings;
