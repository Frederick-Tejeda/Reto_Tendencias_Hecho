        -- 1. Vista de Inventario Actual

CREATE OR REPLACE VIEW vw_dashboard_inventario AS
SELECT 
    id_tanque,
    tipo_combustible,
    existencia_actual,
    capacidad_maxima,
    nivel_critico,
    (existencia_actual / capacidad_maxima) * 100 AS porcentaje_disponible,
    CASE 
        WHEN existencia_actual <= nivel_critico THEN 'Crítico'
        WHEN (existencia_actual / capacidad_maxima) <= 0.25 THEN 'Bajo'
        ELSE 'Óptimo'
    END AS estado_alerta
FROM inventario;

        -- 2. Vista de Resumen de Tickets

CREATE OR REPLACE VIEW vw_dashboard_tickets_resumen AS
SELECT 
    COUNT(*) FILTER (WHERE estado IN ('Creado', 'Enviado', 'Pendiente', 'Próximo a vencer')) AS tickets_activos,
    COUNT(*) FILTER (WHERE estado = 'Vencido') AS tickets_vencidos,
    COUNT(*) FILTER (WHERE estado = 'Consumido') AS tickets_consumidos,
    COUNT(*) FILTER (WHERE estado = 'Anulado') AS tickets_anulados,
    COUNT(*) AS total_historico
FROM tickets;

        -- 3. Vista de Consumo por Departamento

CREATE OR REPLACE VIEW vw_consumo_departamento AS
SELECT 
    d.id_departamento,
    d.nombre AS departamento,
    COALESCE(SUM(des.galones_servidos), 0) AS total_galones_consumidos
FROM departamentos d
LEFT JOIN tickets t ON d.id_departamento = t.id_departamento
LEFT JOIN despachos des ON t.id_ticket = des.id_ticket
GROUP BY d.id_departamento, d.nombre
ORDER BY total_galones_consumidos DESC;

        -- 4. Vista de Consumo por Vehículo

CREATE OR REPLACE VIEW vw_consumo_vehiculo AS
SELECT 
    v.id_vehiculo,
    v.ficha_interna,
    v.placa,
    d.nombre AS departamento,
    COALESCE(SUM(des.galones_servidos), 0) AS total_galones_consumidos
FROM vehiculos v
JOIN departamentos d ON v.id_departamento = d.id_departamento
LEFT JOIN tickets t ON v.id_vehiculo = t.id_vehiculo
LEFT JOIN despachos des ON t.id_ticket = des.id_ticket
GROUP BY v.id_vehiculo, v.ficha_interna, v.placa, d.nombre
ORDER BY total_galones_consumidos DESC;

        -- 5. Vista General para Reportes Filtrables

CREATE OR REPLACE VIEW vw_reporte_general_tickets AS
SELECT 
    t.secuencia AS numero_ticket,
    t.fecha_creacion,
    t.fecha_vencimiento,
    t.estado AS estado_ticket,
    t.tipo_combustible,
    t.cantidad_autorizada,
    e.codigo_empleado,
    e.nombre_completo AS empleado,
    v.ficha_interna,
    v.placa,
    d.nombre AS departamento,
    des.fecha_hora AS fecha_despacho,
    des.galones_servidos,
    des.estacion,
    u.username AS despachador
FROM tickets t
JOIN empleados e ON t.id_empleado = e.id_empleado
JOIN vehiculos v ON t.id_vehiculo = v.id_vehiculo
JOIN departamentos d ON t.id_departamento = d.id_departamento
LEFT JOIN despachos des ON t.id_ticket = des.id_ticket
LEFT JOIN usuarios u ON des.id_operador = u.id_usuario;

        -- 6. Vista de Combustible Despachado (Resumen Ejecutivo)

CREATE OR REPLACE VIEW vw_dashboard_combustible_despachado AS
SELECT 
    t.tipo_combustible,
    COALESCE(SUM(CASE WHEN DATE(d.fecha_hora) = CURRENT_DATE THEN d.galones_servidos ELSE 0 END), 0) AS despachado_hoy,
    COALESCE(SUM(CASE WHEN DATE_TRUNC('month', d.fecha_hora) = DATE_TRUNC('month', CURRENT_DATE) THEN d.galones_servidos ELSE 0 END), 0) AS despachado_mes_actual,
    COALESCE(SUM(d.galones_servidos), 0) AS despachado_historico_total,
    COUNT(d.id_despacho) AS cantidad_total_despachos
FROM despachos d
JOIN tickets t ON d.id_ticket = t.id_ticket
GROUP BY t.tipo_combustible;