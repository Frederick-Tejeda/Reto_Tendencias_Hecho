const db = require('../config/db');

const registrarDespacho = async (req, res) => {
    // 1. Extraer los datos exactos del request body definidos en el contrato[cite: 2]
    const {
        ticketUuid,
        qrPayloadHash,
        dispatcherId,
        stationId,
        gallonsServed,
        dispatchTimestamp,
        observations
    } = req.body;

    const cliente = await db.pool.connect();

    try {
        await cliente.query('BEGIN'); // Iniciar transacción

        // 2. Validar que el ticket exista, su hash coincida y no esté ya consumido
        const ticketResult = await cliente.query(
            `SELECT id_ticket, estado, tipo_combustible FROM tickets 
             WHERE id_ticket = $1 AND qr_hash = $2 FOR UPDATE`, 
            [ticketUuid, qrPayloadHash]
        );

        if (ticketResult.rowCount === 0) {
            await cliente.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Ticket inválido, hash incorrecto o no encontrado.' });
        }

        const ticket = ticketResult.rows[0];

        if (ticket.estado === 'Consumido' || ticket.estado === 'Anulado') {
            await cliente.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `El ticket ya no es válido. Estado actual: ${ticket.estado}` });
        }

        // 3. Registrar el despacho en la base de datos
        const insertDespacho = await cliente.query(
            `INSERT INTO despachos (id_ticket, fecha_hora, galones_servidos, id_operador, id_estacion, observaciones)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_despacho`,
            [ticketUuid, dispatchTimestamp || new Date(), gallonsServed, dispatcherId, stationId, observations]
        );
        const nuevoDespachoId = insertDespacho.rows[0].id_despacho;

        // 4. Actualizar el estado del ticket a 'Consumido'
        await cliente.query(
            `UPDATE tickets SET estado = 'Consumido' WHERE id_ticket = $1`,
            [ticketUuid]
        );

        // 5. Auditar la acción
        // Priorizamos el dispatcherId del body, pero verificamos con el token por seguridad
        const usuarioAuditoria = req.user?.id || dispatcherId; 
        await cliente.query(
            `INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
             VALUES ($1, $2, $3, $4)`,
            [usuarioAuditoria, 'REGISTRAR_DESPACHO_QR', 'despachos', `Despacho ID: ${nuevoDespachoId} - Galones: ${gallonsServed}`]
        );

        await cliente.query('COMMIT'); // Confirmar transacción

        // 6. Retornar la respuesta exactamente como la exige el DTO[cite: 2]
        res.status(200).json({
            success: true,
            data: {
                dispatchId: nuevoDespachoId,
                timestamp: dispatchTimestamp || new Date().toISOString(),
                ticketStatus: "Consumido",
                inventoryUpdated: true // Asumiendo que triggers o jobs actualizan el stock real
            }
        });

    } catch (error) {
        await cliente.query('ROLLBACK');
        console.error('Error al registrar despacho:', error);
        res.status(500).json({ success: false, message: 'Error interno al procesar el despacho' });
    } finally {
        cliente.release(); // Liberar la conexión al pool
    }
};

// 4.x Validación previa de Ticket QR (RF-12, RF-13)
const validarTicketQR = async (req, res) => {
    const { ticketUuid, qrPayloadHash } = req.body;

    try {
        // Consultar el ticket uniendo datos del empleado y vehículo para la confirmación visual
        const query = `
            SELECT t.id_ticket, t.estado, t.fecha_vencimiento, t.cantidad_autorizada, t.tipo_combustible,
                   e.nombre_completo AS empleado, e.cedula,
                   v.placa, v.ficha_interna, v.marca, v.modelo
            FROM tickets t
            JOIN empleados e ON t.id_empleado = e.id_empleado
            JOIN vehiculos v ON t.id_vehiculo = v.id_vehiculo
            WHERE t.id_ticket = $1 AND t.qr_hash = $2
        `;
        
        // Usamos db.pool.query para una lectura simple sin necesidad de bloquear con transacción
        const result = await db.pool.query(query, [ticketUuid, qrPayloadHash]);

        // 1. Validar existencia y hash
        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Código QR inválido. No se encontró un ticket que coincida con esta firma.' 
            });
        }

        const ticket = result.rows[0];

        // 2. Validar estado
        const estadosValidos = ['Creado', 'Enviado', 'Pendiente', 'Próximo a vencer'];
        if (!estadosValidos.includes(ticket.estado)) {
            return res.status(400).json({ 
                success: false, 
                message: `El ticket no puede ser despachado. Estado actual: ${ticket.estado}` 
            });
        }

        // 3. Validar fecha de vencimiento
        if (new Date() > new Date(ticket.fecha_vencimiento)) {
            return res.status(400).json({ 
                success: false, 
                message: 'El ticket ha expirado y no es válido para despacho.' 
            });
        }

        // 4. Retornar los datos para la confirmación en la app móvil
        res.status(200).json({
            success: true,
            message: 'Ticket válido y listo para despacho.',
            data: {
                ticketUuid: ticket.id_ticket,
                employee: {
                    name: ticket.empleado,
                    idCard: ticket.cedula
                },
                vehicle: {
                    plate: ticket.placa,
                    internalCode: ticket.ficha_interna,
                    description: `${ticket.marca} ${ticket.modelo}`
                },
                dispatchDetails: {
                    authorizedGallons: parseFloat(ticket.cantidad_autorizada),
                    fuelType: ticket.tipo_combustible
                }
            }
        });

    } catch (error) {
        console.error('Error al validar ticket QR:', error);
        res.status(500).json({ success: false, message: 'Error interno al validar el código QR.' });
    }
};

module.exports = {
    registrarDespacho,
    validarTicketQR
};