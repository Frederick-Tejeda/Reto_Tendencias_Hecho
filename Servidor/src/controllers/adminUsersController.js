const db = require('../config/db');
const bcrypt = require('bcrypt'); // Asegúrate de tenerlo instalado: pnpm add bcrypt

// 1.2 Creación de Usuario
const crearUsuario = async (req, res) => {
    const { rol, data } = req.body;
    const { correo, password, name, id_empleado, id_estacion } = data;
    const id_usuario_creador = req.usuario.id_usuario;

    const id_empleadoInt = Number(id_empleado);
    const id_estacionInt = Number(id_estacion);

    const rolesPermitidos = ['Administrador', 'Supervisor', 'Despachador', 'Auditor', 'Solicitante', 'Audiencia']

    if(!rolesPermitidos.includes(rol)) res.status(400).json({ success: false, message: 'Error al crear el usuario. Verifica que el rol sea correcto.' })
    
    if (rol === 'Solicitante' && !id_empleado) {
        return res.status(400).json({ success: false, message: 'El rol Solicitante requiere un id_empleado vinculado.' });
    }

    if(id_empleado && id_empleadoInt > 0){
         const resultEmpleado = await db.query(
            `SELECT 1 FROM empleados WHERE id_empleado = $1`,
            [id_empleadoInt]);
        if(resultEmpleado.rows.length == 0) res.status(400).json({ success: false, message: 'Error al crear el usuario. Verifica que el id_empleado sea correcto.' })
    }

    if(id_estacion && id_estacionInt > 0){
         const resultEstacion = await db.query(
            `SELECT 1 FROM estaciones WHERE id_estacion = $1`,
            [id_estacionInt]);
        if(resultEstacion.rows.length == 0) res.status(400).json({ success: false, message: 'Error al crear el usuario. Verifica que el id_empleado sea correcto.' })
    }

    const cliente = await db.pool.connect();

    try {

        await cliente.query('BEGIN');
        // En un escenario real, el frontend envía texto plano y el backend hashea. 
        // Si el frontend ya envía un hash (como dice el JSON), puedes omitir esta línea.
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await cliente.query(
            `INSERT INTO usuarios (correo, password_hash, rol, nombre_completo, id_empleado, id_estacion) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_usuario, nombre_completo, rol`,
            [correo, passwordHash, rol, name, id_empleado || null, id_estacion || null]
        );

        const newUser = result.rows[0];

        // Registro de Auditoría
        await cliente.query(`
            INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles) 
            VALUES ($1, 'CREAR_USUARIO', 'usuarios', $2)
        `, [id_usuario_creador, `Nuevo usuario ID: ${newUser.id_usuario}, Rol: ${rol}`]);

        await cliente.query('COMMIT');

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
        await cliente.query('ROLLBACK');
        console.error('Error al crear usuario:', error);
        res.status(500).json({ success: false, message: 'Error al crear el usuario. Verifica que el correo no esté duplicado.' });
    } finally {
        // Liberar el cliente al pool
        cliente.release();
    }
};

// 1.3 Modificar Usuario
const modificarUsuario = async (req, res) => {
    const { id } = req.params;
    const { data } = req.body;
    const { correo, rol, id_empleado, id_estacion } = data;
    const id_usuario_modificador = req.usuario.id_usuario;

    const id_empleadoInt = Number(id_empleado);
    const id_estacionInt = Number(id_estacion);

    const rolesPermitidos = ['Administrador', 'Supervisor', 'Despachador', 'Auditor', 'Solicitante']

    if(!rolesPermitidos.includes(rol)) res.status(400).json({ success: false, message: 'Error al modificar el usuario. Verifica que el rol sea correcto.' })

    if(id_empleado && id_empleadoInt > 0){
         const resultEmpleado = await db.query(
            `SELECT 1 FROM empleados WHERE id_empleado = $1`,
            [id_empleadoInt]);
        if(resultEmpleado.rows.length == 0) res.status(400).json({ success: false, message: 'Error al modificar el usuario. Verifica que el id_empleado sea correcto.' })
    }

    if(id_estacion && id_estacionInt > 0){
         const resultEstacion = await db.query(
            `SELECT 1 FROM estaciones WHERE id_estacion = $1`,
            [id_estacionInt]);
        if(resultEstacion.rows.length == 0) res.status(400).json({ success: false, message: 'Error al modificar el usuario. Verifica que el id_empleado sea correcto.' })
    }

    const cliente = await db.pool.connect();

    try {
        await cliente.query(
            `UPDATE usuarios SET correo = COALESCE($1, correo), rol = COALESCE($2, rol), id_empleado = COALESCE($3, id_empleado), 
            id_estacion = COALESCE($5, id_estacion) WHERE id_usuario = $4`,
            [correo, rol, (id_empleadoInt > 0) ? id_empleadoInt : null, id, (id_estacionInt > 0) ? id_estacionInt : null]
        );

        // Registro de Auditoría
        await cliente.query(`
            INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles) 
            VALUES ($1, 'MODIFICAR_USUARIO', 'usuarios', $2)
        `, [id_usuario_modificador, `Usuario modificado ID: ${id}`]);

        await cliente.query('COMMIT');

        res.status(200).json({
            success: true,
            message: 'Usuario modificado satisfactoriamente'
        });
    } catch (error) {
        await cliente.query('ROLLBACK');
        console.error('Error al modificar usuario:', error);
        res.status(500).json({ success: false, message: 'Error interno al modificar usuario' });
    } finally {
        // Liberar el cliente al pool
        cliente.release();
    }
};

// 1.4 Desactivar Usuario
const desactivarUsuario = async (req, res) => {
    const { id } = req.params;
    const { isActive, reason } = req.body; // reason se puede guardar en una tabla de logs si es necesario
    const id_usuario_modificador = req.usuario.id_usuario;

    const cliente = await db.pool.connect();

    try {
        await cliente.query(
            'UPDATE usuarios SET estado = $1 WHERE id_usuario = $2',
            [isActive, id]
        );

        const accionTexto = isActive ? 'activado' : 'desactivado';
        const accionTextoAuditoria = isActive ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO';

        // Registro de Auditoría
        await cliente.query(`
            INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles) 
            VALUES ($1, $2, 'usuarios', $3)
        `, [id_usuario_modificador, accionTextoAuditoria, `Usuario ${accionTexto} ID: ${id}. Motivo: ${reason}`]);

        await db.query('COMMIT');       

        res.status(200).json({
            success: true,
            message: `Usuario ${accionTexto} satisfactoriamente`
        });
    } catch (error) {
        await cliente.query('ROLLBACK');
        console.error('Error al desactivar usuario:', error);
        res.status(500).json({ success: false, message: 'Error interno al cambiar estado del usuario' });
    } finally {
        // Liberar el cliente al pool
        cliente.release();
    }
};

// 1.5 Listar Usuarios
const listarUsuarios = async (req, res) => {
    try {
        // En una implementación completa, aquí extraerías page y limit de req.query para el offset
        const result = await db.query(
            `SELECT id_usuario, id_empleado, id_estacion, nombre_completo, correo, rol, estado 
             FROM usuarios ORDER BY id_usuario DESC`
        );

        const formatedData = result.rows.map(user => ({
            id_usuario: String(user.id_usuario),
            id_empleado: String(user.id_empleado),
            id_estacion: String(user.id_estacion),
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