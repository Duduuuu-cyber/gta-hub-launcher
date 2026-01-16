import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Download, Shield, Zap, Terminal, Globe, ChevronRight, Star, History, Package } from 'lucide-react';
import logoSeoul from './assets/Logo_Seoul_Prueba_8.png';
import launcherPreview from './assets/launcher-preview.png';

/* Components */
const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 backdrop-blur-md bg-black/20 border-b border-white/5">
    <div className="flex items-center gap-3">
      <img src={logoSeoul} alt="Logo" className="w-8 h-8" />
      <span className="font-bold text-xl tracking-wider text-white">GTASeoul</span>
    </div>
    <div className="hidden md:flex gap-6 text-sm font-medium text-gray-300">
      <a href="#features" className="hover:text-white transition-colors">Características</a>
    </div>
    <button onClick={() => window.open('https://discord.gg/2ASjB4AHdS', '_blank')} className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-lg font-bold text-sm transition-all shadow-[0_0_15px_rgba(88,101,242,0.4)]">
      Discord
    </button>
  </nav>
);

const FeatureCard = ({ icon: Icon, title, desc, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-indigo-500/50 transition-all group"
  >
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/30">
      <Icon size={24} className="text-white" />
    </div>
    <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
  </motion.div>
);

function App() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);

  const [version, setVersion] = useState('v1.0.8');
  const [downloadUrl, setDownloadUrl] = useState('https://github.com/Duduuuu-cyber/gta-hub-launcher/releases/latest/download/GTASeoul.Launcher-Setup-1.0.8.exe');

  useEffect(() => {
    fetch('https://api.github.com/repos/Duduuuu-cyber/gta-hub-launcher/releases/latest')
      .then(res => res.json())
      .then(data => {
        if (data.tag_name) {
          setVersion(data.tag_name);
          // Try to find the exe asset
          const exeAsset = data.assets?.find(a => a.name.endsWith('.exe'));
          if (exeAsset) {
            setDownloadUrl(exeAsset.browser_download_url);
          } else {
            // Fallback construction
            const vNum = data.tag_name.replace('v', '');
            setDownloadUrl(`https://github.com/Duduuuu-cyber/gta-hub-launcher/releases/download/${data.tag_name}/GTASeoul.Launcher-Setup-${vNum}.exe`);
          }
        }
      })
      .catch(err => console.error("Error fetching release:", err));
  }, []);

  return (
    <div className="min-h-screen font-sans text-white overflow-hidden bg-[#050508] relative">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 px-4 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-semibold tracking-wide text-green-400 uppercase">{version} Disponible</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black mb-6 leading-tight tracking-tight">
              La Evolución del <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Roleplay</span>
            </h1>

            <p className="text-lg text-gray-400 mb-8 max-w-lg leading-relaxed">
              Descarga el launcher oficial de GTASeoul. Mods verificados, optimización automática y la mejor experiencia de usuario en SA-MP.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white text-black rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] transition-all"
                onClick={() => window.open(downloadUrl, '_blank')}
              >
                <Download size={24} />
                DESCARGAR AHORA
              </motion.button>

              <button
                className="px-8 py-4 bg-white/5 text-white border border-white/10 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all backdrop-blur-md"
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              >
                Saber más <ChevronRight size={20} />
              </button>
            </div>

            <div className="mt-8 flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Shield size={14} className="text-green-500" /> Seguro
              </div>
              <div className="w-1 h-1 bg-gray-700 rounded-full"></div>
              <div className="flex items-center gap-1">
                <Zap size={14} className="text-yellow-500" /> Rápido
              </div>
              <div className="w-1 h-1 bg-gray-700 rounded-full"></div>
              <span>Windows 10/11</span>
            </div>
          </motion.div>

          {/* Visual Content / Launcher Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative hidden lg:block perspective-container"
            style={{ y: y1 }}
          >
            {/* Abstract representation of the launcher window */}
            <div className="relative z-10 w-full rounded-2xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl group">
              <img
                src={launcherPreview}
                alt="Launcher Preview"
                className="w-full h-auto block transition-transform duration-700 hover:scale-105"
              />

              {/* Removed fake UI overlay to show full screenshot */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <img src={logoSeoul} className="w-32 h-32 opacity-0 group-hover:opacity-10 transition-opacity duration-700" alt="Logo Watermark" />
              </div>

              {/* Subtle gradient at bottom only */}
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
            </div>

            {/* Decorative Background Elements behind the mockup */}
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-2xl blur-2xl opacity-30 -z-10 animate-pulse"></div>
          </motion.div>

        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 relative">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black mb-4">Todo lo que necesitas</h2>
            <p className="text-gray-400">Diseñado desde cero para la mejor experiencia de GTA San Andreas Multiplayer.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={Package}
              title="Gestor de Mods"
              desc="Instala mods gráficos, vehículos y skins con un solo click desde nuestro catálogo verificado."
              delay={0.1}
            />
            <FeatureCard
              icon={Zap}
              title="Optimización"
              desc="Limita FPS, ajusta configuraciones y repara errores comunes del juego automáticamente."
              delay={0.2}
            />
            <FeatureCard
              icon={Shield}
              title="Seguridad"
              desc="Protección contra crashes y archivos corruptos. Tu carpeta de juego siempre a salvo."
              delay={0.3}
            />
            <FeatureCard
              icon={History}
              title="Changelog"
              desc="Mantente al día con las últimas actualizaciones del servidor y el launcher."
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-black/40 backdrop-blur-lg">
        <div className="container mx-auto max-w-6xl px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <img src={logoSeoul} alt="Logo" className="w-10 h-10 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all" />
            <div className="text-left">
              <h4 className="font-bold text-white">GTASeoul Launcher</h4>
              <p className="text-xs text-gray-500">© 2026 Duduuuu-cyber. Todos los derechos reservados.</p>
            </div>
          </div>

          <div className="flex gap-6">
            <a href="#" className="text-gray-500 hover:text-white transition-colors">Términos</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">Soporte</a>
          </div>
        </div>
      </footer>

      {/* Tailwind Utility Injection for quick styling without full config */}
      <style>{`
        .perspective-container {
          perspective: 1000px;
        }
      `}</style>
    </div>
  );
}

export default App;
