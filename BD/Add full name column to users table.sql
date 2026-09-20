-- Agregar la columna. Le ponemos un valor por defecto temporal para que no falle si ya tienes usuarios creados (como el 'admin' de tus pruebas).
ALTER TABLE usuarios 
ADD COLUMN nombre_completo VARCHAR(150) NOT NULL DEFAULT 'Usuario Registrado';

-- Luego retiramos el valor por defecto para obligar a que los próximos usuarios sí o sí incluyan su nombre al ser creados.
ALTER TABLE usuarios 
ALTER COLUMN nombre_completo DROP DEFAULT;