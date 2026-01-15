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

const DISCORD_CLIENT_ID = '1461428328085852315'; // REPLACE THIS WITH YOUR ACTUAL DISCORD CLIENT ID from https://discord.com/developers/applications
let rpcClient;
let isRpcEnabled = false;
let currentPlayerName = '';

process.env.DIST = join(__dirname, '../dist_build')
process.env.PUBLIC = app.isPackaged ? process.env.DIST : join(__dirname, '../public')

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
                    // but for now we assume standard Windows-1252 or similar, approximated by latin1 or utf8
                    hostname = msg.toString('latin1', offset, offset + hostnameLen);
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
        }, 2000)
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
        // win.webContents.openDevTools()
    } else {
        // win.loadFile('dist/index.html')
        win.loadFile(join(process.env.DIST, 'index.html'))
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
            console.log('Resolving samp.seoul-rp.net...');
            const result = await dns.lookup('samp.seoul-rp.net');
            console.log('Resolved IP:', result.address);
            const data = await querySampServer(result.address, 7777);
            console.log('Query result:', data);

            // Update Discord RPC if enabled
            if (isRpcEnabled && rpcClient) {
                const nameDisplay = currentPlayerName ? ` | Jugando como: ${currentPlayerName}` : '';

                if (data.online) {
                    rpcClient.setActivity({
                        details: `Jugando GTA Seoul Roleplay${nameDisplay}`,
                        state: `${data.players} de ${data.maxPlayers} Jugadores Online`,
                        largeImageKey: 'logo',
                        largeImageText: 'GTA Seoul Launcher',
                        instance: false,
                    }).catch(console.error);
                } else {
                    rpcClient.setActivity({
                        details: 'Jugando GTA Seoul',
                        state: currentPlayerName ? `Usuario: ${currentPlayerName}` : 'En el Launcher',
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
    ipcMain.on('launch-game', async (event, gamePath) => {
        if (!gamePath) return;

        const dns = await import('dns/promises');
        const { spawn } = await import('child_process');

        try {
            // Resolve IP
            console.log('Resolving samp.seoul-rp.net...');
            const result = await dns.lookup('samp.seoul-rp.net');
            console.log('Resolved IP:', result.address);
            const serverIP = result.address;
            const serverPort = 7777;

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
    ipcMain.handle('check-local-game', async () => {
        console.log('[DEBUG] Starting Auto-detect check...');
        try {
            // Check where the app is running
            let appDir = app.isPackaged ? dirname(app.getPath('exe')) : app.getAppPath();
            console.log('[DEBUG] App Dir:', appDir);

            const exePath = join(appDir, 'gta_sa.exe');
            const exists = fs.existsSync(exePath);
            console.log('[DEBUG] Local gta_sa.exe found?', exists);

            if (exists) {
                return appDir;
            }
            return null;
        } catch (e) {
            console.error('[DEBUG] Auto-detect error:', e);
            return null;
        }
    });

    // Global reference for download cancellation
    let activeDownloadRequest = null;

    // Download Game
    ipcMain.on('download-game-start', (event, url, targetPath) => {
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
                const file = fs.createWriteStream(targetPath);
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
                    event.sender.send('download-complete', targetPath);
                    activeDownloadRequest = null;
                });

                response.on('error', (err) => {
                    file.close();
                    fs.unlink(targetPath, () => { });
                    event.sender.send('download-error', err.message);
                });
            });

            activeDownloadRequest.on('error', (err) => {
                console.error('[DEBUG] Request error:', err);
                event.sender.send('download-error', err.message);
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
                console.error(`[PS stderr]: ${data}`);
            });

            ps.on('close', (code) => {
                if (code === 0) {
                    console.log('[DEBUG] Extraction successful');
                    try {
                        const fs = require('fs');
                        if (fs.existsSync(zipPath)) {
                            fs.unlinkSync(zipPath); // Delete zip after success
                        }
                    } catch (e) {
                        console.warn('Could not delete zip:', e);
                    }
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
                // Remove recursive
                fs.rmSync(cachePath, { recursive: true, force: true });
                return true;
            }
            return false;
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
