const db = require('../config/db');

// Crear un nuevo suplidor
const crearSuplidor = async (req, res) => {
    // Se agregan telefono y correo basándonos en la estructura de la base de datos
    const { rnc, nombre, telefono, correo } = req.body;
    try {
        const query = 'INSERT INTO suplidores (rnc, nombre, telefono, correo) VALUES ($1, $2, $3, $4) RETURNING *';
        const { rows } = await db.query(query, [rnc, nombre, telefono, correo]);
        res.status(201).json({ mensaje: 'Suplidor creado con éxito', suplidor: rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'El RNC o correo ingresado ya existe en el sistema.' });
        }
        res.status(500).json({ error: 'Error al crear el suplidor', detalle: error.message });
    }
};

// Listar suplidores
const listarSuplidores = async (req, res) => {
    const { estado } = req.query; 
    try {
        let query = 'SELECT * FROM suplidores ORDER BY id_suplidor ASC';
        let values = [];

        if (estado !== undefined) {
            query = 'SELECT * FROM suplidores WHERE estado = $1 ORDER BY id_suplidor ASC';
            values = [estado === 'true'];
        }

        const { rows } = await db.query(query, values);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al listar los suplidores', detalle: error.message });
    }
};

// Actualizar o desactivar un suplidor
const actualizarSuplidor = async (req, res) => {
    const { id } = req.params;
    const { rnc, nombre, telefono, correo, estado } = req.body;
    try {
        const query = `
            UPDATE suplidores 
            SET rnc = COALESCE($1, rnc), 
                nombre = COALESCE($2, nombre), 
                telefono = COALESCE($3, telefono),
                correo = COALESCE($4, correo),
                estado = COALESCE($5, estado) 
            WHERE id_suplidor = $6 
            RETURNING *`;
            
        const { rows } = await db.query(query, [rnc, nombre, telefono, correo, estado, id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Suplidor no encontrado' });
        }
        res.status(200).json({ mensaje: 'Suplidor actualizado', suplidor: rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'El RNC o correo ingresado ya está asignado a otro suplidor.' });
        }
        res.status(500).json({ error: 'Error al actualizar el suplidor', detalle: error.message });
    }
};

module.exports = { crearSuplidor, listarSuplidores, actualizarSuplidor };