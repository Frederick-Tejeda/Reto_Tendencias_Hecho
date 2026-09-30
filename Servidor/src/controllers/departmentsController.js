const db = require('../config/db');

const crearDepartamento = async (req, res) => {
    const { code, name, description } = req.body;
    try {
        await db.query(
            `INSERT INTO departamentos (codigo, nombre, descripcion) VALUES ($1, $2, $3)`,
            [code, name, description]
        );
        res.status(201).json({ success: true, message: 'Departamento creado satisfactoriamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear departamento' });
    }
};

const listarDepartamentos = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                d.id_departamento as id, 
                d.codigo as code, 
                d.nombre as name,
                COUNT(DISTINCT e.id_empleado)::int as "employeeCount",
                COUNT(DISTINCT v.id_vehiculo)::int as "vehicleCount"
            FROM departamentos d
            LEFT JOIN empleados e ON d.id_departamento = e.id_departamento
            LEFT JOIN vehiculos v ON d.id_departamento = v.id_departamento
            GROUP BY d.id_departamento
            ORDER BY d.id_departamento DESC;
        `);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al listar departamentos' });
    }
};

const modificarDepartamento = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body; // Según tu JSON, solo envía name, pero podrías usar COALESCE para más campos
    try {
        await db.query(`UPDATE departamentos SET nombre = COALESCE($1, nombre) WHERE id_departamento = $2`, [name, id]);
        res.status(200).json({ success: true, message: 'Departamento actualizado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar departamento' });
    }
};

module.exports = { crearDepartamento, listarDepartamentos, modificarDepartamento };