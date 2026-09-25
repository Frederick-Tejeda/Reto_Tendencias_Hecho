-- Habilitar extensión para encriptación de QR en la base de datos
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION procesar_asignaciones_recurrentes(p_fecha_ejecucion DATE)
RETURNS TABLE(tickets_generados INT, galones_asignados DECIMAL) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_solicitud RECORD;
    v_nuevo_ticket UUID;
    v_qr_hash TEXT;
    v_secuencia VARCHAR;
    v_total_tickets INT := 0;
    v_total_galones DECIMAL := 0;
BEGIN
    -- Iterar sobre las solicitudes que aplican para asignación automática
    FOR v_solicitud IN 
        SELECT id_solicitud, id_empleado, id_vehiculo, id_departamento, cantidad_autorizada, tipo_combustible, fecha_vencimiento
        FROM solicitudes 
        WHERE estado = 'Programada'
    LOOP
        -- Generar datos únicos para el ticket
        v_secuencia := 'COM-AUTO-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || '-' || v_solicitud.id_solicitud;
        
        -- Crear el hash del QR directamente en PostgreSQL
        v_qr_hash := encode(digest(v_secuencia || v_solicitud.id_empleado::TEXT || p_fecha_ejecucion::TEXT, 'sha256'), 'hex'); 
        
        -- Insertar el ticket transaccionalmente con el estado válido
        INSERT INTO tickets (secuencia, id_solicitud, id_empleado, id_vehiculo, id_departamento, cantidad_autorizada, tipo_combustible, fecha_vencimiento, qr_hash, estado)
        VALUES (v_secuencia, v_solicitud.id_solicitud, v_solicitud.id_empleado, v_solicitud.id_vehiculo, v_solicitud.id_departamento, v_solicitud.cantidad_autorizada, v_solicitud.tipo_combustible, v_solicitud.fecha_vencimiento, v_qr_hash, 'Enviado')
        RETURNING id_ticket INTO v_nuevo_ticket;

        -- Acumular a los contadores que devolverá la función
        v_total_tickets := v_total_tickets + 1;
        v_total_galones := v_total_galones + v_solicitud.cantidad_autorizada;

        -- Registrar en la tabla de auditoría (id_usuario NULL o 0 representando al sistema automatizado)
        INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
        VALUES (NULL, 'ASIGNACION_AUTOMATICA', 'tickets', 'Ticket autogenerado: ' || v_nuevo_ticket || ' - Galones: ' || v_solicitud.cantidad_autorizada);
        
    END LOOP;

    -- Retornar los totales finales al backend
    RETURN QUERY SELECT v_total_tickets, v_total_galones;
END;
$$;