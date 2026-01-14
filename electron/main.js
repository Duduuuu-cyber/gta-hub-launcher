import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
import dgram from 'dgram'
import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { exec } from 'child_process'

process.env.DIST = join(__dirname, '../dist_build')
process.env.PUBLIC = app.isPackaged ? process.env.DIST : join(__dirname, '../public')

// Auto-Updater Config
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

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
                let offset = 11
                const players = msg.readUInt16BE(offset)
                offset += 2
                const maxPlayers = msg.readUInt16BE(offset)

                socket.close()
                resolve({ online: true, players, maxPlayers })
            } catch (e) {
                socket.close()
                resolve({ online: false, players: 0, maxPlayers: 0 })
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
    autoUpdater.checkForUpdatesAndNotify();
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
})
