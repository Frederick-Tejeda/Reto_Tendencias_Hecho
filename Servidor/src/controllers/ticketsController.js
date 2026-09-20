const crypto = require('crypto');
const db = require('../config/db');
const qrService = require('../service/qrService');

// RF-06 y RF-11: Aprobación de solicitud y emisión del ticket
const aprobarSolicitud = async (req, res) => {
    const { id_solicitud } = req.params;
    const id_usuario_supervisor = req.usuario.id_usuario;

    try {
        // 1. Obtener los datos de la solicitud pendiente
        const resultSol = await db.query(
            `SELECT id_empleado, id_vehiculo, cantidad_autorizada, fecha_vencimiento 
             FROM solicitudes 
             WHERE id_solicitud = $1 AND estado = 'Pendiente'`,
            [id_solicitud]
        );

        if (resultSol.rows.length === 0) {
            return res.status(404).json({ error: 'La solicitud no existe o ya no está pendiente.' });
        }

        const solicitud = resultSol.rows[0];

        // 2. Generar UUID y Secuencia (RF-08)[cite: 1]
        const id_ticket = crypto.randomUUID();
        const anio = new Date().getFullYear();
        // Genera un formato como COM-2026-000005
        const secuencia = `COM-${anio}-${String(id_solicitud).padStart(6, '0')}`; 

        // 3. Generar el Hash Criptográfico del código QR (RF-07)[cite: 1]
        const ticketDataParaHash = {
            ticketId: id_ticket,
            secuencia: secuencia,
            empleado: solicitud.id_empleado,
            vehiculo: solicitud.id_vehiculo,
            cantidad: solicitud.cantidad_autorizada,
            fechaEmision: new Date().toISOString(),
            fechaExpiracion: new Date(solicitud.fecha_vencimiento).toISOString()
        };

        const { payload, hash } = qrService.generarHashTicket(ticketDataParaHash);

        // 4. Ejecutar la transacción en PostgreSQL
        await db.query(
            'CALL aprobar_solicitud_generar_ticket($1, $2, $3, $4, $5)',
            [id_ticket, id_solicitud, secuencia, hash, id_usuario_supervisor]
        );

        // 5. Devolver el resultado (En un caso real, aquí enviaríamos el email/SMS - RF-09)[cite: 1]
        res.status(201).json({
            mensaje: 'Solicitud aprobada y Ticket digital generado exitosamente.',
            ticket: {
                id_ticket,
                secuencia,
                estado: 'Creado',
                codigo_qr_raw: payload, // Datos planos
                firma_seguridad: hash   // Hash inalterable
            }
        });

    } catch (error) {
        console.error('Error al generar el ticket:', error);
        res.status(500).json({ error: 'Error interno al procesar la aprobación.' });
    }
};

module.exports = { aprobarSolicitud };