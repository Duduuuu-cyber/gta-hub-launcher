import React, { useState, useEffect } from 'react';
import { History, ArrowLeft, Star, Wrench, Bug } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Changelog = () => {
    const navigate = useNavigate();
    // Example data - normally this would fetch from a JSON
    const [changes] = useState([
        {
            version: '1.0.7',
            date: '15 Enero 2026',
            features: [
                { type: 'fix', text: 'Corregido: Configuración de FPS y Timestamp no se guardaba correctamente' },
                { type: 'fix', text: 'Corregido: Mods extraídos en subcarpetas y limpieza de archivos temporales (Zip)' },
                { type: 'improve', text: 'Mejorado el diseño de Discord Rich Presence' },
                { type: 'improve', text: 'Nuevos iconos en el menú de ajustes' },
                { type: 'new', text: 'Rebranding completo a GTASeoul' }
            ]
        },
        {
            version: '1.0.6',
            date: '15 Enero 2026',
            features: [
                { type: 'new', text: 'Nueva sección de Changelog para ver historial de cambios' },
                { type: 'fix', text: 'Corrección en la instalación de Mods (Permitir reinstalar)' },
                { type: 'improve', text: 'Mejoras en el sistema de actualización automática' },
                { type: 'improve', text: 'Bloqueo de múltiples instancias del launcher' }
            ]
        },
        {
            version: '1.0.5',
            date: '14 Enero 2026',
            features: [
                { type: 'new', text: 'Integración de Mods automáticos desde GitHub' },
                { type: 'fix', text: 'Solucionado error de permisos en Windows 11' },
            ]
        },
        {
            version: '1.0.0',
            date: '01 Enero 2026',
            features: [
                { type: 'new', text: 'Lanzamiento oficial de GTASeoul Launcher' },
            ]
        }
    ]);

    const getIcon = (type) => {
        switch (type) {
            case 'new': return <Star size={16} className="icon-new" />;
            case 'fix': return <Bug size={16} className="icon-fix" />;
            case 'improve': return <Wrench size={16} className="icon-improve" />;
            default: return <div className="icon-dot" />;
        }
    };

    const getLabel = (type) => {
        switch (type) {
            case 'new': return 'NUEVO';
            case 'fix': return 'FIX';
            case 'improve': return 'MEJORA';
            default: return '';
        }
    };

    return (
        <div className="changelog-container animate-fade-in">
            <div className="header">
                <h2 className="page-title">
                    <History className="icon-title" /> Historial de Cambios
                </h2>
                <p className="page-subtitle">Mantente al día con las últimas novedades del launcher.</p>
            </div>

            <div className="timeline">
                {changes.map((release, idx) => (
                    <div key={idx} className="release-card glass-panel">
                        <div className="release-header">
                            <span className="version-number">v{release.version}</span>
                            <span className="release-date">{release.date}</span>
                        </div>

                        <div className="release-content">
                            {release.features.map((feat, fIdx) => (
                                <div key={fIdx} className={`feature-item ${feat.type}`}>
                                    <div className="feature-icon-wrapper">
                                        {getIcon(feat.type)}
                                    </div>
                                    <div className="feature-text">
                                        <span className={`feature-badge badge-${feat.type}`}>{getLabel(feat.type)}</span>
                                        {feat.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
        .changelog-container {
          padding: 40px;
          height: 100%;
          overflow-y: auto;
          color: white;
        }
        .header {
           margin-bottom: 32px;
        }
        .page-title {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 28px;
            margin-bottom: 8px;
        }
        .icon-title {
            color: var(--accent-primary);
        }
        .page-subtitle {
            color: var(--text-muted);
        }
        
        .timeline {
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 800px;
        }
        
        .release-card {
          padding: 24px;
          border-left: 4px solid var(--accent-primary);
        }
        
        .release-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 12px;
        }
        
        .version-number {
          font-size: 24px;
          font-weight: 800;
          color: var(--accent-primary);
          letter-spacing: 1px;
        }
        
        .release-date {
          color: var(--text-muted);
          font-size: 14px;
        }
        
        .feature-item {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        
        .feature-item:hover {
          background: rgba(255,255,255,0.03);
        }
        
        .feature-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
        }
        
        .icon-new { color: #eab308; }
        .icon-fix { color: #ef4444; }
        .icon-improve { color: #3b82f6; }
        
        .feature-text {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          color: #e2e8f0;
        }
        
        .feature-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          min-width: 50px;
          text-align: center;
        }
        
        .badge-new { background: rgba(234, 179, 8, 0.2); color: #eab308; }
        .badge-fix { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .badge-improve { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
      `}</style>
        </div>
    );
};

export default Changelog;
