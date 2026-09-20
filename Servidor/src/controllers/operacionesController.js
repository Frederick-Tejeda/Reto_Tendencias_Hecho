const db = require('../config/db');

// ==========================================
// 4.1 Validación y Despacho (RF-12, RF-13)
// ==========================================
const procesarDespacho = async (req, res) => {
    const { ticketUuid, qrPayloadHash, dispatcherId, stationId, gallonsServed, dispatchTimestamp, observations } = req.body;

    try {
        // 1. Validar el Hash del QR criptográfico contra la base de datos
        const ticketResult = await db.query(`SELECT qr_hash FROM tickets WHERE id_ticket = $1`, [ticketUuid]);
        
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
        }
        
        if (ticketResult.rows[0].qr_hash !== qrPayloadHash) {
            return res.status(401).json({ success: false, message: 'Firma de QR inválida o adulterada' });
        }

        // 2. Ejecutar el procedimiento almacenado que maneja toda la transacción (descontar inventario, cambiar estado, auditar)
        await db.query(`CALL registrar_despacho($1, $2, $3, $4)`, 
            [ticketUuid, gallonsServed, dispatcherId, String(stationId)]
        );

        res.status(200).json({
            success: true,
            data: { 
                dispatchId: Math.floor(Math.random() * 1000) + 500, // En un caso real, el SP debería devolver el ID con un OUT param o procesarlo
                timestamp: dispatchTimestamp, 
                ticketStatus: "Consumido", 
                inventoryUpdated: true 
            }
        });
    } catch (error) {
        console.error('Error en despacho:', error);
        res.status(400).json({ success: false, message: error.message || 'Error al procesar el despacho' });
    }
};

// ==========================================
// 4.2 Recepción de Combustible (RF-16)
// ==========================================
const recibirCombustible = async (req, res) => {
    const { supplierId, tankId, invoiceNumber, receivedVolumeGallons, receivedAtUtc, receivedByUserId, notes } = req.body;

    try {
        await db.query('BEGIN');

        // 1. Aumentar inventario
        await db.query(`UPDATE inventario SET existencia_actual = existencia_actual + $1 WHERE id_tanque = $2`, 
            [receivedVolumeGallons, tankId]);

        // 2. Registrar movimiento
        const movResult = await db.query(`
            INSERT INTO movimientos_inventario (id_tanque, tipo_movimiento, volumen, fecha_hora, rnc_suplidor, factura, id_usuario) 
            VALUES ($1, 'Entrada', $2, $3, $4, $5, $6) RETURNING id_movimiento
        `, [tankId, receivedVolumeGallons, receivedAtUtc, String(supplierId), invoiceNumber, receivedByUserId]);

        // 3. Auditoría
        await db.query(`INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles) VALUES ($1, 'RECEPCION_COMBUSTIBLE', 'inventario', $2)`, 
            [receivedByUserId, `Recepción factura ${invoiceNumber} - Notas: ${notes}`]);

        await db.query('COMMIT');

        res.status(201).json({
            success: true,
            data: { fuelReceiptId: movResult.rows[0].id_movimiento, status: "Procesado" }
        });
    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ success: false, message: 'Error al recibir combustible' });
    }
};

// ==========================================
// 4.3 Ajustes Manuales de Inventario (RF-14)
// ==========================================
const ajustarInventario = async (req, res) => {
    const { adjustmentType, volumeGal, reason, authorizedBy } = req.body;
    
    // Por simplicidad, asumimos el tanque principal (id=1). Si tuvieras múltiples, se recibiría en el body.
    const tankId = 1; 
    const factor = adjustmentType === 'Negativo' ? -volumeGal : volumeGal;
    const dbType = adjustmentType === 'Negativo' ? 'Ajuste Negativo' : 'Ajuste Positivo';

    try {
        await db.query('BEGIN');

        const invResult = await db.query(`UPDATE inventario SET existencia_actual = existencia_actual + $1 WHERE id_tanque = $2 RETURNING existencia_actual`, 
            [factor, tankId]);

        await db.query(`
            INSERT INTO movimientos_inventario (id_tanque, tipo_movimiento, volumen, id_usuario) 
            VALUES ($1, $2, $3, $4)
        `, [tankId, dbType, volumeGal, authorizedBy]);

        await db.query(`INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles) VALUES ($1, 'AJUSTE_INVENTARIO', 'inventario', $2)`, 
            [authorizedBy, `Ajuste ${adjustmentType}: ${volumeGal} galones. Razón: ${reason}`]);

        await db.query('COMMIT');

        res.status(200).json({
            success: true,
            data: { newBalance: Number(invResult.rows[0].existencia_actual) }
        });
    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ success: false, message: 'Error al procesar ajuste de inventario' });
    }
};

// ==========================================
// 4.4 Consulta de Inventario en Tiempo Real (RF-15)
// ==========================================
const consultarInventario = async (req, res) => {
    try {
        // Consultamos la vista que creamos previamente
        const invResult = await db.query(`SELECT * FROM vw_dashboard_inventario LIMIT 1`);
        
        // Sumamos los despachos del día en curso
        const dailyResult = await db.query(`
            SELECT COALESCE(SUM(galones_servidos), 0) as consumo_diario 
            FROM despachos WHERE DATE(fecha_hora) = CURRENT_DATE
        `);

        // Sumamos los despachos del mes en curso
        const monthlyResult = await db.query(`
            SELECT COALESCE(SUM(galones_servidos), 0) as consumo_mensual 
            FROM despachos 
            WHERE EXTRACT(MONTH FROM fecha_hora) = EXTRACT(MONTH FROM CURRENT_DATE) 
            AND EXTRACT(YEAR FROM fecha_hora) = EXTRACT(YEAR FROM CURRENT_DATE)
        `);

        const inventario = invResult.rows[0];

        res.status(200).json({
            success: true,
            data: {
                currentBalanceGal: Number(inventario.existencia_actual),
                // Lógica de negocio: Disponible = Actual - Reserva Crítica (o lo pendiente por despachar)
                availableBalanceGal: Number(inventario.existencia_actual) > Number(inventario.nivel_critico) ? Number(inventario.existencia_actual) - Number(inventario.nivel_critico) : 0,
                dailyConsumptionGal: Number(dailyResult.rows[0].consumo_diario),
                monthlyConsumptionGal: Number(monthlyResult.rows[0].consumo_mensual),
                isCriticalLevel: inventario.estado_alerta === 'Crítico'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al consultar inventario' });
    }
};

// ==========================================
// 4.5 Historial de Movimientos de Inventario (RF-17)
// ==========================================
const listarMovimientos = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                m.id_movimiento as "transactionId", 
                m.tipo_movimiento as type, 
                m.volumen,
                COALESCE(m.factura, 'Ajuste/Despacho interno') as reference, 
                m.fecha_hora as timestamp
            FROM movimientos_inventario m
            ORDER BY m.fecha_hora DESC
            LIMIT 50
        `);

        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al listar movimientos' });
    }
};

module.exports = {
    procesarDespacho,
    recibirCombustible,
    ajustarInventario,
    consultarInventario,
    listarMovimientos
};