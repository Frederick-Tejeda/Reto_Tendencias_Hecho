const db = require('../config/db');

// RF-18: Funcionalidad para confirmar despachos e inventario final
const registrarCierreDiario = async (req, res) => {
    const { fecha, inventario_final_fisico } = req.body;
    
    // El ID de quien realiza el cierre se extrae del token de seguridad
    const id_usuario_auditor = req.usuario.id_usuario;

    try {
        // Ejecutamos el procedimiento almacenado que calcula las diferencias automáticamente
        await db.query(
            'CALL generar_cierre_diario($1, $2, $3)',
            [fecha, inventario_final_fisico, id_usuario_auditor]
        );

        res.status(201).json({ 
            mensaje: 'Cierre diario procesado y registrado en auditoría correctamente.',
            fecha_cierre: fecha
        });

    } catch (error) {
        console.error('Error al generar cierre diario:', error);
        // Si el procedimiento detecta que ya existe un cierre para esa fecha, devolverá el mensaje de error definido en PostgreSQL
        res.status(400).json({ 
            error: error.message || 'Error interno al procesar el cierre diario.' 
        });
    }
};

module.exports = { registrarCierreDiario };
