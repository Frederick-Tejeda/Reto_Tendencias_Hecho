const { Resend } = require('resend');
const twilio = require('twilio');
const db = require("../config/db")
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const enviarTicket = async (req, res) => {
    const { ticketId } = req.params;
    const { destinatarioEmail, numeroTelefono } = req.body;

    try {

        const ticketInfo = await db.query('SELECT * FROM ticket WHERE id_ticket=$1', [ticketId])

        if(ticketInfo.rows.length == 0) res.status(400).send({success: false, message: "El id del ticket provisto no es valido"});

        // 1. Agrupar los datos exigidos por el RF-07 en el payload
        const payloadQR = {
            ticketId: ticketInfo.rows[0].idTicket,
            secuencia: ticketInfo.rows[0].secuencia,
            solicitudId: ticketInfo.rows[0].id_solicitud,
            empleadoId: ticketInfo.rows[0].id_empleado,
            vehiculoId: ticketInfo.rows[0].id_vehiculo,
            cantidad: ticketInfo.rows[0].id_departamento,
            fechaEmision: ticketInfo.rows[0].fechaEmision,
            fechaExpiracion: ticketInfo.rows[0].fechaExpiracion
        };

        // 2. Firmar los datos creando un token de validación con hash SHA-256 (RS-04)
        const tokenFirmado = jwt.sign(payloadQR, process.env.QR_SECRET_KEY, { 
            algorithm: 'HS256' 
        });

        // 3. Generar la imagen del QR en Base64 a partir del token seguro
        const qrBase64 = await QRCode.toDataURL(tokenFirmado);

        // Envío de correo usando Resend (optimizado para Serverless)
        const base64Data = ticketInfo.rows[0].qr_hash.split(';base64,').pop();
        await resend.emails.send({
            from: 'Gestión INTEC <onboarding@resend.dev>',
            to: destinatarioEmail,
            subject: `Ticket de Combustible: ${ticketInfo.rows[0].secuencia}`,
            html: '<p>Adjunto el ticket para el despacho de combustible.</p>',
            attachments: [{
                filename: 'ticket-qr.png',
                content: base64Data,
            }]
        });

        // Envío de SMS usando Twilio (RF-09)[cite: 1]
        await twilioClient.messages.create({
            body: `Combustible INTEC: Ticket ${ticketInfo.rows[0].secuencia} aprobado. Ver aquí: https://tu-dominio.com/t/${ticketInfo.rows[0].id_ticket}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: numeroTelefono
        });

        console.log("Notificaciones enviadas");
        res.status(200).json({
            success: true,
            message: "Notificacion enviada satisfactoriamente"
        })
    } catch (error) {
        console.error("Error en la integración de notificaciones:", error);
        res.status(500).json({
            success: false,
            message: "Fallo al enviar notificacion"
        })
    }
};

module.exports = { enviarTicket };