import React from 'react';
import { Minus, Square, X } from 'lucide-react';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { send: () => { } } };

const TitleBar = () => {
  const handleMinimize = () => ipcRenderer.send('minimize-window');
  const handleMaximize = () => ipcRenderer.send('maximize-window');
  const handleClose = () => ipcRenderer.send('close-window');

  return (
    <div className="titlebar">
      <div className="title-drag-region">
        <span className="app-title">GTASeoul LAUNCHER</span>
      </div>

      <div className="window-controls">
        <button onClick={handleMinimize} className="control-btn minimize">
          <Minus size={16} />
        </button>
        <button onClick={handleMaximize} className="control-btn maximize">
          <Square size={14} />
        </button>
        <button onClick={handleClose} className="control-btn close">
          <X size={16} />
        </button>
      </div>

      <style>{`
        .titlebar {
          height: var(--app-drag-height);
          background: var(--bg-card);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          z-index: 50;
        }

        .title-drag-region {
          flex: 1;
          height: 100%;
          -webkit-app-region: drag;
          display: flex;
          align-items: center;
          padding-left: 16px;
        }

        .app-title {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1px;
          color: var(--text-muted);
        }

        .window-controls {
          display: flex;
          -webkit-app-region: no-drag;
          height: 100%;
        }

        .control-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          width: 40px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-main);
        }

        .control-btn.close:hover {
          background: #ef4444;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default TitleBar;
