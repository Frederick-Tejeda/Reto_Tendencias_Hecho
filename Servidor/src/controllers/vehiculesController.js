const db = require('../config/db');

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
                v.marca as brand,
                v.modelo as model,
                v.anio as year,
                v.tipo as type,
                d.id_departamento as department,
                v.capacidad_tanque as tankCapacity,
                v.kilometros as odometerKm,
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

module.exports = { crearVehiculo, listarVehiculos, modificarVehiculo};