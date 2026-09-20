CREATE OR REPLACE PROCEDURE aprobar_solicitud_generar_ticket(
    p_id_ticket UUID, -- Nuevo parámetro
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
BEGIN
    SELECT estado, id_empleado, id_vehiculo, id_departamento, cantidad_autorizada, tipo_combustible, fecha_vencimiento
    INTO v_estado_solicitud, v_id_empleado, v_id_vehiculo, v_id_departamento, v_cantidad, v_tipo, v_fecha_vencimiento
    FROM solicitudes WHERE id_solicitud = p_id_solicitud;

    IF v_estado_solicitud != 'Pendiente' THEN
        RAISE EXCEPTION 'La solicitud no está en estado Pendiente.';
    END IF;

    UPDATE solicitudes SET estado = 'Aprobada' WHERE id_solicitud = p_id_solicitud;

    -- Usamos el UUID generado en Node.js
    INSERT INTO tickets (id_ticket, secuencia, id_solicitud, id_empleado, id_vehiculo, id_departamento, cantidad_autorizada, tipo_combustible, fecha_vencimiento, qr_hash, estado)
    VALUES (p_id_ticket, p_secuencia, p_id_solicitud, v_id_empleado, v_id_vehiculo, v_id_departamento, v_cantidad, v_tipo, v_fecha_vencimiento, p_qr_hash, 'Creado');

    INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
    VALUES (p_id_usuario_supervisor, 'APROBAR_SOLICITUD', 'tickets', 'Ticket Generado: ' || p_id_ticket);
    
    COMMIT;
END;
$$;