const db = require('../config/db');

const obtenerAuditoria = async (req, res) => {
    // 1. Extraer parámetros de paginación y filtros del query string
    const { 
        page = 1, 
        limit = 50, 
        usuarioId, 
        accion, 
        fechaInicio, 
        fechaFin 
    } = req.query;

    const offset = (page - 1) * limit;

    try {
        // Base de la consulta
        let query = `
            SELECT a.id_auditoria, a.accion, a.tabla_afectada, a.detalles, 
                   a.direccion_ip, a.fecha_hora, u.username, u.rol
            FROM auditoria_trazabilidad a
            LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
            WHERE 1=1
        `;
        let countQuery = `SELECT COUNT(*) FROM auditoria_trazabilidad a WHERE 1=1`;
        
        const params = [];
        const countParams = [];
        let paramIndex = 1;

        // 2. Aplicar filtros dinámicos si el frontend los envía
        if (usuarioId) {
            query += ` AND a.id_usuario = $${paramIndex}`;
            countQuery += ` AND a.id_usuario = $${paramIndex}`;
            params.push(usuarioId);
            countParams.push(usuarioId);
            paramIndex++;
        }

        if (accion) {
            query += ` AND a.accion = $${paramIndex}`;
            countQuery += ` AND a.accion = $${paramIndex}`;
            params.push(accion);
            countParams.push(accion);
            paramIndex++;
        }

        // Filtro por rango de fechas (ideal para el Auditor)
        if (fechaInicio && fechaFin) {
            query += ` AND DATE(a.fecha_hora) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            countQuery += ` AND DATE(a.fecha_hora) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(fechaInicio, fechaFin);
            countParams.push(fechaInicio, fechaFin);
            paramIndex += 2;
        }

        // 3. Ordenar por los más recientes y aplicar paginación
        query += ` ORDER BY a.fecha_hora DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        // 4. Ejecutar consultas
        const result = await db.pool.query(query, params);
        const countResult = await db.pool.query(countQuery, countParams);
        const totalRecords = parseInt(countResult.rows[0].count);

        // 5. Responder al frontend
        res.status(200).json({
            success: true,
            data: result.rows,
            pagination: {
                totalRecords,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalRecords / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener registros de auditoría:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno al consultar la auditoría.', 
            error: error.message 
        });
    }
};

module.exports = { obtenerAuditoria };