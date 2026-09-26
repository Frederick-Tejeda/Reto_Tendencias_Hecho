-- Agregar la columna para el volumen documentado en la factura
ALTER TABLE movimientos_inventario 
ADD COLUMN volumen_documentado NUMERIC(12, 2);

-- Agregar la columna para las notas u observaciones del operario
ALTER TABLE movimientos_inventario 
ADD COLUMN observaciones TEXT;