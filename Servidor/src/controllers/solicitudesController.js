const db = require('../config/db');

// RF-05: Crear una nueva solicitud de combustible
const crearSolicitud = async (req, res) => {
    // 1. Extraemos los datos del payload del body
    const { vehicleId, departmentId, authorizedQuantityGal, fuelType, requestDate, expirationDate } = req.body;
    
    // 2. Extraemos la identidad confiable desde el Token decodificado por el middleware
    const usuarioAuth = req.usuario; 
    const id_usuario_creador = usuarioAuth.id_usuario;

    // 3. Resolución del Beneficiario (id_empleado)
    let id_empleado_beneficiario;

    if (usuarioAuth.rol === 'Solicitante') {
        // Autoservicio: El usuario solo puede pedir combustible para sí mismo
        if (!usuarioAuth.id_empleado) {
            return res.status(403).json({ success: false, message: 'Tu cuenta no está vinculada a un perfil de empleado.' });
        }
        id_empleado_beneficiario = usuarioAuth.id_empleado;
    } else {
        // Delegación: Roles superiores pueden pedir a nombre de otros (ej. enviar id_empleado en el body)
        id_empleado_beneficiario = req.body.employeeId;
        if (!id_empleado_beneficiario) {
            return res.status(400).json({ success: false, message: 'Debe especificar el id_empleado beneficiario.' });
        }
    }

    const d1 = new Date(requestDate);
    const d2 = new Date(expirationDate);

    if(d1 >= d2) res.status(404).json({ success: false, message: 'Fecha de la solicitud debe ser menor a la fecha de expiracion' });

    const cliente = await db.pool.connect();

    try {
        // 4. Llamada al procedimiento almacenado actualizado
        await cliente.query(`
            CALL crear_solicitud_combustible($1, $2, $3, $4, $5, $6, $7)
        `, [
            id_empleado_beneficiario, 
            vehicleId, 
            departmentId, 
            authorizedQuantityGal, 
            fuelType,
            expirationDate, 
            id_usuario_creador
        ]);

        res.status(201).json({ success: true, message: 'Solicitud creada con éxito' });
    } catch (error) {
        await cliente.query('ROLLBACK');
        console.error('Error al crear solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        cliente.release();
    }
};

// Listar Solicitudes
const listarSolicitudes = async (req, res) => {

    const { id_empleado, rol } = req.usuario
    const params = []

    try {

        if(id_empleado){
            const resultQuery = await db.query('SELECT u.rol as rol FROM usuarios u INNER JOIN empleados e ON u.id_empleado = e.id_empleado WHERE e.id_empleado=$1', [id_empleado]);
            if(resultQuery.rows.length == 0 && rol !== "Audiencia") res.status(400).json({success: false, message: "Revisa el id_empleado provisto"})   
        }

        let query = `
            SELECT 
                s.id_solicitud AS "requestId", 
                e.nombre_completo AS "employeeName", 
                v.ficha_interna AS "vehicleCode", 
                s.fecha_solicitud AS "requestDate", 
                s.estado AS "status"
            FROM solicitudes s
            JOIN empleados e ON s.id_empleado = e.id_empleado
            JOIN vehiculos v ON s.id_vehiculo = v.id_vehiculo`;

        console.log({rol: resultQuery.rows[0]?.rol, id_empleado})

        if(resultQuery.rows[0]?.rol == "Solicitante" || id_empleado){
            query += ' WHERE s.id_empleado=$1 ORDER BY s.fecha_solicitud DESC';
            params.push(id_empleado)
        }else{
            query += ' ORDER BY s.fecha_solicitud DESC'
        }
        
        const result = await db.query(query, params);

        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error al listar solicitudes:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
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

module.exports = { crearSolicitud, obtenerSolicitudesPendientes, listarSolicitudes };