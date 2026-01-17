const mysql = require('mysql2/promise');

async function inspect() {
    let connection;
    try {
        console.log("Connecting to MySQL...");
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            database: 'zopy',
            // Assuming no password for default XAMPP, or empty string
            password: ''
        });

        console.log("Connected! Analyzing tables...\n");

        const [cuentasStruct] = await connection.query('DESCRIBE cuentas');
        console.log("--- TABLE: cuentas ---");
        console.log(cuentasStruct.map(c => `${c.Field} (${c.Type})`).join('\n'));

        // Check one user to see hash format (SAFETY: Fetching only 1)
        const [users] = await connection.query('SELECT * FROM cuentas LIMIT 1');
        if (users.length > 0) {
            console.log("\n--- SAMPLE USER DATA (CONFIDENTIAL - STRUCTURE ONLY) ---");
            const user = users[0];
            // We will print keys and the *length* / *format start* of values, not full sensitive data logic
            for (const [key, value] of Object.entries(user)) {
                if (typeof value === 'string' && value.length > 20) {
                    console.log(`${key}: [String Length: ${value.length}] Sample: ${value.substring(0, 10)}...`);
                } else {
                    console.log(`${key}: ${value}`);
                }
            }
        }

        try {
            const [personajesStruct] = await connection.query('DESCRIBE personajes');
            console.log("\n--- TABLE: personajes ---");
            console.log(personajesStruct.map(c => `${c.Field} (${c.Type})`).join('\n'));
        } catch (e) { console.log("No personajes table"); }

    } catch (err) {
        console.error("Database Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

inspect();
