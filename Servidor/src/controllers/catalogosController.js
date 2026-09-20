const db = require('../config/db');

// ==========================================
// 2.1 y 2.2 DEPARTAMENTOS
// ==========================================
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

// ==========================================
// 2.3 y 2.4 EMPLEADOS
// ==========================================
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

// ==========================================
// 2.5 y 2.6 VEHÍCULOS
// ==========================================
const crearVehiculo = async (req, res) => {
    const { licensePlate, internalCode, brand, model, year, type, departmentId, tankCapacityGal, odometerKm, status } = req.body;
    try {
        await db.query(
            `INSERT INTO vehiculos (placa, ficha_interna, marca, modelo, anio, tipo, id_departamento, capacidad_tanque, kilometros, estado) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [licensePlate, internalCode, brand, model, year, type, departmentId, tankCapacityGal, odometerKm, status]
        );
        res.status(201).json({ success: true, message: 'Vehículo creado satisfactoriamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear vehículo' });
    }
};

const listarVehiculos = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                v.id_vehiculo as id, 
                v.placa as "licensePlate", 
                v.ficha_interna as "internalCode",
                d.nombre as department,
                v.estado as status
            FROM vehiculos v
            LEFT JOIN departamentos d ON v.id_departamento = d.id_departamento
            ORDER BY v.id_vehiculo DESC;
        `);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al listar vehículos' });
    }
};

const modificarVehiculo = async (req, res) => {
    const { id } = req.params;
    const { odometerKm, status } = req.body;
    try {
        await db.query(`UPDATE vehiculos SET kilometros = COALESCE($1, kilometros), estado = COALESCE($2, estado) WHERE id_vehiculo = $3`, 
            [odometerKm, status, id]);
        res.status(200).json({ success: true, message: 'Vehículo modificado satisfactoriamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar vehículo' });
    }
};

module.exports = {
    crearDepartamento, listarDepartamentos, modificarDepartamento,
    crearEmpleado, listarEmpleados, modificarEmpleado,
    crearVehiculo, listarVehiculos, modificarVehiculo
};