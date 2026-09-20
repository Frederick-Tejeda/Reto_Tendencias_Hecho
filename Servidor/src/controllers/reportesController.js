const db = require('../config/db');

// RF-22: Visualización del Dashboard Ejecutivo
const obtenerDashboardInventario = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM vw_dashboard_inventario');
        
        res.status(200).json({
            mensaje: 'Datos del dashboard recuperados exitosamente.',
            datos: result.rows
        });
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        res.status(500).json({ error: 'Error interno al consultar el inventario.' });
    }
};

// RF-19: Reportes filtrables
const obtenerReporteTickets = async (req, res) => {
    // Extraemos posibles filtros desde la URL (ej. ?estado=Consumido&fecha_inicio=2026-09-01)
    const { estado, fecha_inicio, fecha_fin, departamento } = req.query;

    try {
        let query = 'SELECT * FROM vw_reporte_general_tickets WHERE 1=1';
        const queryParams = [];
        let paramIndex = 1;

        // Construcción dinámica de la consulta según los filtros enviados
        if (estado) {
            query += ` AND estado_ticket = $${paramIndex}`;
            queryParams.push(estado);
            paramIndex++;
        }

        if (fecha_inicio && fecha_fin) {
            query += ` AND DATE(fecha_creacion) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            queryParams.push(fecha_inicio, fecha_fin);
            paramIndex += 2;
        }

        if (departamento) {
            query += ` AND departamento = $${paramIndex}`;
            queryParams.push(departamento);
            paramIndex++;
        }

        query += ' ORDER BY fecha_creacion DESC';

        const result = await db.query(query, queryParams);

        res.status(200).json({
            total_registros: result.rowCount,
            datos: result.rows
        });
    } catch (error) {
        console.error('Error al generar reporte:', error);
        res.status(500).json({ error: 'Error al generar el reporte filtrado.' });
    }
};

module.exports = { obtenerDashboardInventario, obtenerReporteTickets };