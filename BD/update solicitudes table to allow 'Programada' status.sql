-- 1. Eliminar la restricción actual que bloquea el registro
ALTER TABLE solicitudes DROP CONSTRAINT IF EXISTS solicitudes_estado_check;

-- 2. Crear la nueva restricción incluyendo el estado 'Programada'
ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_estado_check 
CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada', 'Anulada', 'Programada'));