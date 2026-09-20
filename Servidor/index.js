const app = require('./src/app');
require('dotenv').config();
const db = require('./src/config/db');

const PORT = process.env.PORT || 3000;

// 1. Probamos la conexión a la base de datos ANTES de levantar el servidor HTTP
db.pool.connect()
    .then(client => {
        console.log('✅ Conexión exitosa a la base de datos PostgreSQL.');
        client.release(); // Liberamos el cliente de vuelta al pool
        
        // 2. Levantamos el servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
            console.log(`🔍 Verifica el estado en: http://localhost:${PORT}/api/v1/health`);
        });
    })
    .catch(err => {
        console.error('❌ Error fatal: No se pudo conectar a la base de datos PostgreSQL.', err.stack);
        // Si no hay base de datos, matamos el proceso (Fail-fast)
        process.exit(1); 
    });