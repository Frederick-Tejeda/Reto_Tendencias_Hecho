const db = require('../config/db');

// RF-05: Crear una nueva solicitud de combustible
const crearSolicitud = async (req, res) => {
    const {
        employeeId,
        vehicleId,
        departmentId,
        authorizedQuantityGal,
        fuelType,
        requestType,
        requestDate,
        expirationDate,
        recurrence
    } = req.body;

    try {
        // El estado inicial depende del tipo de solicitud exigido por el DTO
        let estadoInicial = 'Pendiente';
        if (requestType === 'Recurrente' || requestType === 'Automática') {
            estadoInicial = 'Programada';
        }

        // Extraer valores de recurrencia si existen en el body
        let frecuencia = null;
        let diaSemana = null;
        let fechaInicio = null;
        let fechaFin = null;

        if (requestType === 'Recurrente' && recurrence) {
            frecuencia = recurrence.frequency;
            diaSemana = recurrence.dayOfWeek;
            fechaInicio = recurrence.startDate;
            fechaFin = recurrence.endDate;
        }

        const query = `
            INSERT INTO solicitudes (
                id_empleado, id_vehiculo, id_departamento, 
                cantidad_autorizada, tipo_combustible, tipo_solicitud,
                fecha_solicitud, fecha_vencimiento, estado,
                frecuencia, dia_semana, fecha_inicio_recurrencia, fecha_fin_recurrencia
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            ) RETURNING id_solicitud;
        `;

        const values = [
            employeeId, 
            vehicleId, 
            departmentId,
            authorizedQuantityGal, 
            fuelType, 
            requestType || 'Manual',
            requestDate || new Date(), 
            expirationDate, 
            estadoInicial,
            frecuencia, 
            diaSemana, 
            fechaInicio, 
            fechaFin
        ];

        const result = await db.query(query, values);
        const nuevaSolicitudId = result.rows[0].id_solicitud;

        // Respuesta estructurada según el DTO (201 Created)
        res.status(201).json({
            success: true,
            data: {
                requestId: nuevaSolicitudId,
                status: estadoInicial
            }
        });

    } catch (error) {
        console.error('Error al crear solicitud:', error);
        res.status(500).json({ success: false, message: 'Error interno al procesar la solicitud' });
    }
};

// Listar Solicitudes
const listarSolicitudes = async (req, res) => {
    try {
        const query = `
            SELECT 
                s.id_solicitud AS "requestId", 
                e.nombre_completo AS "employeeName", 
                v.ficha_interna AS "vehicleCode", 
                s.fecha_solicitud AS "requestDate", 
                s.estado AS "status"
            FROM solicitudes s
            JOIN empleados e ON s.id_empleado = e.id_empleado
            JOIN vehiculos v ON s.id_vehiculo = v.id_vehiculo
            ORDER BY s.fecha_solicitud DESC
        `;
        
        const result = await db.query(query);

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