const db = require('../config/db');
const crypto = require('crypto');

// ==========================================
// 3.4 Aprobación y Emisión de Ticket Digital
// ==========================================
const emitirTicket = async (req, res) => {
    const { requestId, approvedBy } = req.body;
    
    try {
        await db.query('BEGIN'); // Iniciamos transacción manual para asegurar integridad

        // 1. Obtener datos de la solicitud
        const solResult = await db.query(`
            SELECT s.*, d.nombre as depto_nombre 
            FROM solicitudes s 
            JOIN departamentos d ON s.id_departamento = d.id_departamento 
            WHERE s.id_solicitud = $1 AND s.estado != 'Aprobada'
        `, [requestId]);

        if (solResult.rows.length === 0) throw new Error('Solicitud no encontrada o ya procesada');
        const sol = solResult.rows[0];

        // 2. Generar Secuencia y UUID nativo
        const seqResult = await db.query(`SELECT nextval('ticket_seq') as seq`);
        const numSecuencia = String(seqResult.rows[0].seq).padStart(6, '0');
        const sequentialId = `COM-2026-${numSecuencia}`;

        // 3. Generar Hash Criptográfico (RS-04)
        const rawData = `${requestId}|${sequentialId}|${sol.id_empleado}|${sol.id_vehiculo}|${sol.cantidad_autorizada}`;
        const qrPayloadHash = crypto.createHash('sha256').update(rawData).digest('hex');

        // 4. Insertar Ticket
        const ticketResult = await db.query(`
            INSERT INTO tickets (secuencia, id_solicitud, id_empleado, id_vehiculo, id_departamento, cantidad_autorizada, tipo_combustible, fecha_vencimiento, qr_hash, estado) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Enviado') 
            RETURNING id_ticket
        `, [sequentialId, requestId, sol.id_empleado, sol.id_vehiculo, sol.id_departamento, sol.cantidad_autorizada, sol.tipo_combustible, sol.fecha_vencimiento, qrPayloadHash]);

        const uuid = ticketResult.rows[0].id_ticket;

        // 5. Actualizar solicitud y registrar auditoría
        await db.query(`UPDATE solicitudes SET estado = 'Aprobada' WHERE id_solicitud = $1`, [requestId]);
        await db.query(`INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles) VALUES ($1, 'EMITIR_TICKET', 'tickets', $2)`, 
            [approvedBy, `Ticket generado: ${sequentialId}`]);

        await db.query('COMMIT');

        res.status(201).json({
            success: true,
            data: {
                uuid: uuid,
                sequentialId: sequentialId,
                department: sol.depto_nombre,
                fuelType: sol.tipo_combustible,
                qrPayloadHash: qrPayloadHash,
                status: "Generado y Enviado"
            }
        });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error al emitir ticket:', error);
        res.status(400).json({ success: false, message: error.message || 'Error al emitir el ticket' });
    }
};

// ==========================================
// 3.5 Listar y Consultar Estado de Tickets
// ==========================================
const listarTickets = async (req, res) => {
    const { status, employeeId } = req.query;
    
    try {
        let query = `SELECT id_ticket as uuid, secuencia as "sequentialId", fecha_vencimiento as "expirationDate", estado as status FROM tickets WHERE 1=1`;
        const params = [];

        if (status) {
            params.push(status);
            query += ` AND estado = $${params.length}`;
        }
        if (employeeId) {
            params.push(employeeId);
            query += ` AND id_empleado = $${params.length}`;
        }

        query += ` ORDER BY fecha_creacion DESC`;
        
        const result = await db.query(query, params);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al consultar tickets' });
    }
};

// ==========================================
// 3.6 Anulación de Ticket
// ==========================================
const anularTicket = async (req, res) => {
    const { uuid } = req.params;
    const { reason } = req.body; // Motivo para la auditoría
    
    try {
        const idUsuarioLogueado = req.usuario?.id || req.usuario?.id_usuario;

        // Validación de seguridad por si el token no contenía el ID
        if (!idUsuarioLogueado) {
            return res.status(401).json({ 
                success: false, 
                message: 'No autorizado. No se pudo identificar al usuario en la sesión.' 
            });
        }

        // Invocamos el procedimiento almacenado que ya creamos en pasos anteriores
        await db.query(`CALL anular_ticket($1, $2, $3)`, [uuid, idUsuarioLogueado, reason]);

        res.status(200).json({ success: true, message: 'Ticket anulado satisfactoriamente' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'No se pudo anular el ticket' });
    }
};

const listarTicketPorIdEmpleado = async (req, res) => {
    const { idEmpleado } = req.params;

    if(isNaN(Number(idEmpleado)) || Number(idEmpleado) <= 0) {
        return res.status(400).json({ success: false, message: 'ID de empleado es requerido' });
    }

    try {
        let queryValidateEmpleado = `SELECT 1 FROM empleados WHERE id_empleado = $1`;
        const validateEmpleadoResult = await db.query(queryValidateEmpleado, [idEmpleado]);
        
        if(validateEmpleadoResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
        }

        let query = `SELECT id_ticket as uuid, secuencia as "sequentialId", fecha_vencimiento as "expirationDate", estado as status FROM tickets WHERE id_empleado = $1 ORDER BY fecha_creacion DESC`;
        
        const result = await db.query(query, [idEmpleado]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al consultar tickets' });
    }
};

module.exports = {
    emitirTicket,
    listarTickets,
    anularTicket,
    listarTicketPorIdEmpleado
};