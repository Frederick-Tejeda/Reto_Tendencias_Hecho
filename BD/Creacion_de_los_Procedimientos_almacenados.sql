        -- 1. Registrar Despacho de Combustible

CREATE OR REPLACE PROCEDURE registrar_despacho(
    p_id_ticket UUID,
    p_galones_servidos DECIMAL,
    p_id_operador INT,
    p_estacion VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_estado_ticket VARCHAR;
    v_fecha_vencimiento TIMESTAMP;
    v_tipo_combustible VARCHAR;
    v_id_tanque INT;
BEGIN
    -- 1. Obtener datos del ticket y validar su estado actual
    SELECT estado, fecha_vencimiento, tipo_combustible 
    INTO v_estado_ticket, v_fecha_vencimiento, v_tipo_combustible
    FROM tickets WHERE id_ticket = p_id_ticket;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El ticket no existe.';
    END IF;

    IF v_estado_ticket NOT IN ('Creado', 'Enviado', 'Pendiente', 'Próximo a vencer') THEN
        RAISE EXCEPTION 'El ticket no es válido para despacho. Estado actual: %', v_estado_ticket;
    END IF;

    IF CURRENT_TIMESTAMP > v_fecha_vencimiento THEN
        RAISE EXCEPTION 'El ticket se encuentra vencido.';
    END IF;

    -- 2. Obtener el ID del tanque correspondiente al tipo de combustible
    SELECT id_tanque INTO v_id_tanque FROM inventario WHERE tipo_combustible = v_tipo_combustible;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró un tanque para el tipo de combustible: %', v_tipo_combustible;
    END IF;

    -- 3. Registrar el despacho
    INSERT INTO despachos (id_ticket, galones_servidos, id_operador, estacion)
    VALUES (p_id_ticket, p_galones_servidos, p_id_operador, p_estacion);

    -- 4. Actualizar el estado del ticket a "Consumido"
    UPDATE tickets SET estado = 'Consumido' WHERE id_ticket = p_id_ticket;

    -- 5. Impactar el inventario (restar los galones)
    UPDATE inventario SET existencia_actual = existencia_actual - p_galones_servidos
    WHERE id_tanque = v_id_tanque;

    -- 6. Registrar el movimiento de inventario (Salida)
    INSERT INTO movimientos_inventario (id_tanque, tipo_movimiento, volumen, id_usuario)
    VALUES (v_id_tanque, 'Salida', p_galones_servidos, p_id_operador);

    -- 7. Registrar en la auditoría de trazabilidad
    INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
    VALUES (p_id_operador, 'REGISTRAR_DESPACHO_QR', 'despachos', 'Ticket ID: ' || p_id_ticket || ' - Galones: ' || p_galones_servidos);
    
    COMMIT;
END;
$$;

        -- 2. Generar Cierre Diario

CREATE OR REPLACE PROCEDURE generar_cierre_diario(
    p_fecha DATE,
    p_inventario_final_fisico DECIMAL,
    p_id_usuario_auditor INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_volumen_despachado DECIMAL := 0;
    v_diferencia DECIMAL := 0;
    v_inventario_sistema DECIMAL := 0;
BEGIN
    -- 1. Verificar si ya existe un cierre para esa fecha
    IF EXISTS (SELECT 1 FROM cierres_diarios WHERE fecha = p_fecha) THEN
        RAISE EXCEPTION 'Ya existe un cierre diario registrado para la fecha %.', p_fecha;
    END IF;

    -- 2. Calcular el total de galones despachados en esa fecha
    SELECT COALESCE(SUM(galones_servidos), 0) INTO v_volumen_despachado
    FROM despachos
    WHERE DATE(fecha_hora) = p_fecha;

    -- 3. Obtener el inventario actual registrado en el sistema (sumando todos los tanques)
    SELECT COALESCE(SUM(existencia_actual), 0) INTO v_inventario_sistema
    FROM inventario;

    -- 4. Calcular la diferencia (Inventario del sistema vs Inventario físico real)
    -- Si la diferencia es negativa, falta combustible (posible fuga o hurto)
    v_diferencia := p_inventario_final_fisico - v_inventario_sistema;

    -- 5. Insertar el registro del cierre diario
    INSERT INTO cierres_diarios (fecha, volumen_despachado, inventario_final, diferencias, id_usuario)
    VALUES (p_fecha, v_volumen_despachado, p_inventario_final_fisico, v_diferencia, p_id_usuario_auditor);

    -- 6. Registrar en la auditoría
    INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
    VALUES (p_id_usuario_auditor, 'EJECUTAR_CIERRE_DIARIO', 'cierres_diarios', 'Fecha de cierre: ' || p_fecha || ' Diferencia detectada: ' || v_diferencia);
    
    COMMIT;
END;
$$;

        -- 3. Recepción de Combustible (Entrada)

CREATE OR REPLACE PROCEDURE recepcion_combustible(
    p_id_tanque INT,
    p_volumen DECIMAL,
    p_rnc_suplidor VARCHAR,
    p_nombre_suplidor VARCHAR,
    p_factura VARCHAR,
    p_id_usuario INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Actualizar el inventario sumando el volumen recibido
    UPDATE inventario 
    SET existencia_actual = existencia_actual + p_volumen
    WHERE id_tanque = p_id_tanque;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El tanque especificado no existe.';
    END IF;

    -- 2. Registrar el movimiento como Entrada
    INSERT INTO movimientos_inventario (id_tanque, tipo_movimiento, volumen, rnc_suplidor, nombre_suplidor, factura, id_usuario)
    VALUES (p_id_tanque, 'Entrada', p_volumen, p_rnc_suplidor, p_nombre_suplidor, p_factura, p_id_usuario);

    -- 3. Registrar auditoría
    INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
    VALUES (p_id_usuario, 'RECEPCION_COMBUSTIBLE', 'movimientos_inventario', 'Factura: ' || p_factura || ' - Volumen: ' || p_volumen);
    
    COMMIT;
END;
$$;

        -- 4. Aprobar Solicitud y Generar Ticket

CREATE OR REPLACE PROCEDURE aprobar_solicitud_generar_ticket(
    p_id_solicitud INT,
    p_secuencia VARCHAR,
    p_qr_hash TEXT,
    p_id_usuario_supervisor INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_estado_solicitud VARCHAR;
    v_id_empleado INT;
    v_id_vehiculo INT;
    v_id_departamento INT;
    v_cantidad DECIMAL;
    v_tipo VARCHAR;
    v_fecha_vencimiento TIMESTAMP;
    v_nuevo_id_ticket UUID;
BEGIN
    -- 1. Obtener y validar datos de la solicitud
    SELECT estado, id_empleado, id_vehiculo, id_departamento, cantidad_autorizada, tipo_combustible, fecha_vencimiento
    INTO v_estado_solicitud, v_id_empleado, v_id_vehiculo, v_id_departamento, v_cantidad, v_tipo, v_fecha_vencimiento
    FROM solicitudes WHERE id_solicitud = p_id_solicitud;

    IF v_estado_solicitud != 'Pendiente' THEN
        RAISE EXCEPTION 'La solicitud no está en estado Pendiente (Estado actual: %).', v_estado_solicitud;
    END IF;

    -- 2. Actualizar estado de solicitud a Aprobada
    UPDATE solicitudes SET estado = 'Aprobada' WHERE id_solicitud = p_id_solicitud;

    -- 3. Insertar el Ticket Digital
    INSERT INTO tickets (secuencia, id_solicitud, id_empleado, id_vehiculo, id_departamento, cantidad_autorizada, tipo_combustible, fecha_vencimiento, qr_hash, estado)
    VALUES (p_secuencia, p_id_solicitud, v_id_empleado, v_id_vehiculo, v_id_departamento, v_cantidad, v_tipo, v_fecha_vencimiento, p_qr_hash, 'Creado')
    RETURNING id_ticket INTO v_nuevo_id_ticket;

    -- 4. Registrar auditoría
    INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
    VALUES (p_id_usuario_supervisor, 'APROBAR_SOLICITUD', 'tickets', 'Solicitud Aprobada: ' || p_id_solicitud || ' - Ticket Generado: ' || v_nuevo_id_ticket);
    
    COMMIT;
END;
$$;

        -- 5. Ajustar Inventario

CREATE OR REPLACE PROCEDURE ajustar_inventario(
    p_id_tanque INT,
    p_tipo_movimiento VARCHAR,
    p_volumen DECIMAL,
    p_id_usuario INT,
    p_motivo TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_tipo_movimiento NOT IN ('Ajuste Positivo', 'Ajuste Negativo') THEN
        RAISE EXCEPTION 'El tipo de movimiento debe ser Ajuste Positivo o Ajuste Negativo.';
    END IF;

    IF p_volumen <= 0 THEN
        RAISE EXCEPTION 'El volumen del ajuste debe ser mayor a cero.';
    END IF;

    -- 1. Actualizar el inventario basado en el tipo de ajuste
    IF p_tipo_movimiento = 'Ajuste Positivo' THEN
        UPDATE inventario SET existencia_actual = existencia_actual + p_volumen WHERE id_tanque = p_id_tanque;
    ELSE
        UPDATE inventario SET existencia_actual = existencia_actual - p_volumen WHERE id_tanque = p_id_tanque;
    END IF;

    -- 2. Registrar el movimiento
    INSERT INTO movimientos_inventario (id_tanque, tipo_movimiento, volumen, id_usuario)
    VALUES (p_id_tanque, p_tipo_movimiento, p_volumen, p_id_usuario);

    -- 3. Registrar auditoría incluyendo el motivo
    INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
    VALUES (p_id_usuario, 'AJUSTE_INVENTARIO', 'inventario', 'Tanque: ' || p_id_tanque || ' - Tipo: ' || p_tipo_movimiento || ' - Volumen: ' || p_volumen || ' - Motivo: ' || p_motivo);
    
    COMMIT;
END;
$$;

        -- 6. Anular Ticket

CREATE OR REPLACE PROCEDURE anular_ticket(
    p_id_ticket UUID,
    p_id_usuario INT,
    p_motivo TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_estado_actual VARCHAR;
BEGIN
    SELECT estado INTO v_estado_actual FROM tickets WHERE id_ticket = p_id_ticket;
    
    IF v_estado_actual IN ('Consumido', 'Anulado') THEN
        RAISE EXCEPTION 'No se puede anular un ticket que ya está %.', v_estado_actual;
    END IF;

    -- 1. Actualizar el estado del ticket
    UPDATE tickets SET estado = 'Anulado' WHERE id_ticket = p_id_ticket;

    -- 2. Registrar auditoría
    INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
    VALUES (p_id_usuario, 'ANULAR_TICKET', 'tickets', 'Ticket: ' || p_id_ticket || ' - Motivo: ' || p_motivo);
    
    COMMIT;
END;
$$;

        -- 7. Actualizar Tickets Vencidos

CREATE OR REPLACE PROCEDURE actualizar_tickets_vencidos()
LANGUAGE plpgsql
AS $$
DECLARE
    v_tickets_afectados INT;
BEGIN
    -- 1. Actualizar estado a 'Vencido' donde la fecha ya pasó y no fueron consumidos ni anulados
    UPDATE tickets 
    SET estado = 'Vencido' 
    WHERE estado IN ('Creado', 'Enviado', 'Pendiente', 'Próximo a vencer') 
      AND fecha_vencimiento < CURRENT_TIMESTAMP;

    -- Obtener la cantidad de filas actualizadas (opcional para el log)
    GET DIAGNOSTICS v_tickets_afectados = ROW_COUNT;

    -- 2. Si se vencieron tickets, registrar la acción del sistema en auditoría (Usuario NULL o Sistema=0 dependiendo del diseño)
    IF v_tickets_afectados > 0 THEN
        INSERT INTO auditoria_trazabilidad (accion, tabla_afectada, detalles)
        VALUES ('ACTUALIZAR_VENCIDOS_BATCH', 'tickets', 'Cantidad de tickets vencidos automáticamente: ' || v_tickets_afectados);
    END IF;
    
    COMMIT;
END;
$$;

        -- 8. Crear Solicitud de Combustible

CREATE OR REPLACE PROCEDURE crear_solicitud_combustible(
    p_id_empleado INT,
    p_id_vehiculo INT,
    p_id_departamento INT,
    p_cantidad_autorizada DECIMAL,
    p_tipo_combustible VARCHAR,
    p_fecha_vencimiento TIMESTAMP,
    p_id_usuario_creador INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_nueva_solicitud INT;
BEGIN
    -- 1. Insertar la nueva solicitud en estado por defecto ('Pendiente')
    INSERT INTO solicitudes (id_empleado, id_vehiculo, id_departamento, cantidad_autorizada, tipo_combustible, fecha_vencimiento)
    VALUES (p_id_empleado, p_id_vehiculo, p_id_departamento, p_cantidad_autorizada, p_tipo_combustible, p_fecha_vencimiento)
    RETURNING id_solicitud INTO v_nueva_solicitud;

    -- 2. Registrar en la auditoría de trazabilidad
    INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
    VALUES (p_id_usuario_creador, 'CREAR_SOLICITUD', 'solicitudes', 'Nueva solicitud ID: ' || v_nueva_solicitud || ' - Cantidad: ' || p_cantidad_autorizada);
    
    COMMIT;
END;
$$;

        -- 9. Rechazar Solicitud

CREATE OR REPLACE PROCEDURE rechazar_solicitud(
    p_id_solicitud INT,
    p_id_usuario_supervisor INT,
    p_motivo TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_estado_actual VARCHAR;
BEGIN
    -- 1. Verificar estado actual
    SELECT estado INTO v_estado_actual FROM solicitudes WHERE id_solicitud = p_id_solicitud;
    
    IF v_estado_actual != 'Pendiente' THEN
        RAISE EXCEPTION 'Solo se pueden rechazar solicitudes en estado Pendiente. Estado actual: %', v_estado_actual;
    END IF;

    -- 2. Actualizar estado a Rechazada
    UPDATE solicitudes SET estado = 'Rechazada' WHERE id_solicitud = p_id_solicitud;

    -- 3. Registrar auditoría con el motivo del rechazo
    INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
    VALUES (p_id_usuario_supervisor, 'RECHAZAR_SOLICITUD', 'solicitudes', 'Solicitud ID: ' || p_id_solicitud || ' - Motivo: ' || p_motivo);
    
    COMMIT;
END;
$$;

        -- 10. Marcar Tickets Próximos a Vencer

CREATE OR REPLACE PROCEDURE marcar_tickets_proximos_vencer(
    p_horas_alerta INT DEFAULT 24 -- Se activa si faltan 24 horas o menos para vencer
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_tickets_afectados INT;
BEGIN
    -- 1. Actualizar estado a 'Próximo a vencer' si están cerca de la fecha límite
    UPDATE tickets 
    SET estado = 'Próximo a vencer' 
    WHERE estado IN ('Creado', 'Enviado', 'Pendiente') 
      AND fecha_vencimiento > CURRENT_TIMESTAMP 
      AND fecha_vencimiento <= (CURRENT_TIMESTAMP + (p_horas_alerta || ' hours')::interval);

    GET DIAGNOSTICS v_tickets_afectados = ROW_COUNT;

    -- 2. Registrar la acción en auditoría si hubo cambios
    IF v_tickets_afectados > 0 THEN
        INSERT INTO auditoria_trazabilidad (accion, tabla_afectada, detalles)
        VALUES ('MARCAR_PROXIMOS_VENCER_BATCH', 'tickets', 'Cantidad de tickets marcados: ' || v_tickets_afectados);
    END IF;
    
    COMMIT;
END;
$$;