const db = require('../config/db');

// Crear una nueva estación
const crearEstacion = async (req, res) => {
    const { nombre, ubicacion } = req.body;
    try {
        const query = 'INSERT INTO estaciones (nombre, ubicacion, estado) VALUES ($1, $2, $3) RETURNING *';
        const { rows } = await db.query(query, [nombre, ubicacion, true]);
        res.status(201).json({ mensaje: 'Estación creada con éxito', estacion: rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la estación', detalle: error.message });
    }
};

// Listar estaciones (con filtro opcional por estado)
const listarEstaciones = async (req, res) => {
    // Si pasas ?estado=true o ?estado=false en la URL, filtrará los resultados
    const { estado } = req.query; 
    try {
        let query = 'SELECT * FROM estaciones ORDER BY id_estacion ASC';
        let values = [];

        if (estado !== undefined) {
            query = 'SELECT * FROM estaciones WHERE estado = $1 ORDER BY id_estacion ASC';
            values = [estado === 'true'];
        }

        const { rows } = await db.query(query, values);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al listar las estaciones', detalle: error.message });
    }
};

// Actualizar una estación (Editar datos y/o cambiar estado)
const actualizarEstacion = async (req, res) => {
    const { id } = req.params;
    const { nombre, ubicacion, estado } = req.body;
    try {
        // COALESCE permite actualizar solo los campos que vengan en el body
        const query = `
            UPDATE estaciones 
            SET nombre = COALESCE($1, nombre), 
                ubicacion = COALESCE($2, ubicacion), 
                estado = COALESCE($3, estado) 
            WHERE id_estacion = $4 
            RETURNING *`;
            
        const { rows } = await db.query(query, [nombre, ubicacion, estado, id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Estación no encontrada' });
        }
        res.status(200).json({ mensaje: 'Estación actualizada', estacion: rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar la estación', detalle: error.message });
    }
};

module.exports = { crearEstacion, listarEstaciones, actualizarEstacion };