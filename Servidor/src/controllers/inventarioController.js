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

    try {
        await db.query('BEGIN');

        // 1. Validar que el suplidor existe y está activo
        const suplidorValido = await db.query(
            `SELECT id_suplidor FROM suplidores WHERE id_suplidor = $1 AND estado = TRUE`,
            [supplierId]
        );

        if (suplidorValido.rowCount === 0) {
            await db.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'El suplidor especificado no existe o está inactivo.' });
        }

        // 2. Validar que el tanque existe y PERTENECE a la estación indicada (Uso de stationId)
        const tanqueValido = await db.query(
            `SELECT id_tanque FROM inventario WHERE id_tanque = $1 AND id_estacion = $2`,
            [tankId, stationId]
        );

        if (tanqueValido.rowCount === 0) {
            await db.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: 'El tanque no existe o no pertenece a la estación especificada.' 
            });
        }

        // 3. Actualizar el inventario del tanque
        const updateInventario = await db.query(
            `UPDATE inventario 
             SET existencia_actual = existencia_actual + $1 
             WHERE id_tanque = $2 
             RETURNING existencia_actual`,
            [receivedVolumeGallons, tankId]
        );

        // 4. Registrar el movimiento histórico 
        const insertMovimiento = await db.query(
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

        // 5. Registrar en Auditoría
        await db.query(
            `INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
             VALUES ($1, 'RECEPCION_COMBUSTIBLE', 'movimientos_inventario', $2)`,
            [id_usuario, `Recepción ID: ${fuelReceiptId} - Suplidor: ${supplierId} - Estación: ${stationId} - Recibido: ${receivedVolumeGallons} gal`]
        );

        await db.query('COMMIT');

        res.status(201).json({
            success: true,
            data: {
                fuelReceiptId: fuelReceiptId,
                status: "Procesado"
            }
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error al registrar recepción de combustible:', error);
        res.status(500).json({ success: false, message: 'Error interno al registrar la entrada de combustible.' });
    } finally {
        db.release();
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

    try {
        await db.query('BEGIN');

        // 1. Actualizar la existencia en el tanque
        const invResult = await db.query(
            `UPDATE inventario 
             SET existencia_actual = existencia_actual + $1 
             WHERE id_tanque = $2 
             RETURNING existencia_actual`, 
            [factor, tankId]
        );

        if (invResult.rowCount === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Tanque no encontrado.' });
        }

        // 2. Registrar en el historial de movimientos
        // (Nota: factura y id_suplidor van como NULL porque es un ajuste interno)
        await db.query(
            `INSERT INTO movimientos_inventario 
             (id_tanque, tipo_movimiento, volumen, observaciones, id_usuario, fecha_hora) 
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [tankId, dbType, volumeGal, reason, id_usuario]
        );

        // 3. Trazabilidad en Auditoría
        await db.query(
            `INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles) 
             VALUES ($1, 'AJUSTE_INVENTARIO', 'inventario', $2)`, 
            [id_usuario, `Ajuste ${adjustmentType}: ${volumeGal} galones. Razón: ${reason}`]
        );

        await db.query('COMMIT');

        // 4. Respuesta cumpliendo con el contrato del frontend
        res.status(200).json({
            success: true,
            data: { 
                newBalance: parseFloat(invResult.rows[0].existencia_actual) 
            }
        });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error al procesar ajuste de inventario:', error);
        res.status(500).json({ success: false, message: 'Error interno al procesar el ajuste de inventario.' });
    } finally {
        db.release();
    }
};

// Crear un nuevo tanque
const crearTanque = async (req, res) => {
    const { tipo_combustible, capacidad_maxima, nivel_critico, id_estacion } = req.body;

    try {
        // Validar que la estación exista y esté activa
        const estacion = await db.query('SELECT id_estacion FROM estaciones WHERE id_estacion = $1 AND estado = TRUE', [id_estacion]);
        if (estacion.rowCount === 0) {
            return res.status(404).json({ error: 'La estación especificada no existe o está inactiva.' });
        }

        const query = `
            INSERT INTO inventario (tipo_combustible, capacidad_maxima, nivel_critico, id_estacion) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *`;
            
        const { rows } = await db.query(query, [tipo_combustible, capacidad_maxima, nivel_critico, id_estacion]);
        
        res.status(201).json({ mensaje: 'Tanque creado con éxito', tanque: rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Ya existe un tanque con ese tipo de combustible.' });
        }
        res.status(500).json({ error: 'Error al crear el tanque', detalle: error.message });
    }
};

// Listar tanques (Filtros opcionales por estación y estado)
const listarTanques = async (req, res) => {
    const { id_estacion, estado } = req.query;
    try {
        let query = 'SELECT * FROM inventario WHERE 1=1';
        let values = [];
        let paramIndex = 1;

        if (id_estacion) {
            query += ` AND id_estacion = $${paramIndex}`;
            values.push(id_estacion);
            paramIndex++;
        }

        if (estado !== undefined) {
            query += ` AND estado = $${paramIndex}`;
            values.push(estado === 'true');
            paramIndex++;
        }

        query += ' ORDER BY id_estacion ASC, id_tanque ASC';

        const { rows } = await db.query(query, values);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al listar los tanques', detalle: error.message });
    }
};

// Actualizar tanque (Permite desactivar cambiando 'estado' a false)
const actualizarTanque = async (req, res) => {
    const { id } = req.params;
    const { tipo_combustible, capacidad_maxima, nivel_critico, id_estacion, estado } = req.body;

    try {
        const query = `
            UPDATE inventario 
            SET tipo_combustible = COALESCE($1, tipo_combustible), 
                capacidad_maxima = COALESCE($2, capacidad_maxima), 
                nivel_critico = COALESCE($3, nivel_critico),
                id_estacion = COALESCE($4, id_estacion),
                estado = COALESCE($5, estado) 
            WHERE id_tanque = $6 
            RETURNING *`;
            
        const { rows } = await db.query(query, [
            tipo_combustible, 
            capacidad_maxima, 
            nivel_critico, 
            id_estacion, 
            estado, 
            id
        ]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Tanque no encontrado' });
        }
        res.status(200).json({ mensaje: 'Tanque actualizado', tanque: rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el tanque', detalle: error.message });
    }
};

module.exports = {
    crearTanque,
    listarTanques,
    actualizarTanque,
    consultarEstadoInventario,
    listarMovimientos,
    registrarRecepcion,
    ajustarInventario
};