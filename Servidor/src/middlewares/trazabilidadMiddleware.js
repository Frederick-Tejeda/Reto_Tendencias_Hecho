const db = require('../config/db');

const registrarAuditoria = (accion, tabla) => {
    return async (req, res, next) => {
        // Capturar la IP original (útil si estás detrás de Nginx/Vercel)
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userId = req.usuario ? req.usuario.id_usuario : null; // Viene del authMiddleware
        
        // Guardar el método 'send' original para interceptar la respuesta y registrar si fue exitosa
        const originalSend = res.send;
        
        res.send = async function (data) {
            res.send = originalSend; // Restaurar el send
            
            // Solo registramos si la petición fue exitosa (2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    let detalles = `Ruta: ${req.originalUrl} | Método: ${req.method}`;
                    if (req.body && Object.keys(req.body).length > 0) {
                        detalles += ` | Payload: ${JSON.stringify(req.body)}`;
                    }

                    await db.query(
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