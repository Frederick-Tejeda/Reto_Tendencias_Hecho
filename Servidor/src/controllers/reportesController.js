const db = require('../config/db');
const ExcelJS = require('exceljs');

// ==========================================
// 5.1 Dashboard Ejecutivo (RF-22)
// ==========================================
const obtenerDashboard = async (req, res) => {
    try {
        // Ejecutamos consultas en paralelo para maximizar el rendimiento
        const [invRes, despRes, actRes, expRes, deptoRes, vehRes] = await Promise.all([
            db.query(`SELECT existencia_actual FROM inventario WHERE id_tanque = 1`),
            db.query(`SELECT COALESCE(SUM(galones_servidos), 0) as total FROM despachos WHERE DATE(fecha_hora) = CURRENT_DATE`),
            db.query(`SELECT COUNT(*) as total FROM tickets WHERE estado IN ('Enviado', 'Pendiente', 'Próximo a vencer')`),
            db.query(`SELECT COUNT(*) as total FROM tickets WHERE estado = 'Vencido'`),
            db.query(`
                SELECT d.nombre as department, SUM(desp.galones_servidos) as gallons
                FROM despachos desp
                JOIN tickets t ON desp.id_ticket = t.id_ticket
                JOIN departamentos d ON t.id_departamento = d.id_departamento
                GROUP BY d.nombre
            `),
            db.query(`
                SELECT v.ficha_interna as "vehicleCode", SUM(desp.galones_servidos) as gallons
                FROM despachos desp
                JOIN tickets t ON desp.id_ticket = t.id_ticket
                JOIN vehiculos v ON t.id_vehiculo = v.id_vehiculo
                GROUP BY v.ficha_interna
            `)
        ]);

        res.status(200).json({
            success: true,
            data: {
                inventoryActual: Number(invRes.rows[0]?.existencia_actual || 0),
                dispatchedToday: Number(despRes.rows[0].total),
                activeTickets: Number(actRes.rows[0].total),
                expiredTickets: Number(expRes.rows[0].total),
                consumptionByDepartment: deptoRes.rows.map(r => ({ department: r.department, gallons: Number(r.gallons) })),
                consumptionByVehicle: vehRes.rows.map(r => ({ vehicleCode: r.vehicleCode, gallons: Number(r.gallons) }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al generar dashboard' });
    }
};

// ==========================================
// 5.2 Generación de Reportes Filtrables (RF-19, RF-20)
// ==========================================
const generarReporteGeneral = async (req, res) => {
    const { startDate, endDate, departmentId, employeeCode, internalCode, fuelType, status, format } = req.query;

    try {
        // 1. Construcción dinámica del query
        let query = `
            SELECT t.secuencia, e.codigo_empleado, v.ficha_interna, d.nombre as departamento, 
                   t.cantidad_autorizada, t.tipo_combustible, t.estado, t.fecha_creacion
            FROM tickets t
            JOIN empleados e ON t.id_empleado = e.id_empleado
            JOIN vehiculos v ON t.id_vehiculo = v.id_vehiculo
            JOIN departamentos d ON t.id_departamento = d.id_departamento
            WHERE 1=1
        `;
        const params = [];

        // Filtros originales
        if (startDate) { params.push(startDate); query += ` AND t.fecha_creacion >= $${params.length}`; }
        if (endDate) { params.push(endDate); query += ` AND t.fecha_creacion <= $${params.length}`; }
        if (departmentId) { params.push(departmentId); query += ` AND t.id_departamento = $${params.length}`; }
        if (status) { params.push(status); query += ` AND t.estado = $${params.length}`; }

        // Filtros faltantes integrados
        if (employeeCode) { params.push(employeeCode); query += ` AND e.codigo_empleado = $${params.length}`; }
        if (internalCode) { params.push(internalCode); query += ` AND v.ficha_interna = $${params.length}`; }
        if (fuelType) { params.push(fuelType); query += ` AND t.tipo_combustible = $${params.length}`; }

        // Ordenamiento por defecto para que el reporte sea legible
        query += ` ORDER BY t.fecha_creacion DESC`;

        const result = await db.query(query, params);

        // 2. Generación del Excel binario
        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Reporte de Tickets');

            worksheet.columns = [
                { header: 'Secuencia', key: 'secuencia', width: 20 },
                { header: 'Empleado', key: 'codigo_empleado', width: 15 },
                { header: 'Vehículo', key: 'ficha_interna', width: 15 },
                { header: 'Departamento', key: 'departamento', width: 25 },
                { header: 'Galones', key: 'cantidad_autorizada', width: 10 },
                { header: 'Combustible', key: 'tipo_combustible', width: 15 },
                { header: 'Estado', key: 'estado', width: 15 },
                { header: 'Fecha Emisión', key: 'fecha_creacion', width: 20 }
            ];

            worksheet.addRows(result.rows);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="reporte_general.xlsx"`);
            
            await workbook.xlsx.write(res);
            return res.end();
        }

        // Retorno JSON genérico si no se especifica Excel
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al generar reporte:', error);
        res.status(500).json({ success: false, message: 'Error al generar reporte' });
    }
};

// ==========================================
// 5.3 Cierre Diario (RF-18)
// ==========================================
const generarCierreDiario = async (req, res) => {
    // 1. Ahora también recibimos el stationId
    const { date, dispatcherId, stationId } = req.body;

    if (!date || !dispatcherId || !stationId) {
        return res.status(400).json({ success: false, message: 'Faltan parámetros: date, dispatcherId, stationId' });
    }

    // 2. Usar cliente dedicado para la transacción (Corregido)
    const cliente = await db.pool.connect();

    try {
        await cliente.query('BEGIN');

        // 3. Calcular volumen total despachado en esa estación específica
        const despRes = await cliente.query(
            `SELECT COALESCE(SUM(galones_servidos), 0) as total_despachado 
             FROM despachos 
             WHERE DATE(fecha_hora) = $1 AND id_estacion = $2`, 
            [date, stationId]
        );
        const volumenDespachado = Number(despRes.rows[0].total_despachado);

        // 4. Obtener el inventario final (sumando todos los tanques de esa estación)
        const invRes = await cliente.query(
            `SELECT COALESCE(SUM(existencia_actual), 0) as existencia_actual 
             FROM inventario 
             WHERE id_estacion = $1 AND estado = TRUE`,
            [stationId]
        );
        const inventarioFinal = Number(invRes.rows[0].existencia_actual);

        // 5. Registrar el acta de cierre digital usando la nueva restricción compuesta
        await cliente.query(
            `INSERT INTO cierres_diarios (fecha, id_estacion, volumen_despachado, inventario_final, id_usuario) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (fecha, id_estacion) 
             DO UPDATE SET 
             volumen_despachado = EXCLUDED.volumen_despachado, 
             inventario_final = EXCLUDED.inventario_final,
             id_usuario = EXCLUDED.id_usuario`,
            [date, stationId, volumenDespachado, inventarioFinal, dispatcherId]
        );

        await cliente.query('COMMIT');

        // 6. Generar el Excel del Acta de Cierre
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Acta de Cierre');

        worksheet.addRows([
            ['ACTA DE CIERRE DIARIO DE COMBUSTIBLE'],
            ['Fecha de Cierre:', date],
            ['ID Estación:', stationId],
            ['Despachador ID:', dispatcherId],
            [],
            ['MÉTRICAS', 'GALONES'],
            ['Total Despachado (Sistema):', volumenDespachado],
            ['Inventario Final Registrado:', inventarioFinal]
        ]);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="cierre_diario_estacion_${stationId}_${date}.xlsx"`);

        await workbook.xlsx.write(res);
        return res.end();
        
    } catch (error) {
        await cliente.query('ROLLBACK');
        res.status(500).json({ success: false, error: error.message || error });
    } finally {
        // Liberar el cliente al pool
        cliente.release();
    }
};

module.exports = { obtenerDashboard, generarReporteGeneral, generarCierreDiario };