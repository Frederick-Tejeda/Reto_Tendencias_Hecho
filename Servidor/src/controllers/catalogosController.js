const db = require('../config/db');

// RF-04: Crear Departamento
const crearDepartamento = async (req, res) => {
    const { nombre } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO departamentos (nombre) VALUES ($1) RETURNING *',
            [nombre]
        );
        res.status(201).json({ mensaje: 'Departamento creado', departamento: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el departamento.' });
    }
};

// RF-02: Crear Empleado[cite: 1]
const crearEmpleado = async (req, res) => {
    const { codigo_empleado, nombre_completo, cedula, id_departamento, cargo, correo, telefono_movil } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO empleados (codigo_empleado, nombre_completo, cedula, id_departamento, cargo, correo, telefono_movil) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [codigo_empleado, nombre_completo, cedula, id_departamento, cargo, correo, telefono_movil]
        );
        res.status(201).json({ mensaje: 'Empleado creado', empleado: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el empleado. Verifica que el departamento exista.' });
    }
};

// RF-03: Crear Vehículo[cite: 1]
const crearVehiculo = async (req, res) => {
    const { placa, ficha_interna, marca, modelo, anio, tipo, id_departamento, capacidad_tanque } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO vehiculos (placa, ficha_interna, marca, modelo, anio, tipo, id_departamento, capacidad_tanque) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [placa, ficha_interna, marca, modelo, anio, tipo, id_departamento, capacidad_tanque]
        );
        res.status(201).json({ mensaje: 'Vehículo creado', vehiculo: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el vehículo.' });
    }
};

module.exports = { crearDepartamento, crearEmpleado, crearVehiculo };