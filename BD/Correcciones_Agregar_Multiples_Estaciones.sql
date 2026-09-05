-- 1. Nueva tabla de Estaciones
DROP TABLE IF EXISTS estaciones;
CREATE TABLE estaciones (
    id_estacion SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    ubicacion VARCHAR(200),
    estado BOOLEAN DEFAULT TRUE
);

-- 2. Modificación a la tabla Inventario (Tanques) para asociarla a una estación
    -- 1. Agregar la columna id_estacion a la tabla existente
    ALTER TABLE inventario 
    ADD COLUMN id_estacion INT NOT NULL;

    -- 2. Agregar la restricción de clave foránea
    ALTER TABLE inventario 
    ADD CONSTRAINT fk_inventario_estacion 
    FOREIGN KEY (id_estacion) REFERENCES estaciones(id_estacion);

    -- 3. Agregar la restricción UNIQUE para evitar duplicados de combustible por estación
    ALTER TABLE inventario 
    ADD CONSTRAINT uk_inventario_estacion_combustible 
    UNIQUE(id_estacion, tipo_combustible);

-- 3. Modificación a la tabla Despachos
-- Cambiamos el VARCHAR por el ID de la estación
    -- 1. Eliminar temporalmente la vista que depende de la columna antigua
    DROP VIEW IF EXISTS vw_reporte_general_tickets;
    DROP VIEW IF EXISTS vw_consumo_departamento;
    DROP VIEW IF EXISTS vw_consumo_vehiculo;
    DROP VIEW IF EXISTS vw_dashboard_combustible_despachado;

    -- 2. Eliminar la columna de texto antigua
    ALTER TABLE despachos DROP COLUMN estacion;

    -- 3. Agregar la nueva columna referencial
    ALTER TABLE despachos ADD COLUMN id_estacion INT;

    -- 4. Establecer la relación de llave foránea
    ALTER TABLE despachos 
    ADD CONSTRAINT fk_despachos_estacion 
    FOREIGN KEY (id_estacion) REFERENCES estaciones(id_estacion);

    -- 5. Hacer que la columna sea obligatoria (ejecutar solo si la tabla está vacía)
    ALTER TABLE despachos ALTER COLUMN id_estacion SET NOT NULL;

-- Agregar la estación al cierre diario
ALTER TABLE cierres_diarios 
ADD COLUMN id_estacion INT REFERENCES estaciones(id_estacion);

-- Reemplazar la restricción UNIQUE anterior para que permita un cierre diario POR ESTACIÓN
ALTER TABLE cierres_diarios DROP CONSTRAINT cierres_diarios_fecha_key;
ALTER TABLE cierres_diarios ADD CONSTRAINT uk_cierre_fecha_estacion UNIQUE(fecha, id_estacion);

CREATE OR REPLACE PROCEDURE registrar_despacho(
    p_id_ticket UUID,
    p_galones_servidos DECIMAL,
    p_id_operador INT,
    p_id_estacion INT -- Cambio: Recibe ID de la estación
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_estado_ticket VARCHAR;
    v_fecha_vencimiento TIMESTAMP;
    v_tipo_combustible VARCHAR;
    v_id_tanque INT;
BEGIN
    SELECT estado, fecha_vencimiento, tipo_combustible 
    INTO v_estado_ticket, v_fecha_vencimiento, v_tipo_combustible
    FROM tickets WHERE id_ticket = p_id_ticket;

    IF NOT FOUND THEN RAISE EXCEPTION 'El ticket no existe.'; END IF;
    IF v_estado_ticket NOT IN ('Creado', 'Enviado', 'Pendiente', 'Próximo a vencer') THEN
        RAISE EXCEPTION 'El ticket no es válido para despacho.';
    END IF;
    IF CURRENT_TIMESTAMP > v_fecha_vencimiento THEN RAISE EXCEPTION 'El ticket venció.'; END IF;

    -- Cambio: Filtrar el tanque por tipo de combustible Y por la estación donde se escanea el QR
    SELECT id_tanque INTO v_id_tanque 
    FROM inventario 
    WHERE tipo_combustible = v_tipo_combustible AND id_estacion = p_id_estacion;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró un tanque para este combustible en esta estación.';
    END IF;

    INSERT INTO despachos (id_ticket, galones_servidos, id_operador, id_estacion)
    VALUES (p_id_ticket, p_galones_servidos, p_id_operador, p_id_estacion);

    UPDATE tickets SET estado = 'Consumido' WHERE id_ticket = p_id_ticket;
    UPDATE inventario SET existencia_actual = existencia_actual - p_galones_servidos WHERE id_tanque = v_id_tanque;

    INSERT INTO movimientos_inventario (id_tanque, tipo_movimiento, volumen, id_usuario)
    VALUES (v_id_tanque, 'Salida', p_galones_servidos, p_id_operador);

    INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
    VALUES (p_id_operador, 'REGISTRAR_DESPACHO_QR', 'despachos', 'Ticket: ' || p_id_ticket || ' - Galones: ' || p_galones_servidos || ' - Estación: ' || p_id_estacion);
    
    COMMIT;
END;
$$;

CREATE OR REPLACE PROCEDURE generar_cierre_diario(
    p_fecha DATE,
    p_id_estacion INT, -- Cambio: Nuevo parámetro
    p_inventario_final_fisico DECIMAL,
    p_id_usuario_auditor INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_volumen_despachado DECIMAL := 0;
    v_inventario_sistema DECIMAL := 0;
    v_diferencia DECIMAL := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM cierres_diarios WHERE fecha = p_fecha AND id_estacion = p_id_estacion) THEN
        RAISE EXCEPTION 'Ya existe un cierre diario en esta estación para la fecha %.', p_fecha;
    END IF;

    -- Cambio: Sumar solo los despachos de esa estación
    SELECT COALESCE(SUM(galones_servidos), 0) INTO v_volumen_despachado
    FROM despachos
    WHERE DATE(fecha_hora) = p_fecha AND id_estacion = p_id_estacion;

    -- Cambio: Sumar solo los tanques de esa estación
    SELECT COALESCE(SUM(existencia_actual), 0) INTO v_inventario_sistema
    FROM inventario
    WHERE id_estacion = p_id_estacion;

    v_diferencia := p_inventario_final_fisico - v_inventario_sistema;

    INSERT INTO cierres_diarios (fecha, id_estacion, volumen_despachado, inventario_final, diferencias, id_usuario)
    VALUES (p_fecha, p_id_estacion, v_volumen_despachado, p_inventario_final_fisico, v_diferencia, p_id_usuario_auditor);

    INSERT INTO auditoria_trazabilidad (id_usuario, accion, tabla_afectada, detalles)
    VALUES (p_id_usuario_auditor, 'EJECUTAR_CIERRE_DIARIO', 'cierres_diarios', 'Estación: ' || p_id_estacion || ' - Diferencia: ' || v_diferencia);
    
    COMMIT;
END;
$$;

CREATE OR REPLACE VIEW vw_dashboard_inventario AS
SELECT 
    i.id_tanque,
    e.nombre AS estacion,
    i.tipo_combustible,
    i.existencia_actual,
    i.capacidad_maxima,
    i.nivel_critico,
    (i.existencia_actual / i.capacidad_maxima) * 100 AS porcentaje_disponible,
    CASE 
        WHEN i.existencia_actual <= i.nivel_critico THEN 'Crítico'
        WHEN (i.existencia_actual / i.capacidad_maxima) <= 0.25 THEN 'Bajo'
        ELSE 'Óptimo'
    END AS estado_alerta
FROM inventario i
JOIN estaciones e ON i.id_estacion = e.id_estacion;

-- 1. Eliminar las vistas antiguas que están bloqueando la actualización
DROP VIEW IF EXISTS vw_dashboard_inventario;
DROP VIEW IF EXISTS vw_reporte_general_tickets;

-- 2. Crear la nueva vista de inventario
CREATE VIEW vw_dashboard_inventario AS
SELECT 
    i.id_tanque,
    e.nombre AS estacion,
    i.tipo_combustible,
    i.existencia_actual,
    i.capacidad_maxima,
    i.nivel_critico,
    (i.existencia_actual / i.capacidad_maxima) * 100 AS porcentaje_disponible,
    CASE 
        WHEN i.existencia_actual <= i.nivel_critico THEN 'Crítico'
        WHEN (i.existencia_actual / i.capacidad_maxima) <= 0.25 THEN 'Bajo'
        ELSE 'Óptimo'
    END AS estado_alerta
FROM inventario i
JOIN estaciones e ON i.id_estacion = e.id_estacion;

-- 3. Crear la nueva vista de reportes
CREATE VIEW vw_reporte_general_tickets AS
SELECT 
    t.secuencia AS numero_ticket,
    t.fecha_creacion,
    t.fecha_vencimiento,
    t.estado AS estado_ticket,
    t.tipo_combustible,
    t.cantidad_autorizada,
    emp.codigo_empleado,
    emp.nombre_completo AS empleado,
    v.ficha_interna,
    v.placa,
    d.nombre AS departamento,
    des.fecha_hora AS fecha_despacho,
    des.galones_servidos,
    est.nombre AS estacion_despacho,
    u.username AS despachador
FROM tickets t
JOIN empleados emp ON t.id_empleado = emp.id_empleado
JOIN vehiculos v ON t.id_vehiculo = v.id_vehiculo
JOIN departamentos d ON t.id_departamento = d.id_departamento
LEFT JOIN despachos des ON t.id_ticket = des.id_ticket
LEFT JOIN estaciones est ON des.id_estacion = est.id_estacion
LEFT JOIN usuarios u ON des.id_operador = u.id_usuario;