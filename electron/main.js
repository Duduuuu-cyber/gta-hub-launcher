import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
import dgram from 'dgram'
import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { exec } from 'child_process'
import fs from 'fs'
import https from 'https'
import AdmZip from 'adm-zip'
import DiscordRPC from 'discord-rpc'

// ----------------------------------------------------------------------
// DEBUG CONFIGURATION
// 1 = Active (Localhost:7777), 0 = Inactive (Production)
// ----------------------------------------------------------------------
const DEBUG_MODE = 0;

const SERVER_CONFIG = {
    host: DEBUG_MODE ? '127.0.0.1' : 'samp.seoul-rp.net',
    port: 7777,
    name: DEBUG_MODE ? 'GTASeoul [DEBUG]' : 'GTASeoul'
};
console.log(`[MAIN] Launched in ${DEBUG_MODE ? 'DEBUG (Localhost)' : 'PRODUCTION'} mode.`);

const DISCORD_CLIENT_ID = '1461428328085852315'; // REPLACE THIS WITH YOUR ACTUAL DISCORD CLIENT ID from https://discord.com/developers/applications
let rpcClient;
let isRpcEnabled = false;
let currentPlayerName = '';

process.env.DIST = join(__dirname, '../dist_build')
process.env.PUBLIC = app.isPackaged ? process.env.DIST : join(__dirname, '../public')

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (win) {
            if (win.isMinimized()) win.restore()
            win.focus()
        }
    })
}

// Auto-Updater Config
const log = require('electron-log');
log.transports.file.level = 'debug';
autoUpdater.logger = log;
autoUpdater.autoDownload = false; // Disable auto download to ask user first
autoUpdater.autoInstallOnAppQuit = false;
if (process.env.NODE_ENV === 'development') {
    autoUpdater.forceDevUpdateConfig = true;
}

ipcMain.on('manual-check-update', () => {
    log.info('Manual update check triggered');
    autoUpdater.checkForUpdates();
});

ipcMain.on('check-for-updates', () => {
    log.info('Startup update check triggered');
    autoUpdater.checkForUpdates();
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Updater Events
const sendStatusToWindow = (text) => {
    if (win) {
        win.webContents.send('update-status', text);
    }
};

autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Buscando actualizaciones...');
});

autoUpdater.on('update-available', (info) => {
    sendStatusToWindow(`Actualización disponible: ${info.version}`);
    if (win) {
        win.webContents.send('update-available-prompt', info);
    }
});

autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('No hay actualizaciones disponibles.');
});

autoUpdater.on('error', (err) => {
    sendStatusToWindow(`Error en auto-updater: ${err}`);
});

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Descargando: " + Math.round(progressObj.percent) + '%';
    sendStatusToWindow(log_message);
    if (win) {
        win.webContents.send('update-download-progress', progressObj.percent);
    }
});

autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('Actualización descargada. Lista para instalar.');
    if (win) {
        win.webContents.send('update-ready-to-install', info);
    }
});

ipcMain.on('start-download-update', () => {
    autoUpdater.downloadUpdate();
});

ipcMain.on('install-update-now', () => {
    autoUpdater.quitAndInstall();
});

// SAMP Query Helper
function querySampServer(ip, port) {
    return new Promise((resolve) => {
        const socket = dgram.createSocket('udp4')
        const packet = Buffer.alloc(11)

        // Header for 'i' (Information) opcode
        packet.write('SAMP')
        const parts = ip.split('.')
        parts.forEach((part, i) => packet.writeUInt8(parseInt(part), 4 + i))
        packet.writeUInt16LE(port, 8)
        packet.write('i', 10)

        let handled = false

        socket.on('message', (msg) => {
            if (handled) return;
            handled = true

            try {
                if (msg.toString('ascii', 0, 4) !== 'SAMP') return

                // Parse 'i' response (SAMP seems to use BE for these fields or network order)
                // Parse 'i' response
                // Header (SAMP + IP + Port + 'i') is 11 bytes (0-10)
                let offset = 11;

                // 1. Password (1 byte)
                const password = msg.readUInt8(offset);
                offset += 1;

                // 2. Players (2 bytes LE)
                const players = msg.readUInt16LE(offset);
                offset += 2;

                // 3. Max Players (2 bytes LE)
                const maxPlayers = msg.readUInt16LE(offset);
                offset += 2;

                // 4. Hostname Length (4 bytes LE)
                const hostnameLen = msg.readUInt32LE(offset);
                offset += 4;

                // 5. Hostname
                let hostname = '';
                if (hostnameLen > 0) {
                    // iconv-lite could be used here for different encodings, 
                    // but most modern servers (and OMP) use UTF-8. 
                    hostname = msg.toString('utf8', offset, offset + hostnameLen);
                    offset += hostnameLen;
                }

                socket.close();
                resolve({ online: true, players, maxPlayers, hostname });
            } catch (e) {
                console.error('SAMP Parse Error:', e);
                socket.close();
                resolve({ online: false, players: 0, maxPlayers: 0, hostname: '' });
            }
        })

        socket.on('error', () => {
            if (!handled) {
                handled = true;
                socket.close()
                resolve({ online: false, players: 0, maxPlayers: 0 })
            }
        })

        socket.send(packet, 0, packet.length, port, ip, (err) => {
            if (err) {
                handled = true
                socket.close()
                resolve({ online: false, players: 0, maxPlayers: 0 })
            }
        })

        setTimeout(() => {
            if (!handled) {
                handled = true
                socket.close()
                resolve({ online: false, players: 0, maxPlayers: 0 })
            }
        }, 4000)
    })
}


let win

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1000,
        minHeight: 700,
        frame: false, // Frameless for custom UI
        backgroundColor: '#0f0f13', // Dark background to avoid white flash
        icon: join(__dirname, '../src/assets/Logo_Seoul_Prueba_8.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For simple IPC demo, can be tightened later
        },
        titleBarStyle: 'hidden',
    })

    // Test active push message to Renderer-process.
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL)
        // win.webContents.openDevTools() // Disabled for production security
    } else {
        win.loadFile(join(process.env.DIST, 'index.html'))
        win.setMenu(null); // Remove default menu (File, Edit, etc)
        // win.webContents.openDevTools() // Strictly disabled in prod
    }
}

app.on('window-all-closed', () => {
    win = null
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.whenReady().then(() => {
    autoUpdater.checkForUpdates();
    createWindow()

    // Window Controls IPC
    ipcMain.on('minimize-window', () => {
        win?.minimize()
    })

    ipcMain.on('maximize-window', () => {
        if (win?.isMaximized()) {
            win?.unmaximize()
        } else {
            win?.maximize()
        }
    })


    ipcMain.on('close-window', () => {
        win?.close()
    })

    // Discord RPC Toggle IPC
    ipcMain.on('toggle-discord-rpc', (event, enabled) => {
        isRpcEnabled = enabled;
        if (enabled) {
            if (!rpcClient) {
                const rpc = new DiscordRPC.Client({ transport: 'ipc' });

                rpc.on('ready', () => {
                    console.log('Discord RPC Connected');
                });

                // Prevent crash on connection errors
                rpc.transport.on('close', () => {
                    console.log('Discord RPC Connection Closed');
                    rpcClient = null;
                });

                rpc.login({ clientId: DISCORD_CLIENT_ID }).catch((err) => {
                    console.error('Failed to connect to Discord RPC:', err);
                    rpcClient = null;
                });

                rpcClient = rpc;
            }
        } else {
            if (rpcClient) {
                try {
                    rpcClient.clearActivity().catch(() => { });
                    rpcClient.destroy().catch(() => { });
                } catch (e) {
                    console.error('Error destroying RPC client:', e);
                }
                rpcClient = null;
            }
        }
    });

    // Update Player Name for RPC
    ipcMain.on('update-player-name', (event, name) => {
        currentPlayerName = name;
        if (isRpcEnabled && rpcClient) {
            // Force refresh status if connected
            // We can trigger a quick update or wait for next poll
            // Let's trigger a quick "Idle" update if server checks are failing, 
            // but ideally the next polling cycle handles it. 
        }
    });

    // SAMP Server Query IPC
    ipcMain.on('get-server-info', async (event) => {
        // IP: samp.seoul-rp.net resolves to some IP, but we need the actual IP for UDP packet usually. 
        // Node dgram works with DNS mostly, but SAMP protocol requires IP in packet.
        // For now let's hope DNS resolution returns IP we can use or we hardcode.
        // Actually, for the packet construction we need the 4 octets of the IP.

        // Let's optimize: We'll do a dns lookup first.
        const dns = await import('dns/promises');
        try {
            // console.log('Resolving samp.seoul-rp.net...');
            const targetHost = SERVER_CONFIG.host;
            const result = await dns.lookup(targetHost);
            // console.log('Resolved IP:', result.address);
            const data = await querySampServer(result.address, SERVER_CONFIG.port);
            // console.log('Query result:', data);

            // Update Discord RPC if enabled
            if (isRpcEnabled && rpcClient) {
                const nameDisplay = currentPlayerName ? `Jugador: ${currentPlayerName}` : 'Sin Nombre';

                if (data.online) {
                    rpcClient.setActivity({
                        details: 'Jugando GTASeoul RolePlay',
                        state: nameDisplay,
                        largeImageKey: 'logo',
                        largeImageText: 'GTA Seoul Launcher',
                        partySize: data.players,
                        partyMax: data.maxPlayers,
                        instance: false,
                    }).catch(console.error);
                } else {
                    rpcClient.setActivity({
                        details: 'Jugando GTASeoul RolePlay',
                        state: nameDisplay,
                        largeImageKey: 'logo',
                        largeImageText: 'GTA Seoul Launcher',
                        instance: false,
                    }).catch(console.error);
                }
            }

            event.reply('server-info-reply', data);
        } catch (e) {
            console.error('SAMP Query Error:', e);
            event.reply('server-info-reply', { online: false, players: 0, maxPlayers: 0 });
        }
    })

    // Generic SAMP Server Query (for Servers Page)
    ipcMain.handle('query-server', async (event, address) => {
        const dns = await import('dns/promises');
        try {
            // Parse Address (allows "IP:Port" or just "IP" -> default 7777)
            let host = address;
            let port = 7777;

            if (address.includes(':')) {
                const parts = address.split(':');
                host = parts[0];
                port = parseInt(parts[1]) || 7777;
            }

            console.log(`[Query] Resolving ${host}:${port}...`);

            // Resolve Hostname to IP if needed
            // dgram mostly needs generic IP, but let's resolve to be safe and standard
            const lookup = await dns.lookup(host);
            const ip = lookup.address;

            // Measure Ping (rough estimate using query time)
            const start = Date.now();
            const data = await querySampServer(ip, port);
            const end = Date.now();
            const ping = end - start;

            return { ...data, ping, ip: ip, originalAddress: address };

        } catch (e) {
            console.error('[Query] Error querying server:', address, e);
            return { online: false, hostname: 'Sin respuesta', players: 0, maxPlayers: 0, ping: -1 };
        }
    });

    // Select Game Directory (Legacy, kept for backup)
    ipcMain.handle('select-game-directory', async () => {
        const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory'],
            title: 'Selecciona la carpeta raíz de tu GTA San Andreas'
        })
        return result.filePaths[0]
    })

    // Generic Select Directory
    ipcMain.handle('select-directory', async (event, title) => {
        const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory'],
            title: title || 'Seleccionar carpeta'
        })
        return result.filePaths[0]
    })

    // Launch Game
    let lastLaunchTime = 0;
    ipcMain.on('launch-game', async (event, gamePath, address) => {
        if (!gamePath) return;

        // Anti-spam / Debounce (10 seconds)
        const now = Date.now();
        if (now - lastLaunchTime < 10000) {
            console.log('[Launch] Blocked to prevent spam. Time since last launch:', now - lastLaunchTime, 'ms');
            return;
        }
        lastLaunchTime = now;

        const dns = await import('dns/promises');
        const { spawn } = await import('child_process');

        try {
            let serverIP;
            let serverPort = 7777;

            if (address) {
                // Custom Server
                console.log(`[Launch] Custom Address provided: ${address}`);
                if (address.includes(':')) {
                    const parts = address.split(':');
                    // If it's a hostname, we should resolve it. If it's IP, lookup returns it anyway.
                    const host = parts[0];
                    serverPort = parseInt(parts[1]) || 7777;

                    const result = await dns.lookup(host);
                    serverIP = result.address;
                } else {
                    const Result = await dns.lookup(address);
                    serverIP = Result.address;
                }
            } else {
                // Default Server (Seoul RP) - Respects DEBUG_MODE
                const targetHost = SERVER_CONFIG.host;
                console.log(`[Launch Debug] DEBUG_MODE value is:`, DEBUG_MODE);
                console.log(`[Launch Debug] SERVER_CONFIG.host is:`, SERVER_CONFIG.host);

                console.log(`Resolving ${targetHost}... (Mode: ${DEBUG_MODE ? 'DEBUG' : 'PROD'})`);
                const result = await dns.lookup(targetHost);
                console.log('Resolved IP:', result.address);
                serverIP = result.address;
                serverPort = SERVER_CONFIG.port;
            }

            console.log(`Launching SAMP at ${gamePath} connecting to ${serverIP}:${serverPort}`);

            // Path to samp.exe
            const sampExe = join(gamePath, 'samp.exe');

            // Spawn Process
            const subprocess = spawn(sampExe, [`${serverIP}:${serverPort}`], {
                cwd: gamePath,
                detached: true,
                stdio: 'ignore'
            });

            subprocess.unref(); // Allow launcher to stay open or close independently

        } catch (error) {
            console.error('Failed to launch game:', error);
            // Reset timer on error to allow retry
            lastLaunchTime = 0;
        }
    })

    // Registry IPC
    ipcMain.handle('get-registry-value', (event, key, valueName) => {
        return new Promise((resolve) => {
            // key example: "HKCU\\Software\\SAMP"
            exec(`reg query "${key}" /v "${valueName}"`, (err, stdout) => {
                if (err) {
                    resolve('');
                    return;
                }
                // Parse output: ... ValueName    REG_SZ    ValueData
                const match = stdout.trim().match(/REG_SZ\s+(.*)/);
                resolve(match ? match[1] : '');
            });
        });
    });

    ipcMain.handle('set-registry-value', (event, key, valueName, data) => {
        return new Promise((resolve) => {
            exec(`reg add "${key}" /v "${valueName}" /t REG_SZ /d "${data}" /f`, (err) => {
                resolve(!err);
            });
        });
    });

    // Open External Links
    ipcMain.on('open-external', (event, url) => {
        if (url && url.startsWith('http')) {
            shell.openExternal(url);
        }
    })

    // --- SAMP Config Handlers ---
    const getSampConfigPath = () => {
        return join(app.getPath('documents'), 'GTA San Andreas User Files', 'SAMP', 'sa-mp.cfg');
    };

    ipcMain.handle('read-samp-config', async () => {
        try {
            const configPath = getSampConfigPath();
            if (fs.existsSync(configPath)) {
                return fs.readFileSync(configPath, 'utf-8');
            }
            return '';
        } catch (e) {
            console.error('Error reading sa-mp.cfg:', e);
            return '';
        }
    });

    ipcMain.handle('write-samp-config', async (event, content) => {
        try {
            const configPath = getSampConfigPath();
            // Ensure directory exists
            const dir = dirname(configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(configPath, content, 'utf-8');
            return true;
        } catch (e) {
            console.error('Error writing sa-mp.cfg:', e);
            return false;
        }
    });

    // --- First Run Wizard IPC ---

    // Check if game exists in a specific path
    ipcMain.handle('check-game-files', async (event, pathToCheck) => {
        console.log('[DEBUG] Checking game files in:', pathToCheck);
        try {
            const exePath = join(pathToCheck, 'gta_sa.exe');
            const exists = fs.existsSync(exePath);
            console.log('[DEBUG] gta_sa.exe exists?', exists);
            return exists;
        } catch (e) {
            console.error('[DEBUG] Error checking game files:', e);
            return false;
        }
    })

    // Check if game exists in THE LAUNCHER'S OWN DIRECTORY (Auto-detect)
    // AND check safe locations (Documents/GTA Seoul, C:/Games/GTA Seoul)
    ipcMain.handle('check-local-game', async () => {
        console.log('[DEBUG] Starting Auto-detect check...');
        try {
            // 1. Check App Dir (Legacy)
            let appDir = app.isPackaged ? dirname(app.getPath('exe')) : app.getAppPath();
            // In dev mode, app.getAppPath() points to source root. 
            // We might want to check if gta_sa.exe is there.
            if (fs.existsSync(join(appDir, 'gta_sa.exe'))) {
                console.log('[DEBUG] Found in App Dir:', appDir);
                return appDir;
            }

            // 2. Check Documents/GTA Seoul
            const docPath = join(app.getPath('documents'), 'GTA Seoul');
            if (fs.existsSync(join(docPath, 'gta_sa.exe'))) {
                console.log('[DEBUG] Found in Documents:', docPath);
                return docPath;
            }

            // 3. Check C:/Games/GTA Seoul
            const globalPath = 'C:\\Games\\GTA Seoul';
            if (fs.existsSync(join(globalPath, 'gta_sa.exe'))) {
                console.log('[DEBUG] Found in C:/Games:', globalPath);
                return globalPath;
            }

            console.log('[DEBUG] Game not found in standard locations.');
            return null;
        } catch (e) {
            console.error('[DEBUG] Auto-detect error:', e);
            return null;
        }
    });

    // Get Safe Game Path for Installation
    ipcMain.handle('get-safe-game-path', async () => {
        try {
            // Priority 1: Documents/GTA Seoul
            const docPath = join(app.getPath('documents'), 'GTA Seoul');
            try {
                if (!fs.existsSync(docPath)) fs.mkdirSync(docPath, { recursive: true });
                // Test write permission just in case
                fs.accessSync(docPath, fs.constants.W_OK);
                console.log('[DEBUG] Using Safe Path (Documents):', docPath);
                return docPath;
            } catch (docErr) {
                console.warn('[WARN] Could not use Documents path:', docErr.message);
            }

            // Priority 2: C:/Games/GTA Seoul
            const globalPath = 'C:\\Games\\GTA Seoul';
            try {
                if (!fs.existsSync(globalPath)) fs.mkdirSync(globalPath, { recursive: true });
                console.log('[DEBUG] Using Safe Path (Global):', globalPath);
                return globalPath;
            } catch (globalErr) {
                console.error('[ERROR] Could not use Global path:', globalErr.message);
            }

            // Fallback: App Data (Least desirable but better than crash)
            return app.getPath('userData');
        } catch (e) {
            console.error('Critical Error getting safe path:', e);
            throw e;
        }
    });

    ipcMain.handle('get-temp-path', () => app.getPath('temp'));

    // Global reference for download cancellation
    let activeDownloadRequest = null;

    // Download Game
    ipcMain.on('download-game-start', (event, url, targetPath) => {
        let finalPath = targetPath;

        // Security / Permission Check
        try {
            // Try to open file for writing to check permissions
            const checkFd = fs.openSync(finalPath, 'w');
            fs.closeSync(checkFd);
            fs.unlinkSync(finalPath); // Clean up check file
        } catch (err) {
            console.log(`[Main] EPERM or Error writing to ${finalPath}. Fallback to Temp.`);
            const { basename } = require('path');
            finalPath = join(app.getPath('temp'), basename(targetPath));
            console.log(`[Main] New Target Path: ${finalPath}`);
        }

        const startDownload = (downloadUrl, redirectCount = 0) => {
            console.log(`[DEBUG] Starting download from: ${downloadUrl} (Redirects: ${redirectCount})`);

            if (redirectCount > 10) {
                event.sender.send('download-error', 'Too many redirects.');
                return;
            }

            activeDownloadRequest = https.get(downloadUrl, (response) => {
                console.log('[DEBUG] Response Status:', response.statusCode);

                // Handle Redirects (301, 302, 307, 308)
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    console.log('[DEBUG] Redirect detected to:', response.headers.location);
                    response.resume(); // Consume/discard response data to free socket
                    startDownload(response.headers.location, redirectCount + 1);
                    return;
                }

                if (response.statusCode !== 200) {
                    event.sender.send('download-error', `Server returned error ${response.statusCode}`);
                    return;
                }

                // Prepare file stream
                const file = fs.createWriteStream(finalPath);
                const total = parseInt(response.headers['content-length'], 10);
                let cur = 0;

                response.on('data', (chunk) => {
                    cur += chunk.length;
                    file.write(chunk);
                    // Send progress (0-100)
                    if (total) {
                        const percent = (cur / total) * 100;
                        event.sender.send('download-progress', percent);
                    }
                });

                response.on('end', () => {
                    file.end();
                    console.log('[DEBUG] Download finished.');
                    // IMPORTANT: Send back the ACTUAL finalPath used
                    event.sender.send('download-complete', finalPath);
                    activeDownloadRequest = null;
                });

                response.on('error', (err) => {
                    file.close();
                    fs.unlink(finalPath, () => { });
                    event.sender.send('download-error', 'Error de red: ' + err.message);
                });
            });

            activeDownloadRequest.on('error', (err) => {
                console.error('[DEBUG] Request error:', err);
                event.sender.send('download-error', 'Error solicitud: ' + err.message);
            });
        };

        startDownload(url);
    });

    ipcMain.on('download-game-cancel', () => {
        if (activeDownloadRequest) {
            console.log('[DEBUG] Cancelling download...');
            activeDownloadRequest.destroy();
            activeDownloadRequest = null;
        }
    });

    // Extract Game
    // Extract Game (PowerShell method to handle >2GB files)
    ipcMain.handle('extract-game', async (event, zipPath, targetDir) => {
        return new Promise((resolve, reject) => {
            console.log('[DEBUG] Starting extraction via PowerShell:', zipPath);
            const { spawn } = require('child_process');

            // Expand-Archive -LiteralPath '...' -DestinationPath '...' -Force
            const ps = spawn('powershell.exe', [
                '-NoProfile',
                '-ExecutionPolicy', 'Bypass',
                '-Command',
                `Expand-Archive -LiteralPath "${zipPath}" -DestinationPath "${targetDir}" -Force`
            ]);

            ps.stdout.on('data', (data) => {
                console.log(`[PS stdout]: ${data}`);
            });

            ps.stderr.on('data', (data) => {
                console.log(`[PS stderr / Progress]: ${data}`);
            });

            ps.on('close', (code) => {
                if (code === 0) {
                    console.log('[DEBUG] Extraction successful');

                    // Robust Deletion: Wait for PowerShell to fully release handle
                    setTimeout(() => {
                        try {
                            const fs = require('fs');
                            if (fs.existsSync(zipPath)) {
                                fs.unlinkSync(zipPath); // Delete zip after success
                                console.log('[DEBUG] Zip deleted successfully');
                            }
                        } catch (e) {
                            console.warn('Could not delete zip (first try), will retry in 2s:', e.message);
                            // Retry once more
                            setTimeout(() => {
                                try {
                                    const fs = require('fs');
                                    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
                                } catch (retryErr) {
                                    console.error('Final failure deleting zip:', retryErr.message);
                                }
                            }, 2000);
                        }
                    }, 1000); // Wait 1s before first delete attempt

                    resolve({ success: true });
                } else {
                    console.error('[DEBUG] Extraction failed with code:', code);
                    resolve({ success: false, error: 'Extraction process exited with code ' + code });
                }
            });

            ps.on('error', (err) => {
                console.error('[DEBUG] Failed to start PowerShell:', err);
                resolve({ success: false, error: err.message });
            });
        });
    });

    // Clear Model Cache
    ipcMain.handle('clear-model-cache', async (event, cachePath) => {
        try {
            if (fs.existsSync(cachePath)) {
                // Remove contents only, NOT the directory itself
                const files = fs.readdirSync(cachePath);
                for (const file of files) {
                    const curPath = join(cachePath, file);
                    fs.rmSync(curPath, { recursive: true, force: true });
                }
                return true;
            }
            return false; // Directory doesn't exist, nothing to clear
        } catch (e) {
            console.error('Error clearing cache:', e);
            return false;
        }
    });

    // Delete gta_sa.set
    ipcMain.handle('delete-gta-set', async () => {
        try {
            // usually in Documents/GTA San Andreas User Files/gta_sa.set
            const documentsPath = app.getPath('documents');
            const gtaSetPath = join(documentsPath, 'GTA San Andreas User Files', 'gta_sa.set');

            if (fs.existsSync(gtaSetPath)) {
                fs.unlinkSync(gtaSetPath);
                return true;
            }
            return false;
        } catch (e) {
            console.error('Error deleting gta_sa.set:', e);
            return false;
        }
    });

    // Check Cache Exists
    ipcMain.handle('check-cache-exists', async (event, gamePath) => {
        try {
            const cachePath = join(gamePath, 'cacheseoul');
            const exists = fs.existsSync(cachePath);
            console.log(`[DEBUG] Checking for cacheseoul in ${gamePath}: ${exists}`);
            return exists;
        } catch (e) {
            console.error('[DEBUG] Error checking cache:', e);
            return false;
        }
    });

    // Get App Path (to know where to install if "default")
    ipcMain.handle('get-app-path', () => {
        // Use userData or a specific folder next to executable
        return app.isPackaged ? dirname(app.getPath('exe')) : app.getAppPath();
    });
})
