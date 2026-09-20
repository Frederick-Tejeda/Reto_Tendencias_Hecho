-- Agregar código y descripción a departamentos
ALTER TABLE departamentos ADD COLUMN codigo VARCHAR(20) UNIQUE;
ALTER TABLE departamentos ADD COLUMN descripcion TEXT;

-- Cambiar los estados de booleanos a texto para manejar "Activo", "Inactivo", "Operativo", etc.
ALTER TABLE empleados ALTER COLUMN estado TYPE VARCHAR(30);
ALTER TABLE vehiculos ALTER COLUMN estado TYPE VARCHAR(30);