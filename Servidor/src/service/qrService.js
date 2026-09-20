const crypto = require('crypto');

/**
 * Genera un hash SHA-256 único basado en los datos del ticket.
 * Cumple con los requerimientos de seguridad para evitar falsificaciones.
 */
const generarHashTicket = (ticketData) => {
    // Extraemos los campos exigidos por el RF-07 para protegerlos
    const {
        ticketId,
        secuencia,
        empleado,
        vehiculo,
        cantidad,
        fechaEmision,
        fechaExpiracion
    } = ticketData;

    // Concatenamos los datos en un string plano (el payload)
    const payload = `${ticketId}|${secuencia}|${empleado}|${vehiculo}|${cantidad}|${fechaEmision}|${fechaExpiracion}`;

    // Generamos el hash SHA-256 usando el secreto del entorno como "sal" de seguridad
    const secret = process.env.JWT_SECRET || 'firma_secreta_default';
    
    const hash = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return {
        payload,
        hash
    };
};

/**
 * Valida si un código QR escaneado es auténtico comparando su hash.
 */
const validarFirmaQR = (payloadOriginal, hashRecibido) => {
    const secret = process.env.JWT_SECRET || 'firma_secreta_default';
    
    const hashCalculado = crypto
        .createHmac('sha256', secret)
        .update(payloadOriginal)
        .digest('hex');

    // Retorna true si los hashes coinciden, garantizando que el ticket no fue alterado
    return hashCalculado === hashRecibido;
};

module.exports = {
    generarHashTicket,
    validarFirmaQR
};