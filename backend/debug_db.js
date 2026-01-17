const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'samp.seoul-rp.net',
    user: 'samp',
    password: process.env.DB_PASSWORD || 'G4BRI3L!',
    database: 'samp'
};

async function check() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log("Connected!");
        const [rows] = await connection.execute('DESCRIBE personajes');
        const skillCols = rows.filter(r =>
            r.Field.toLowerCase().includes('habilidad') ||
            r.Field.toLowerCase().includes('skill') ||
            r.Field.toLowerCase().includes('nivel') // Sometimes named like NivelCamionero
        );
        console.log("Skill Columns:", skillCols.map(c => c.Field));
        await connection.end();
    } catch (e) {
        console.error(e);
    }
}

check();
