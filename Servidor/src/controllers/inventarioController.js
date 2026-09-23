const db = require('../config/db');

// 4.4 Consulta de Inventario en Tiempo Real (RF-15)
const consultarEstadoInventario = async (req, res) => {
    try {
        const invQuery = await db.query(`
            SELECT 
                COALESCE(SUM(existencia_actual), 0) AS total_actual,
                BOOL_OR(existencia_actual <= nivel_critico) AS es_critico
            FROM inventario
        `);

        const diarioQuery = await db.query(`
            SELECT COALESCE(SUM(galones_servidos), 0) AS consumo_diario
            FROM despachos 
            WHERE DATE(fecha_hora) = CURRENT_DATE
        `);

        const mensualQuery = await db.query(`
            SELECT COALESCE(SUM(galones_servidos), 0) AS consumo_mensual
            FROM despachos 
            WHERE EXTRACT(MONTH FROM fecha_hora) = EXTRACT(MONTH FROM CURRENT_DATE)
              AND EXTRACT(YEAR FROM fecha_hora) = EXTRACT(YEAR FROM CURRENT_DATE)
        `);

        const comprometidoQuery = await db.query(`
            SELECT COALESCE(SUM(cantidad_autorizada), 0) AS total_comprometido
            FROM tickets 
            WHERE estado IN ('Creado', 'Enviado', 'Pendiente', 'Próximo a vencer')
        `);

        const currentBalance = parseFloat(invQuery.rows[0].total_actual);
        const committedBalance = parseFloat(comprometidoQuery.rows[0].total_comprometido);
        const availableBalance = currentBalance - committedBalance;

        res.status(200).json({
            success: true,
            data: {
                currentBalanceGal: currentBalance,
                availableBalanceGal: availableBalance >= 0 ? availableBalance : 0,
                dailyConsumptionGal: parseFloat(diarioQuery.rows[0].consumo_diario),
                monthlyConsumptionGal: parseFloat(mensualQuery.rows[0].consumo_mensual),
                isCriticalLevel: invQuery.rows[0].es_critico || false
            }
        });
    } catch (error) {
        console.error('Error al consultar estado de inventario:', error);
        res.status(500).json({ success: false, message: 'Error interno al consultar el inventario' });
    }
};

// 4.5 Historial de Movimientos de Inventario (RF-17)
const listarMovimientos = async (req, res) => {
    try {
        const query = `
            SELECT 
                m.id_movimiento AS "transactionId",
                m.tipo_movimiento AS "type",
                m.volumen AS "volume",
                COALESCE(m.factura, 'Ajuste/Despacho interno') AS "reference",
                m.fecha_hora AS "timestamp"
            FROM movimientos_inventario m
            ORDER BY m.fecha_hora DESC
            LIMIT 50
        `;
        
        const result = await db.query(query);

        const formattedData = result.rows.map(row => ({
            ...row,
            volume: parseFloat(row.volume)
        }));

        res.status(200).json({
            success: true,
            data: formattedData
        });
    } catch (error) {
        console.error('Error al listar movimientos de inventario:', error);
        res.status(500).json({ success: false, message: 'Error al obtener historial de movimientos' });
    }
};

// 4.2 Recepción de Combustible (RF-16)
const registrarRecepcion = async (req, res) => {
    const {
        supplierId,
        stationId,
        tankId,
        invoiceNumber,
        documentedVolumeGallons,
        receivedVolumeGallons,
        receivedAtUtc,
        receivedByUserId,
        notes
    } = req.body;

    const id_usuario = req.user?.id || req.user?.id_usuario || receivedByUserId;
    const cliente = await db.connect();

    try {
        await cliente.query('BEGIN');

        // 1. Validar que el suplidor existe antes de intentar insertar
        const suplidorValido = await cliente.query(
            `SELECT id_suplidor FROM suplidores WHERE id_suplidor = $1 AND estado = TRUE`,
            [supplierId]
        );

        if (suplidorValido.rowCount === 0) {
            await cliente.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'El suplidor especificado no existe o está inactivo.' });
        }

        // 2. Actualizar el inventario del tanque
        const updateInventario = await cliente.query(
            `UPDATE inventario 
             SET existencia_actual = existencia_actual + $1 
             WHERE id_tanque = $2 
             RETURNING existencia_actual`,
            [receivedVolumeGallons, tankId]
        );

        if (updateInventario.rowCount === 0) {
            await cliente.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Tanque no encontrado.' });
        }

        // 3. Registrar el movimiento histórico usando el id_suplidor verificado
        const insertMovimiento = await cliente.query(
            `INSERT INTO movimientos_inventario 
             (id_tanque, tipo_movimiento, volumen, volumen_documentado, factura, id_usuario, id_suplidor, observaciones, fecha_hora)
             VALUES ($1, 'Entrada', $2, $3, $4, $5, $6, $7, $8) 
             RETURNING id_movimiento`,
            [
                tankId, 
                receivedVolumeGallons, 
                documentedVolumeGallons, 
                invoiceNumber, 
                id_usuario, 
                supplierId, 
                notes, 
                receivedAtUtc || new Date().toISOString()
            ]
        );

        const fuelReceiptId = insertMovimiento.rows[0].id_movimiento;

        // 4. Registrar en Auditoría (RF-21)
        await cliente.query(
            `INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
             VALUES ($1, 'RECEPCION_COMBUSTIBLE', 'movimientos_inventario', $2)`,
            [id_usuario, `Recepción ID: ${fuelReceiptId} - Suplidor ID: ${supplierId} - Recibido: ${receivedVolumeGallons} gal`]
        );

        await cliente.query('COMMIT');

        res.status(201).json({
            success: true,
            data: {
                fuelReceiptId: fuelReceiptId,
                status: "Procesado"
            }
        });

    } catch (error) {
        await cliente.query('ROLLBACK');
        console.error('Error al registrar recepción de combustible:', error);
        res.status(500).json({ success: false, message: 'Error interno al registrar la entrada de combustible.' });
    } finally {
        cliente.release();
    }
};

// 4.3 Ajustes Manuales de Inventario (RF-14)
const ajustarInventario = async (req, res) => {
    const { adjustmentType, volumeGal, reason, authorizedBy } = req.body;
    
    // Si la API no envía el tanque, asumimos por defecto el tanque principal (id=1)
    const tankId = req.body.tankId || 1; 
    
    // Determinar si sumamos o restamos al inventario
    const factor = adjustmentType === 'Negativo' ? -parseFloat(volumeGal) : parseFloat(volumeGal);
    const dbType = adjustmentType === 'Negativo' ? 'Ajuste Negativo' : 'Ajuste Positivo';
    
    // Prioridad al usuario del token, con fallback al body
    const id_usuario = req.user?.id || req.user?.id_usuario || authorizedBy;

    const cliente = await db.connect();

    try {
        await cliente.query('BEGIN');

        // 1. Actualizar la existencia en el tanque
        const invResult = await cliente.query(
            `UPDATE inventario 
             SET existencia_actual = existencia_actual + $1 
             WHERE id_tanque = $2 
             RETURNING existencia_actual`, 
            [factor, tankId]
        );

        if (invResult.rowCount === 0) {
            await cliente.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Tanque no encontrado.' });
        }

        // 2. Registrar en el historial de movimientos
        // (Nota: factura y id_suplidor van como NULL porque es un ajuste interno)
        await cliente.query(
            `INSERT INTO movimientos_inventario 
             (id_tanque, tipo_movimiento, volumen, observaciones, id_usuario, fecha_hora) 
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [tankId, dbType, volumeGal, reason, id_usuario]
        );

        // 3. Trazabilidad en Auditoría
        await cliente.query(
            `INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles) 
             VALUES ($1, 'AJUSTE_INVENTARIO', 'inventario', $2)`, 
            [id_usuario, `Ajuste ${adjustmentType}: ${volumeGal} galones. Razón: ${reason}`]
        );

        await cliente.query('COMMIT');

        // 4. Respuesta cumpliendo con el contrato del frontend
        res.status(200).json({
            success: true,
            data: { 
                newBalance: parseFloat(invResult.rows[0].existencia_actual) 
            }
        });
    } catch (error) {
        await cliente.query('ROLLBACK');
        console.error('Error al procesar ajuste de inventario:', error);
        res.status(500).json({ success: false, message: 'Error interno al procesar el ajuste de inventario.' });
    } finally {
        cliente.release();
    }
};

module.exports = {
    consultarEstadoInventario,
    listarMovimientos,
    registrarRecepcion,
    ajustarInventario
};