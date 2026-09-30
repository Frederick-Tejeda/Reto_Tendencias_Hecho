const { Resend } = require('resend');
const twilio = require('twilio');
const db = require("../config/db")
// const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const enviarTicket = async (req, res) => {
    const { ticketId } = req.params;

    try {
        const ticketInfo = await db.query('SELECT * FROM tickets WHERE id_ticket=$1', [ticketId])
        if(ticketInfo.rows.length == 0) res.status(400).json({success: false, message: "El id del ticket provisto no es valido"});

        const resultQuery = await db.query('SELECT correo, telefono_movil, nombre_completo FROM empleados WHERE id_empleado=$1', [ticketInfo.rows[0].id_empleado])
        if(resultQuery.rows.length == 0) res.status(400).json({success: false, message: "El id_empleado del ticket provisto no funciona debidamente"});

        const [destinatarioEmail, numeroTelefono, nombreCompleto] = [resultQuery.rows[0].correo, resultQuery.rows[0].telefono_movil, resultQuery.rows[0].nombre_completo]

        // // 1. Agrupar los datos exigidos por el RF-07 en el payload
        // const payloadQR = {
        //     ticketId: ticketInfo.rows[0].id_ticket,
        //     secuencia: ticketInfo.rows[0].secuencia,
        //     solicitudId: ticketInfo.rows[0].id_solicitud,
        //     empleadoId: ticketInfo.rows[0].id_empleado,
        //     vehiculoId: ticketInfo.rows[0].id_vehiculo,
        //     departamentoId: ticketInfo.rows[0].id_departamento,
        //     cantidadAutorizada: ticketInfo.rows[0].cantidad_autorizada,
        //     tipoCombustible: ticketInfo.rows[0].tipo_combustible,
        //     fechaCreacion: ticketInfo.rows[0].fecha_creacion,
        //     fechaVencimiento: ticketInfo.rows[0].fecha_vencimiento,
        //     qrHash: ticketInfo.rows[0].qr_hash,
        //     estado: ticketInfo.rows[0].estado,P
        // };

        // // 2. Firmar los datos creando un token de validación con hash SHA-256 (RS-04)
        // const tokenFirmado = jwt.sign(payloadQR, process.env.QR_SECRET_KEY, { 
        //     algorithm: 'HS256' 
        // });

        const urlValidacion = `https://reto-tendencias-hecho.vercel.app/despacho/validar?token=${ticketInfo.rows[0].id_ticket}?qrhash=${ticketInfo.rows[0].qr_hash}`;
        
        // 3. Generar la imagen del QR en Base64 a partir del token seguro
        const qrBase64 = await QRCode.toDataURL(urlValidacion);

        // Envío de correo usando Resend (optimizado para Serverless)
        const base64Data = qrBase64.split(';base64,').pop();
        const { data, error } = await resend.emails.send({
            from: 'FuelPass <onboarding@resend.dev>', // Cambiar por tu dominio verificado en producción
            to: destinatarioEmail,
            subject: `Ticket de Combustible Emitido: ${ticketInfo.rows[0].secuencia}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Hola ${nombreCompleto},</h2>
                    <p>Se ha generado un nuevo ticket de combustible para ti.</p>
                    <ul>
                        <li><strong>Secuencia:</strong> ${ticketInfo.rows[0].secuencia}</li>
                        <li><strong>Vehículo:</strong> ${ticketInfo.rows[0].id_vehiculo}</li>
                        <li><strong>Cantidad:</strong> ${ticketInfo.rows[0].cantidad_autorizada} galones</li>
                        <li><strong>Combustible:</strong> ${ticketInfo.rows[0].tipo_combustible}</li>
                        <li><strong>Vence:</strong> ${ticketInfo.rows[0].fecha_vencimiento}</li>
                    </ul>
                    <p>Presenta el código QR adjunto a este correo al despachador.</p>
                </div>
            `,
            attachments: [
                {
                    filename: `QR-${ticketInfo.rows[0].secuencia}.png`,
                    content: base64Data, // El buffer en base64 limpio
                }
            ]
        });

        if (error) {
            throw new Error(error.message);
        }

        console.log("Correo enviado con éxito. ID:", data.id);

        // Envío de SMS usando Twilio (RF-09)[cite: 1]
        await twilioClient.messages.create({
            body: `FuelPass Ticket ${ticketInfo.rows[0].secuencia}. URL: https://reto-tendencias-hecho.vercel.app/despacho/validar?token=${ticketInfo.rows[0].id_ticket}?qrhash=${ticketInfo.rows[0].qr_hash}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `+1${numeroTelefono}`
        })
        .then((message) => console.log(message))
        .catch((error) => {
            console.log(error);
            throw new Error(error.message);
        });

        console.log("Mensaje enviado");

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