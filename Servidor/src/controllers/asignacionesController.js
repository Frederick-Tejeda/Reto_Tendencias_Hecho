const db = require('../config/db');

const procesarAsignacionesAutomaticas = async (req, res) => {
    const { executionDate } = req.body;

    if (!executionDate) {
        return res.status(400).json({ success: false, message: 'La fecha de ejecución (executionDate) es requerida' });
    }

    try {
        // Llamada a la función de PostgreSQL que procesa los lotes y retorna los contadores
        const query = `SELECT tickets_generados, galones_asignados FROM procesar_asignaciones_recurrentes($1::DATE)`;
        const result = await db.query(query, [executionDate]);

        // Extraer los resultados (la función retorna una fila con las sumatorias)
        // Se formatea a Number para cumplir con el tipo de dato del DTO
        const ticketsGenerated = parseInt(result.rows[0].tickets_generados || 0, 10);
        const gallonsAllocated = parseFloat(result.rows[0].galones_asignados || 0);

        // Retorno real cumpliendo estrictamente con el contrato de la API
        res.status(200).json({
            success: true,
            data: {
                ticketsGenerated: ticketsGenerated,
                gallonsAllocated: gallonsAllocated
            }
        });
    } catch (error) {
        console.error('Error al procesar asignaciones automáticas:', error);
        res.status(500).json({ success: false, message: 'Error interno al procesar las asignaciones' });
    }
};

module.exports = { procesarAsignacionesAutomaticas };