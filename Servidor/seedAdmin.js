require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./src/config/db');

const crearAdministrador = async () => {
    const username = 'admin_intec';
    const passwordPlana = 'Intec2026*'; // Contraseña temporal
    const rol = 'Administrador';

    try {
        console.log('Generando hash de la contraseña...');
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(passwordPlana, saltRounds);

        console.log('Insertando usuario en la base de datos...');
        const query = `
            INSERT INTO usuarios (username, password_hash, rol, estado) 
            VALUES ($1, $2, $3, true) 
            RETURNING id_usuario, username, rol;
        `;
        
        const res = await db.query(query, [username, passwordHash, rol]);
        
        console.log('✅ ¡Administrador creado con éxito!');
        console.log(res.rows[0]);

    } catch (error) {
        // Ignorar error si el usuario ya existe (violación de restricción UNIQUE)
        if (error.code === '23505') {
            console.log('⚠️ El usuario administrador ya existe en la base de datos.');
        } else {
            console.error('❌ Error al crear administrador:', error);
        }
    } finally {
        // Cerrar el pool de conexiones para que el script termine
        db.pool.end(); 
    }
};

crearAdministrador();