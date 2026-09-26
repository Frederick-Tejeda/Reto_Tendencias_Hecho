const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.STAGE === "development" ? false : true
});

// Evento para monitorear si la base de datos se desconecta inesperadamente
pool.on('error', (err, client) => {
    console.error('Error inesperado en el pool de conexiones de PostgreSQL', err);
    process.exit(-1);
});

const query = async (text, params) => pool.query(text, params);

module.exports = {
    query,
    pool
};