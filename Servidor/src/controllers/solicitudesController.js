const db = require('../config/db');

// RF-05: Crear una nueva solicitud de combustible
const crearSolicitud = async (req, res) => {
    const { 
        id_empleado, 
        id_vehiculo, 
        id_departamento, 
        cantidad_autorizada, 
        tipo_combustible, 
        fecha_vencimiento 
    } = req.body;
    
    // Extraemos el ID del usuario que hace la petición directamente del token JWT
    const id_usuario_creador = req.usuario.id_usuario; 

    try {
        // Llamamos al procedimiento almacenado en PostgreSQL
        await db.query(
            'CALL crear_solicitud_combustible($1, $2, $3, $4, $5, $6, $7)',
            [id_empleado, id_vehiculo, id_departamento, cantidad_autorizada, tipo_combustible, fecha_vencimiento, id_usuario_creador]
        );
        
        res.status(201).json({ 
            mensaje: 'Solicitud creada con éxito y enviada a revisión del supervisor.' 
        });
    } catch (error) {
        console.error('Error al crear solicitud:', error);
        res.status(500).json({ error: 'Error interno al registrar la solicitud de combustible.' });
    }
};

// Endpoint auxiliar para listar las solicitudes en estado 'Pendiente'
const obtenerSolicitudesPendientes = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.id_solicitud, e.nombre_completo AS empleado, v.placa, v.ficha_interna, 
                   d.nombre AS departamento, s.cantidad_autorizada, s.tipo_combustible, 
                   s.fecha_solicitud, s.fecha_vencimiento
            FROM solicitudes s
            JOIN empleados e ON s.id_empleado = e.id_empleado
            JOIN vehiculos v ON s.id_vehiculo = v.id_vehiculo
            JOIN departamentos d ON s.id_departamento = d.id_departamento
            WHERE s.estado = 'Pendiente'
            ORDER BY s.fecha_solicitud ASC
        `);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener solicitudes pendientes:', error);
        res.status(500).json({ error: 'Error al consultar las solicitudes.' });
    }
};

module.exports = { crearSolicitud, obtenerSolicitudesPendientes };