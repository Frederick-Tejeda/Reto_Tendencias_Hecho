const db = require('../config/db');
const qrService = require('../service/qrService');

// RF-12 y RF-13: Validación de ticket y registro de despacho
const registrarDespacho = async (req, res) => {
    const { qr_payload, qr_hash, galones_servidos, id_estacion } = req.body;
    const id_operador = req.usuario.id_usuario;

    try {
        // 1. Validar la firma criptográfica (RS-04)[cite: 1]
        // Si alguien alteró la cantidad de galones autorizados en el texto del QR, el hash no coincidirá.
        const esAutentico = qrService.validarFirmaQR(qr_payload, qr_hash);
        
        if (!esAutentico) {
            return res.status(403).json({ 
                error: 'Alerta de Seguridad: El código QR es inválido o ha sido alterado.' 
            });
        }

        // 2. Extraer el Ticket ID del payload
        // Sabemos que el payload lo armamos como: ticketId|secuencia|empleado|...
        const id_ticket = qr_payload.split('|')[0];

        // 3. Registrar el despacho en PostgreSQL (esto valida el estado, fecha y descuenta inventario)
        await db.query(
            'CALL registrar_despacho($1, $2, $3, $4)',
            [id_ticket, galones_servidos, id_operador, id_estacion]
        );

        res.status(200).json({ 
            mensaje: 'Combustible despachado y descontado del inventario exitosamente.' 
        });

    } catch (error) {
        console.error('Error al registrar despacho:', error);
        // Devolvemos el mensaje de error exacto que lanza PostgreSQL (ej. "El ticket se encuentra vencido")
        res.status(400).json({ error: error.message || 'Error interno al procesar el despacho.' });
    }
};

module.exports = { registrarDespacho };