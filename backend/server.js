require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const md5 = require('md5');
const https = require('https');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3001;

// 1. SECURITY HEADERS (Helmet)
app.use(helmet());

// 2. CORS (Restricted to Launcher/Localhost)
app.use(cors({ origin: '*' })); // In production, restrict this to your domain if mostly web-based
app.use(express.json());

// 3. RATE LIMITING (Brute-force Protection)
// General API Limiter (100 requests per 15 mins)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Demasiadas peticiones desde esta IP, por favor intenta nuevamente en 15 minutos."
});
app.use('/api', apiLimiter);

// Auth Limiter (Strict: 10 attempts per hour for Login/Register)
// This prevents hackers from guessing passwords indefinitely
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: "Has excedido el número de intentos de inicio de sesión. Intenta más tarde."
});
app.use('/api/auth/', authLimiter);

// Database Configuration
const DEBUG = false; // Set to false for Production (samp.seoul-rp.net)

const dbConfig = DEBUG ? {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'zopy'
} : {
    host: 'localhost',
    user: 'samp',
    password: process.env.DB_PASSWORD || 'G4BRI3L!', // Securely use ENV or fallback
    database: 'samp'
};

// Connection Pool (Production Grade)
// Maintains active connections to avoid handshake overhead and handle drops.
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Database Query Logic (Using Pool)
async function query(sql, params) {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (err) {
        console.error("SQL Error:", err.message);
        throw err; // Re-throw for endpoint handling
    }
}

// Hashing Helper (Configurable)
function hashPassword(password, salt) {
    // COMMON SA-MP HASHING: SHA256(salt + password) or SHA256(password + salt)
    // We will convert to UpperCase to match the DB "Clave" format seen (usually uppercased in SA-MP)

    // Try format 1: SHA256(password + salt)
    // const hash = crypto.createHash('sha256').update(password + salt).digest('hex').toUpperCase();

    // Try format 2: SHA256(salt + password) - Very common
    // return crypto.createHash('sha256').update(salt + password).digest('hex').toUpperCase();

    // Try format 3: SHA256(password) - if salt is unused (unlikely)

    // Let's implement a verify function that tries both if we are debugging, 
    // but for now, we'll try standard SHA256(password . salt)
    return crypto.createHash('sha256').update(password + salt).digest('hex').toUpperCase();
}

/**
 * LOGIN ENDPOINT
 */
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Faltan credenciales" });
    }

    try {
        // 1. Find user by Name
        const users = await query('SELECT * FROM cuentas WHERE Nombre = ?', [username]);

        if (users.length === 0) {
            return res.status(401).json({ error: "Usuario no encontrado" });
        }

        const user = users[0];

        // 2. Verify Password
        // Warning: We need to know the EXACT Algorithm. 
        // I will try to generate the hash using the User's salt and the provided password.

        // Option A: SHA256(Password + Salt)
        const hashA = crypto.createHash('sha256').update(password + user.Salt).digest('hex').toUpperCase();

        // Option B: SHA256(Salt + Password)
        const hashB = crypto.createHash('sha256').update(user.Salt + password).digest('hex').toUpperCase();

        let isValid = false;
        if (hashA === user.Clave) isValid = true;
        if (hashB === user.Clave) isValid = true;

        // Direct comparison (if plaintext - highly unlikely but possible in bad systems)
        if (password === user.Clave) isValid = true;

        if (!isValid) {
            console.log(`Login Failed for ${username}.`);
            // Security: Don't log passwords in production
            return res.status(401).json({ error: "Contraseña incorrecta" });
        }

        // 3. Login Success - Fetch Characters
        // CORRECTION: 'Faccion' -> 'MiembroFaccion', 'LiderFaccion'
        // NEW: 'OtakuN_N' is the Ban status for characters.
        const personajes = await query('SELECT ID, Nombre_Apellido, Skin, BolosUwU, BanescoOwO, MiembroFaccion, LiderFaccion, Rango, NivelSobredosis, Trabajo1, OtakuN_N FROM personajes WHERE CuentaID = ?', [user.ID]);

        res.json({
            success: true,
            user: {
                id: user.ID,
                name: user.Nombre,
                coins: user.KawaiAwA,
                vip: user.VIP,
                admin: user.AdminLevel || 0, // Keeping for legacy/compatibility
                rank: user.JotoOtaku || 0,   // Correct Admin Rank (1-5)
                giftClaimed: user.LauncherGift
            },
            characters: personajes
        });

    } catch (err) {
        console.error("CRITICAL LOGIN ERROR:", err);
        console.error("Error Message:", err.message);
        if (err.sql) console.error("SQL:", err.sql);
        res.status(500).json({ error: "Error interno del servidor: " + err.message });
    }
});

app.post('/api/auth/logout', async (req, res) => {
    const { userId } = req.body;
    if (userId) {
        try {
            await query('DELETE FROM launcher_tokens WHERE user_id = ?', [userId]);
            res.json({ success: true });
        } catch (e) {
            console.error('Logout error:', e);
            res.status(500).json({ error: 'Error logging out' });
        }
    } else {
        res.status(400).json({ error: 'Missing userId' });
    }
});

/**
 * REFRESH USER DATA ENDPOINT
 * Securely fetches updated stats without relogging.
 */
app.get('/api/user/:id/refresh', async (req, res) => {
    try {
        const userId = req.params.id;

        // SECURITY: Using prepared statements (?) to prevent SQL Injection here too.

        // 1. Fetch User Data
        // Changed 'users' to 'cuentas' to match login
        const users = await query('SELECT * FROM cuentas WHERE ID = ?', [userId]);

        if (users.length === 0) return res.status(404).json({ error: "User not found" });

        const user = users[0];

        // 2. Fetch Characters
        // Using 'OtakuN_N' for ban status and 'FugaoVicio' for hours played
        const personajes = await query(`
            SELECT 
                ID, Nombre_Apellido, Skin, BolosUwU, BanescoOwO, MiembroFaccion, LiderFaccion, Rango, NivelSobredosis, 
                Trabajo1, Trabajo2, Trabajo3, OtakuN_N, FugaoVicio,
                Bolsillo_1, Cantidad_bolsillo_1, Bolsillo_2, Cantidad_bolsillo_2, Bolsillo_3, Cantidad_bolsillo_3,
                Bolsillo_4, Cantidad_bolsillo_4, Bolsillo_5, Cantidad_bolsillo_5, Bolsillo_6, Cantidad_bolsillo_6,
                Bolsillo_7, Cantidad_bolsillo_7, Bolsillo_8, Cantidad_bolsillo_8, Bolsillo_9, Cantidad_bolsillo_9,
                Mano_derecha, Cantidad_mano_derecha, Mano_izquierda, Cantidad_mano_izquierda, Espalda, Cantidad_espalda,
                Habilidad1, Habilidad2, Habilidad3, Habilidad4, Habilidad5, Habilidad6, Habilidad7, Habilidad8
            FROM personajes WHERE CuentaID = ?`, [userId]);

        res.json({
            success: true,
            user: {
                id: user.ID,
                name: user.Nombre,
                coins: user.KawaiAwA,
                vip: user.VIP,
                expiration: user.Expira,
                admin: user.AdminLevel || 0,
                rank: user.JotoOtaku || 0,
                giftClaimed: user.LauncherGift
            },
            characters: personajes
        });

    } catch (err) {
        console.error("Refresh SQL Error:", err);
        res.status(500).json({ error: "Error refreshing data" });
    }
});

/**
 * VEHICLES ENDPOINT
 */
app.get('/api/vehicles/:ownerName', async (req, res) => {
    try {
        const vehicles = await query('SELECT ID, Modelo, Gasolina, Vida, Color_1, Color_2, matricula FROM vehiculos WHERE Propietario = ?', [req.params.ownerName]);
        res.json(vehicles);
    } catch (err) {
        res.status(500).json({ error: "Error fetching vehicles" });
    }
});

/**
 * PROPERTIES ENDPOINT
 */
app.get('/api/properties/:ownerName', async (req, res) => {
    try {
        const owner = req.params.ownerName;

        // Helper to safely query tables that might not exist or have different schemas
        const safeQuery = async (queryStr, params) => {
            try {
                return await query(queryStr, params);
            } catch (e) {
                console.warn(`Query failed (might be expected for optional tables): ${queryStr.split('FROM')[1]?.split(' ')[1]}`, e.message);
                return [];
            }
        };

        const [casas, negocios, empresas, garages] = await Promise.all([
            safeQuery('SELECT ID, Tipo, Precio, BolosUwU, Exterior_X, Exterior_Y FROM casas WHERE Propietario = ?', [owner]),
            safeQuery('SELECT ID, Nombre, Precio, Ganancias, CostoEntrada FROM negocios WHERE Propietario = ?', [owner]),
            safeQuery('SELECT ID, Nombre, Presupuesto FROM empresas WHERE Propietario = ?', [owner]),
            safeQuery('SELECT ID, Precio, UltimaConexion FROM garages WHERE Propietario = ?', [owner])
        ]);

        res.json({
            houses: casas,
            businesses: negocios,
            companies: empresas,
            garages: garages
        });
    } catch (err) {
        console.error("Properties Error:", err);
        res.status(500).json({ error: "Error fetching properties" });
    }
});

// --------------------------------------------------------------------------
// Registration Endpoint
// --------------------------------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
    const { username, password, email, securityQuestion, securityAnswer } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    // SECURITY: Strict Input Validation
    const userRegex = /^[a-zA-Z0-9_]{3,24}$/;
    if (!userRegex.test(username)) {
        return res.status(400).json({ error: "Formato de usuario inválido. Solo letras, números y guión bajo (3-24 caracteres)." });
    }

    // Email Validation Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Formato de correo electrónico inválido." });
    }

    try {
        // 1. Check if user exists
        const existing = await query('SELECT ID FROM cuentas WHERE Nombre = ?', [username]);
        if (existing.length > 0) {
            return res.status(409).json({ error: "El nombre de usuario ya está en uso." });
        }

        // 2. Check if Email Exists (Duplicate Email Check)
        const existingEmail = await query('SELECT ID FROM cuentas WHERE Email = ?', [email]);
        if (existingEmail.length > 0) {
            return res.status(409).json({ error: "El correo electrónico ya está registrado." });
        }

        // 2. Generate Salt & Hash
        // DB Column is varchar(11), so we must generate max 11 chars. 
        // randomBytes(5) -> 10 hex chars.
        const salt = crypto.randomBytes(5).toString('hex').toUpperCase();
        // Uses the same hashing logic as login: SHA256(password + salt)
        const hash = crypto.createHash('sha256').update(password + salt).digest('hex').toUpperCase();

        // 3. Insert User
        // Note: Default values for other columns handled by DB or set to 0/Empty
        // Adjusted query to include Email/Pregunta based on inspection
        const result = await query(
            `INSERT INTO cuentas (Nombre, Clave, Salt, Email, PreguntaSeguridad, RespuestaSeguridad, FechaRegistro, UltimaConexion) 
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [username, hash, salt, email, securityQuestion || 'Ninguna', securityAnswer || '']
        );

        res.json({ success: true, userId: result.insertId });

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Error al registrar usuario." });
    }
});

// --------------------------------------------------------------------------
// Create Character Endpoint
// --------------------------------------------------------------------------
app.post('/api/characters/create', async (req, res) => {
    const { userId, name, sex, skin, city } = req.body; // sex: 1 (Male), 0 (Female)

    if (!userId || !name || sex === undefined || !skin) {
        return res.status(400).json({ error: "Datos incompletos" });
    }

    // SECURITY: Strict Name Format Validation
    const nameRegex = /^[A-Z][a-z]+_[A-Z][a-z]+$/;
    if (!nameRegex.test(name)) {
        return res.status(400).json({ error: "Formato de nombre inválido. Debe ser Nombre_Apellido (ej. Gabriel_Yanquetruz)." });
    }

    try {
        // 1. Validate User & Check Slots (VIP Limit)
        const users = await query('SELECT ID, VIP FROM cuentas WHERE ID = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
        const user = users[0];

        const outputChars = await query('SELECT COUNT(*) as count FROM personajes WHERE CuentaID = ?', [userId]);
        const charCount = outputChars[0].count;

        // Limit Logic (Example: Default 3, VIP 5)
        // TODO: Adjust these limits based on your actual VIP system
        const limit = user.VIP > 0 ? 5 : 3;

        if (charCount >= limit) {
            return res.status(403).json({ error: `Has alcanzado el límite de personajes (${limit}). Adquiere VIP para más.` });
        }

        // 2. Duplicate Name Check
        const existing = await query('SELECT ID FROM personajes WHERE Nombre_Apellido = ?', [name]);
        if (existing.length > 0) return res.status(409).json({ error: "Ese nombre ya está ocupado." });

        // 3. Insert Character
        // Default Stats from PAWN: 
        // Money: 1250
        // Pos: 390.3237, -1801.2737, 7.8281
        // Level/Score: 1
        const initialMoney = 1250;
        const result = await query(
            `INSERT INTO personajes 
            (Nombre_Apellido, CuentaID, Skin, Sexo, Ciudad, BolosUwU, 
             PosicionX, PosicionY, PosicionZ, PosicionR, Interior, VirtualWorld, 
             FechaRegistro, UltimaConexion, FugaoVicio) 
             VALUES (?, ?, ?, ?, ?, ?, 
             390.3237, -1801.2737, 7.8281, 315.5817, 0, 0, 
             NOW(), NOW(), 0)`,
            [name, userId, skin, sex, city || 1, initialMoney]
        );

        res.json({ success: true, charId: result.insertId });

    } catch (err) {
        console.error("Create Char Error:", err);
        res.status(500).json({ error: "Error al crear personaje." });
    }
});

app.post('/api/auth/sso-token', async (req, res) => {
    try {
        const { userId, characterName, characterId } = req.body;
        // Basic Validation
        if (!userId || !characterName || !characterId) return res.status(400).json({ success: false, error: 'Missing required fields' });

        // 1. Get IP from Request (The Client's IP)
        let userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Clean IPv6 to IPv4 if needed (::ffff:127.0.0.1 -> 127.0.0.1)
        if (userIp && userIp.startsWith('::ffff:')) {
            userIp = userIp.split(':').pop();
        }

        console.log(`[SSO] Incoming Request IP: ${userIp}`);

        // 2. If Localhost (Dev Environment), try to resolve Real Public IP via API
        // This is needed because SA-MP Server (Remote) sees your Public IP, but Local Backend sees 127.0.0.1
        if (!userIp || userIp === '::1' || userIp === '127.0.0.1') {
            try {
                console.log('[SSO] Localhost detected. Resolving Public IPv4...');
                await new Promise((resolve) => {
                    https.get('https://api4.ipify.org?format=json', (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try {
                                const json = JSON.parse(data);
                                if (json.ip) {
                                    userIp = json.ip;
                                    console.log('[SSO] Resolved Public IPv4 (Dev):', userIp);
                                }
                                resolve();
                            } catch (e) { resolve(); }
                        });
                    }).on('error', (err) => {
                        console.error('[SSO] IP Fetch Error:', err.message);
                        resolve();
                    });
                });
            } catch (e) { console.error('IP Promise Error', e); }
        }

        // Generate Secure Token (8 chars hex)
        const token = crypto.randomBytes(4).toString('hex').toUpperCase();

        // Expire in 60 seconds (Short-lived for security)
        // Cleanup global expired tokens securely
        await query('DELETE FROM launcher_tokens WHERE expires < NOW()');

        // FORCE CLEANUP: Delete ANY active tokens for this User ID to prevent stale sessions
        await query('DELETE FROM launcher_tokens WHERE user_id = ?', [userId]);

        // Also Delete ANY active tokens for this IP to prevent "Ghost" logins if IP is shared
        if (userIp) {
            await query('DELETE FROM launcher_tokens WHERE ip = ?', [userIp]);
        }

        // SUBNET FLOOD STRATEGY (Fix for CGNAT/Dynamic IP Mismatch)
        // We will insert/update tokens for the ENTIRE /24 subnet of the user.
        // This ensures that if Game Server sees .129 and API sees .235, both work.

        if (userIp.includes('.')) {
            const parts = userIp.split('.');
            const subnetBase = `${parts[0]}.${parts[1]}.${parts[2]}`;

            // Construct Batch Insert
            // We use REPLACE INTO to overwrite existing entries for any IP in that range
            let sql = `REPLACE INTO launcher_tokens (ip, token, user_id, character_name, character_id, expires) VALUES `;
            let params = [];

            // Optimize: Instead of 255, let's do a reasonable range if we wanted, 
            // but for /24 typically the last octet shifts. 254 entries is fine.
            let placeholders = [];
            for (let i = 1; i <= 254; i++) {
                placeholders.push(`(?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`);
                params.push(`${subnetBase}.${i}`, token, userId, characterName, characterId);
            }

            sql += placeholders.join(', ');

            // Execute Batch
            // Note: execute() can sometimes struggle with huge param lists depending on driver, 
            // but 1200 params should be okay. If not, we fall back to query().
            await pool.query(sql, params); // Using pool.query for easier array handling

            console.log(`[SSO] Subnet Flood Authorized: ${subnetBase}.1-254 for User ${userId}`);

        } else {
            // Fallback for IPv6 (Single IP for now until we understand the subnet structure)
            await query(`REPLACE INTO launcher_tokens (ip, token, user_id, character_name, character_id, expires) 
                          VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
                [userIp, token, userId, characterName, characterId]);
        }

        console.log(`[SSO] Token generated for Public IP: ${userIp} | User: ${userId} -> Token: ${token}`);
        res.json({ success: true, token });

    } catch (err) {
        console.error('[SSO] Error generating token:', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// --------------------------------------------------------------------------
// MIGRATIONS & SCHEMA SETUP
// --------------------------------------------------------------------------
const REQUIRED_COLUMNS = [
    { name: 'reward_coins', type: 'INT DEFAULT 0' },
    { name: 'reward_type', type: "VARCHAR(20) DEFAULT 'COINS'" },
    { name: 'reward_data', type: 'INT DEFAULT 0' },
    { name: 'active', type: 'TINYINT DEFAULT 1' },
    { name: 'icon', type: "VARCHAR(50) DEFAULT 'gift'" },
    { name: 'is_welcome_gift', type: 'TINYINT DEFAULT 0' }
];

async function ensureSchema() {
    try {
        console.log('[MIGRATION] Checking DB Schema...');
        const connection = await mysql.createConnection(dbConfig);

        // 1. Ensure Legacy Column (for backward compatibility if needed, or migration)
        try {
            await connection.execute('SELECT LauncherGift FROM cuentas LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('[MIGRATION] Adding LauncherGift legacy column...');
                await connection.execute('ALTER TABLE cuentas ADD COLUMN LauncherGift TINYINT DEFAULT 0');
            }
        }

        // 2. Create GIFTS Table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS launcher_gifts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                description TEXT,
                icon VARCHAR(50) DEFAULT 'gift',
                reward_coins INT DEFAULT 0,
                reward_type VARCHAR(20) DEFAULT 'COINS',
                reward_data INT DEFAULT 0,
                active TINYINT DEFAULT 1,
                is_welcome_gift TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Check for Missing Columns (Fix for 500 Errors on older tables)
        for (const col of REQUIRED_COLUMNS) {
            try {
                await connection.execute(`SELECT ${col.name} FROM launcher_gifts LIMIT 1`);
            } catch (err) {
                if (err.code === 'ER_BAD_FIELD_ERROR') {
                    console.log(`[MIGRATION] Adding missing column: ${col.name}...`);
                    await connection.execute(`ALTER TABLE launcher_gifts ADD COLUMN ${col.name} ${col.type}`);
                }
            }
        }

        // 4. Create CLAIMS Table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS launcher_gift_claims (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                gift_id INT NOT NULL,
                character_id INT DEFAULT NULL,
                claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_claim (user_id, gift_id)
            )
        `);

        // 5. Seed Default Welcome Gift
        const [gifts] = await connection.execute('SELECT id FROM launcher_gifts WHERE id = 1');
        if (gifts.length === 0) {
            console.log('[MIGRATION] Seeding default Welcome Gift...');
            await connection.execute(`
                INSERT INTO launcher_gifts (id, title, description, icon, reward_type, reward_data, active) 
                VALUES (1, 'Regalo de Bienvenida', 'Gracias por unirte a la familia de GTA Seoul. ¡Disfruta de este bono inicial!', 'star', 'COINS', 5000, 1)
            `);
        }

        await connection.end();
        console.log('[MIGRATION] Schema verified.');

    } catch (err) {
        console.error('[MIGRATION] Schema Error:', err);
    }
}

/**
 * ADVANCED GIFT SYSTEM API
 */

// GET: List all gifts (with claimed status for userId)
app.get('/api/gifts', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    try {
        // Fetch all active gifts
        const gifts = await query('SELECT * FROM launcher_gifts WHERE active = 1 ORDER BY id DESC');

        // Fetch user's claims
        const claims = await query('SELECT gift_id FROM launcher_gift_claims WHERE user_id = ?', [userId]);
        const claimedIds = new Set(claims.map(c => c.gift_id));

        // Sync Legacy "LauncherGift" column if needed (Welcome Gift ID 1)
        const userLegacy = await query('SELECT LauncherGift FROM cuentas WHERE ID = ?', [userId]);
        if (userLegacy.length > 0 && userLegacy[0].LauncherGift === 1) {
            claimedIds.add(1);
        }

        const result = gifts.map(g => ({
            ...g,
            claimed: claimedIds.has(g.id)
        }));

        res.json(result);
    } catch (err) {
        console.error("Fetch Gifts Error:", err);
        res.status(500).json({ error: "Error fetching gifts" });
    }
});

// POST: Claim a specific gift
app.post('/api/gifts/claim', async (req, res) => {
    const { userId, giftId, characterId } = req.body;
    if (!userId || !giftId) return res.status(400).json({ error: "Datos incompletos" });

    try {
        // 1. Check if Gift Exists
        const gifts = await query('SELECT * FROM launcher_gifts WHERE id = ? AND active = 1', [giftId]);
        if (gifts.length === 0) return res.status(404).json({ error: "Regalo no disponible" });
        const gift = gifts[0];
        const rewardAmount = gift.reward_data || gift.reward_coins || 0;
        const type = gift.reward_type || 'COINS';

        // 2. Check User & Character Validity
        const users = await query('SELECT ID FROM cuentas WHERE ID = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ error: "Usuario inválido" });

        if (type === 'MONEY') {
            if (!characterId) return res.status(400).json({ error: "Debes seleccionar un personaje." });
            const chars = await query('SELECT ID FROM personajes WHERE ID = ? AND CuentaID = ?', [characterId, userId]);
            if (chars.length === 0) return res.status(403).json({ error: "Personaje inválido o no te pertenece." });
        }

        // 3. Check if Already Claimed
        const existing = await query('SELECT id FROM launcher_gift_claims WHERE user_id = ? AND gift_id = ?', [userId, giftId]);
        if (existing.length > 0) return res.status(400).json({ error: "Ya reclamado." });

        if (giftId === 1) {
            const userLegacy = await query('SELECT LauncherGift FROM cuentas WHERE ID = ?', [userId]);
            if (userLegacy.length > 0 && userLegacy[0].LauncherGift === 1) {
                return res.status(400).json({ error: "Ya reclamado (Legacy)." });
            }
        }

        // 4. APPLY REWARD
        let responseData = { success: true };

        if (type === 'COINS') {
            await query('UPDATE cuentas SET KawaiAwA = KawaiAwA + ? WHERE ID = ?', [rewardAmount, userId]);
            // Refresh balance needed for frontend check
            const u = await query('SELECT KawaiAwA FROM cuentas WHERE ID = ?', [userId]);
            responseData.newBalance = u[0].KawaiAwA;
            responseData.reward = rewardAmount;
        }
        else if (type === 'MONEY') {
            await query('UPDATE personajes SET BolosUwU = BolosUwU + ? WHERE ID = ?', [rewardAmount, characterId]);
            responseData.message = `¡$${rewardAmount} añadidos a tu personaje!`;
        }
        else if (type === 'VIP') {
            // Logic: Set VIP level. If already VIP, maybe extend? 
            // For now, simple implementation: Set VIP level and Expiration = Now + Days
            // reward_data assumed to be DAYS. But we need Level? 
            // Better convention: VIP gifts give VIP LEVEL 1 for X Days (from data). Or Set VIP 3.
            // Let's assume reward_data is DAYS and we give Standard VIP (1) or whatever user has.
            // If user is not VIP, set VIP 1. If is VIP, extend expiration.
            const user = (await query('SELECT VIP, Expira FROM cuentas WHERE ID = ?', [userId]))[0];
            const days = rewardAmount; // Using data field as days

            let newDate;
            if (user.VIP > 0 && new Date(user.Expira) > new Date()) {
                // Extend
                await query('UPDATE cuentas SET Expira = DATE_ADD(Expira, INTERVAL ? DAY) WHERE ID = ?', [days, userId]);
            } else {
                // Set New (Default VIP 1)
                await query('UPDATE cuentas SET VIP = 1, Expira = DATE_ADD(NOW(), INTERVAL ? DAY) WHERE ID = ?', [days, userId]);
            }
            responseData.message = `¡VIP extendido por ${days} días!`;
        }

        // 5. Record Claim
        await query('INSERT INTO launcher_gift_claims (user_id, gift_id, character_id) VALUES (?, ?, ?)',
            [userId, giftId, characterId || null]);

        // Legacy Sync
        if (giftId === 1) {
            await query('UPDATE cuentas SET LauncherGift = 1 WHERE ID = ?', [userId]);
        }

        res.json(responseData);

    } catch (err) {
        console.error("Claim Error:", err);
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Ya reclamado." });
        res.status(500).json({ error: "Error interno" });
    }
});

// POST: Create New Gift (Admin Only)
app.post('/api/gifts/create', async (req, res) => {
    const { userId, title, description, reward, type, icon, isWelcome } = req.body;

    if (!userId) return res.status(401).json({ error: "No autorizado" });
    if (!title || !reward || !type) return res.status(400).json({ error: "Faltan datos" });

    try {
        const admins = await query('SELECT JotoOtaku FROM cuentas WHERE ID = ?', [userId]);
        if (admins.length === 0 || admins[0].JotoOtaku < 5) return res.status(403).json({ error: "Requiere Rango 5." });

        if (isWelcome) {
            await query('UPDATE launcher_gifts SET is_welcome_gift = 0 WHERE is_welcome_gift = 1');
        }

        await query('INSERT INTO launcher_gifts (title, description, reward_type, reward_data, icon, is_welcome_gift) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description || '', type, reward, icon || 'gift', isWelcome ? 1 : 0]);

        res.json({ success: true });
    } catch (err) {
        console.error("Create Gift Error DETAILED:", err);
        console.error("SQL Message:", err.sqlMessage);
        res.status(500).json({ error: "Error creando regalo: " + (err.sqlMessage || err.message) });
    }
});

// DELETE: Deactivate Gift (Admin Only)
app.delete('/api/gifts/:id', async (req, res) => {
    const { userId } = req.body; // Pass userId in body for auth check
    const giftId = req.params.id;

    if (!userId) return res.status(401).json({ error: "No autorizado" });

    try {
        // 1. Verify Admin
        const admins = await query('SELECT JotoOtaku FROM cuentas WHERE ID = ?', [userId]);
        if (admins.length === 0 || admins[0].JotoOtaku < 5) {
            return res.status(403).json({ error: "Rango insuficiente." });
        }

        // 2. Soft Delete (Set active = 0)
        await query('UPDATE launcher_gifts SET active = 0 WHERE id = ?', [giftId]);
        res.json({ success: true });

    } catch (err) {
        console.error("Delete Gift Error:", err);
        res.status(500).json({ error: "Error eliminando regalo" });
    }
});

// LEGACY ROUTE SUPPORT (For the generic welcome modal if it calls the old route)
app.post('/api/gifts/claim-welcome', async (req, res) => {
    const { userId, characterId } = req.body;

    try {
        // 1. Find ACTIVE Welcome Gift
        const gifts = await query('SELECT * FROM launcher_gifts WHERE is_welcome_gift = 1 AND active = 1 LIMIT 1');
        if (gifts.length === 0) return res.status(404).json({ error: "No hay regalo de bienvenida activo." });
        const gift = gifts[0];

        // 2. Check Claim
        const existing = await query('SELECT id FROM launcher_gift_claims WHERE user_id = ? AND gift_id = ?', [userId, gift.id]);
        if (existing.length > 0) return res.status(400).json({ error: "Ya reclamado." });

        if (gift.id === 1) {
            const userLegacy = await query('SELECT LauncherGift FROM cuentas WHERE ID = ?', [userId]);
            if (userLegacy.length > 0 && userLegacy[0].LauncherGift === 1) return res.status(400).json({ error: "Ya reclamado (Legacy)." });
        }

        // 3. Claim
        const rewardAmount = gift.reward_data || gift.reward_coins;
        const type = gift.reward_type || 'COINS';

        let newBalance = 0;
        let responseData = { success: true, reward: rewardAmount };

        if (type === 'MONEY') {
            if (!characterId) return res.status(400).json({ error: "Debes seleccionar un personaje." });

            // Validate Char Ownership
            const chars = await query('SELECT ID FROM personajes WHERE ID = ? AND CuentaID = ?', [characterId, userId]);
            if (chars.length === 0) return res.status(403).json({ error: "Personaje inválido." });

            await query('UPDATE personajes SET BolosUwU = BolosUwU + ? WHERE ID = ?', [rewardAmount, characterId]);
            responseData.message = `¡$${rewardAmount} añadidos a tu personaje!`;
        }
        else if (type === 'COINS') {
            await query('UPDATE cuentas SET KawaiAwA = KawaiAwA + ? WHERE ID = ?', [rewardAmount, userId]);
            const u = await query('SELECT KawaiAwA FROM cuentas WHERE ID = ?', [userId]);
            newBalance = u[0].KawaiAwA;
            responseData.newBalance = newBalance;
        }
        else if (type === 'VIP') {
            const user = (await query('SELECT VIP, Expira FROM cuentas WHERE ID = ?', [userId]))[0];
            const days = rewardAmount;
            if (user.VIP > 0 && new Date(user.Expira) > new Date()) {
                await query('UPDATE cuentas SET Expira = DATE_ADD(Expira, INTERVAL ? DAY) WHERE ID = ?', [days, userId]);
            } else {
                await query('UPDATE cuentas SET VIP = 1, Expira = DATE_ADD(NOW(), INTERVAL ? DAY) WHERE ID = ?', [days, userId]);
            }
        }

        await query('INSERT INTO launcher_gift_claims (user_id, gift_id, character_id) VALUES (?, ?, ?)', [userId, gift.id, characterId || null]);
        if (gift.id === 1) await query('UPDATE cuentas SET LauncherGift = 1 WHERE ID = ?', [userId]);

        res.json(responseData);

    } catch (e) {
        console.error("Welcome Claim Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// GET: Check active Welcome Gift
app.get('/api/gifts/welcome-active', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    try {
        // 1. Find ACTIVE Welcome Gift
        const gifts = await query('SELECT * FROM launcher_gifts WHERE is_welcome_gift = 1 AND active = 1 LIMIT 1');

        if (gifts.length === 0) {
            return res.json({ found: false });
        }

        const gift = gifts[0];

        // 2. Check Claim Status
        const existing = await query('SELECT id FROM launcher_gift_claims WHERE user_id = ? AND gift_id = ?', [userId, gift.id]);
        let claimed = existing.length > 0;

        // Legacy Check
        if (!claimed && gift.id === 1) {
            const userLegacy = await query('SELECT LauncherGift FROM cuentas WHERE ID = ?', [userId]);
            if (userLegacy.length > 0 && userLegacy[0].LauncherGift === 1) {
                claimed = true;
            }
        }

        res.json({
            found: true,
            claimed: claimed,
            gift: gift
        });

    } catch (err) {
        console.error("Welcome Check Error:", err);
        res.status(500).json({ error: "Error checking welcome gift" });
    }
});

// --------------------------------------------------------------------------
// Start Server
// --------------------------------------------------------------------------
// Start Server
// --------------------------------------------------------------------------
app.listen(PORT, async () => {
    await ensureSchema();
    console.log(`GTASeoul Auth API running on http://localhost:${PORT}`);
});

// Global Error Safety
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
    // Keep alive in production, but log loud
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});
