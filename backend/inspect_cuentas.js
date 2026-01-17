const mysql = require('mysql2/promise');

async function inspect() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            database: 'zopy',
            password: ''
        });

        const [emailCols] = await connection.query("SHOW COLUMNS FROM cuentas LIKE '%mail%'");
        const [passCols] = await connection.query("SHOW COLUMNS FROM cuentas LIKE '%Clave%'");
        const [userCols] = await connection.query("SHOW COLUMNS FROM cuentas LIKE '%Nombre%'");
        const [securityCols] = await connection.query("SHOW COLUMNS FROM cuentas LIKE '%Pregunta%'"); // Pregunta de seguridad?

        console.log("--- Email Cols:", emailCols);
        console.log("--- Pass Cols:", passCols);
        console.log("--- User Cols:", userCols);
        console.log("--- Security Cols:", securityCols);

    } catch (err) {
        console.error("Database Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

inspect();
