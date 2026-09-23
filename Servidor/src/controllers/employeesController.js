const db = require('../config/db');

const crearEmpleado = async (req, res) => {
    const { employeeCode, fullName, identificationCard, departmentId, position, email, mobilePhone, status } = req.body;
    try {
        await db.query(
            `INSERT INTO empleados (codigo_empleado, nombre_completo, cedula, id_departamento, cargo, correo, telefono_movil, estado) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [employeeCode, fullName, identificationCard, departmentId, position, email, mobilePhone, status]
        );
        res.status(201).json({ success: true, message: 'Empleado creado satisfactoriamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear empleado' });
    }
};

const listarEmpleados = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                e.id_empleado as id, 
                e.codigo_empleado as "employeeCode", 
                e.nombre_completo as "fullName",
                e.estado as status,
                d.id_departamento as "dept_id", 
                d.nombre as "dept_name"
            FROM empleados e
            LEFT JOIN departamentos d ON e.id_departamento = d.id_departamento
            ORDER BY e.id_empleado DESC;
        `);

        // Mapeamos para anidar el objeto 'department' como lo pide el contrato JSON
        const data = result.rows.map(row => ({
            id: row.id,
            employeeCode: row.employeeCode,
            fullName: row.fullName,
            department: { id: row.dept_id, name: row.dept_name },
            status: row.status
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al listar empleados' });
    }
};

const modificarEmpleado = async (req, res) => {
    const { id } = req.params;
    const { position, status } = req.body;
    try {
        await db.query(`UPDATE empleados SET cargo = COALESCE($1, cargo), estado = COALESCE($2, estado) WHERE id_empleado = $3`, 
            [position, status, id]);
        res.status(200).json({ success: true, message: 'Empleado modificado satisfactoriamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar empleado' });
    }
};

module.exports = { crearEmpleado, listarEmpleados, modificarEmpleado };
