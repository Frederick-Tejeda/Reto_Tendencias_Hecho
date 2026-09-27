const db = require('../config/db');

const registrarAuditoria = (accion, tabla) => {
    return async (req, res, next) => {
        // 1. Captura exhaustiva de la IP en múltiples entornos (Nginx, Vercel, Express nativo, Sockets)
        let ipAddress = req.headers['x-forwarded-for'] || 
                        req.headers['x-real-ip'] || 
                        req.headers['x-vercel-forwarded-for'] ||
                        req.ip || 
                        req.socket?.remoteAddress || 
                        '0.0.0.0';

        // 2. Si hay múltiples IPs en la cabecera (lista separada por comas), tomar solo la IP original del cliente
        if (typeof ipAddress === 'string' && ipAddress.includes(',')) {
            ipAddress = ipAddress.split(',')[0].trim();
        }

        // 3. Cortar el string a 45 caracteres para evitar que un proxy mal configurado rompa el INSERT de la BD
        ipAddress = ipAddress.substring(0, 45);

        const userId = req.usuario ? req.usuario.id_usuario : null;
        
        const originalSend = res.send;
        
        res.send = async function (data) {
            res.send = originalSend; 
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    let detalles = `Ruta: ${req.originalUrl} | Método: ${req.method}`;
                    if (req.body && Object.keys(req.body).length > 0) {
                        detalles += ` | Payload: ${JSON.stringify(req.body)}`;
                    }

                    // Se recomienda usar db.pool.query para evitar problemas si db.query no está expuesto directamente
                    await db.pool.query(
                        `INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, direccion_ip, detalles) 
                         VALUES ($1, $2, $3, $4, $5)`,
                        [userId, accion, tabla, ipAddress, detalles]
                    );
                } catch (err) {
                    console.error('Error al registrar auditoría:', err);
                }
            }
            return res.send(data);
        };
        
        next();
    };
};

module.exports = { registrarAuditoria };