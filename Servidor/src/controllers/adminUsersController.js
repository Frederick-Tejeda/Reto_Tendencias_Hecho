const db = require('../config/db');
const bcrypt = require('bcrypt'); // Asegúrate de tenerlo instalado: pnpm add bcrypt

// 1.2 Creación de Usuario
const crearUsuario = async (req, res) => {
    const { rol, data } = req.body;
    const { correo, password, name } = data;

    try {
        // En un escenario real, el frontend envía texto plano y el backend hashea. 
        // Si el frontend ya envía un hash (como dice el JSON), puedes omitir esta línea.
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await db.query(
            `INSERT INTO usuarios (correo, password_hash, rol, nombre_completo) 
             VALUES ($1, $2, $3, $4) RETURNING id_usuario, nombre_completo, rol`,
            [correo, passwordHash, rol, name]
        );

        const newUser = result.rows[0];

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: String(newUser.id_usuario), // Cast a string para el frontend
                    name: newUser.nombre_completo,
                    rol: newUser.rol
                }
            }
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(400).json({ success: false, message: 'Error al crear el usuario. Verifica que el correo no esté duplicado.' });
    }
};

// 1.3 Modificar Usuario
const modificarUsuario = async (req, res) => {
    const { id } = req.params;
    const { data } = req.body;
    const { correo, rol } = data;

    try {
        await db.query(
            `UPDATE usuarios SET correo = COALESCE($1, correo), rol = COALESCE($2, rol) 
             WHERE id_usuario = $3`,
            [correo, rol, id]
        );

        res.status(200).json({
            success: true,
            message: 'Usuario modificado satisfactoriamente'
        });
    } catch (error) {
        console.error('Error al modificar usuario:', error);
        res.status(500).json({ success: false, message: 'Error interno al modificar usuario' });
    }
};

// 1.4 Desactivar Usuario
const desactivarUsuario = async (req, res) => {
    const { id } = req.params;
    const { isActive, reason } = req.body; // reason se puede guardar en una tabla de logs si es necesario

    try {
        await db.query(
            'UPDATE usuarios SET estado = $1 WHERE id_usuario = $2',
            [isActive, id]
        );

        // Opcional: Registrar el 'reason' en tu tabla auditoria_trazabilidad
        
        const accionTexto = isActive ? 'activado' : 'desactivado';
        res.status(200).json({
            success: true,
            message: `Usuario ${accionTexto} satisfactoriamente`
        });
    } catch (error) {
        console.error('Error al desactivar usuario:', error);
        res.status(500).json({ success: false, message: 'Error interno al cambiar estado del usuario' });
    }
};

// 1.5 Listar Usuarios
const listarUsuarios = async (req, res) => {
    try {
        // En una implementación completa, aquí extraerías page y limit de req.query para el offset
        const result = await db.query(
            `SELECT id_usuario, nombre_completo, correo, rol, estado 
             FROM usuarios ORDER BY id_usuario DESC`
        );

        const formatedData = result.rows.map(user => ({
            id: String(user.id_usuario),
            name: user.nombre_completo,
            correo: user.correo,
            rol: user.rol,
            isActive: user.estado
        }));

        res.status(200).json({
            success: true,
            data: formatedData,
            meta: {
                total: formatedData.length,
                page: 1 // Dinamizar esto según paginación en el futuro
            }
        });
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ success: false, message: 'Error interno al listar usuarios' });
    }
};

// 1.6 Restablecer Contraseña
const restablecerPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword, requireChangeOnNextLogin } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await db.query(
            `UPDATE usuarios SET password_hash = $1, requiere_cambio_clave = $2 
             WHERE id_usuario = $3`,
            [passwordHash, requireChangeOnNextLogin, id]
        );

        res.status(200).json({
            success: true,
            message: 'Contraseña restablecida correctamente.'
        });
    } catch (error) {
        console.error('Error al restablecer contraseña:', error);
        res.status(500).json({ success: false, message: 'Error interno al restablecer contraseña' });
    }
};

module.exports = {
    crearUsuario,
    modificarUsuario,
    desactivarUsuario,
    listarUsuarios,
    restablecerPassword
};