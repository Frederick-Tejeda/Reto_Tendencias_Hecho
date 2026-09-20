const db = require('../config/db');

// RF-16: Recepción de Combustible[cite: 1]
const registrarRecepcion = async (req, res) => {
    const { id_tanque, volumen, rnc_suplidor, nombre_suplidor, factura } = req.body;
    const id_usuario = req.usuario.id_usuario;

    try {
        await db.query(
            'CALL recepcion_combustible($1, $2, $3, $4, $5, $6)',
            [id_tanque, volumen, rnc_suplidor, nombre_suplidor, factura, id_usuario]
        );

        res.status(201).json({ mensaje: 'Recepción de combustible registrada. Inventario actualizado.' });
    } catch (error) {
        console.error('Error en recepción:', error);
        res.status(500).json({ error: 'Error al registrar la entrada de combustible.' });
    }
};

// RF-14: Ajustes manuales de inventario (Positivos o Negativos)[cite: 1]
const registrarAjuste = async (req, res) => {
    const { id_tanque, tipo_movimiento, volumen, motivo } = req.body;
    const id_usuario = req.usuario.id_usuario;

    try {
        await db.query(
            'CALL ajustar_inventario($1, $2, $3, $4, $5)',
            [id_tanque, tipo_movimiento, volumen, id_usuario, motivo]
        );

        res.status(201).json({ mensaje: `Ajuste ${tipo_movimiento} aplicado al inventario correctamente.` });
    } catch (error) {
        console.error('Error en ajuste:', error);
        res.status(400).json({ error: error.message || 'Error al ajustar el inventario.' });
    }
};

module.exports = { registrarRecepcion, registrarAjuste };