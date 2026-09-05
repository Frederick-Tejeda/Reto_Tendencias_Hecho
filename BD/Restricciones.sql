-- 1. La fecha de vencimiento no puede ser anterior ni igual a la fecha de solicitud o creación
ALTER TABLE solicitudes 
ADD CONSTRAINT chk_fechas_solicitud CHECK (fecha_vencimiento > fecha_solicitud);

ALTER TABLE tickets 
ADD CONSTRAINT chk_fechas_ticket CHECK (fecha_vencimiento > fecha_creacion);

-- 2. El inventario de combustible nunca puede ser menor a cero 
ALTER TABLE inventario 
ADD CONSTRAINT chk_inventario_positivo CHECK (existencia_actual >= 0);

-- 3. La cantidad autorizada de combustible no puede ser menor o igual a cero
ALTER TABLE solicitudes 
ADD CONSTRAINT chk_cantidad_solicitud CHECK (cantidad_autorizada > 0);

ALTER TABLE tickets 
ADD CONSTRAINT chk_cantidad_ticket CHECK (cantidad_autorizada > 0);