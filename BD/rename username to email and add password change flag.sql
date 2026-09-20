-- Renombrar la columna para alinearla con el JSON (email)
ALTER TABLE usuarios RENAME COLUMN username TO email;

-- Añadir la columna para forzar el cambio de contraseña
ALTER TABLE usuarios ADD COLUMN requiere_cambio_clave BOOLEAN DEFAULT FALSE;