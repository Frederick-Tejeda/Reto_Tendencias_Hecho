-- 1. Crear la tabla maestra de Suplidores
CREATE TABLE suplidores (
    id_suplidor SERIAL PRIMARY KEY,
    rnc VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(100),
    estado BOOLEAN DEFAULT TRUE
);

-- 2. Insertar algunos suplidores iniciales de prueba (Opcional)
INSERT INTO suplidores (rnc, nombre) VALUES 
('101001234', 'Refinería Dominicana de Petróleo (REFIDOMSA)'),
('101005678', 'Tropigas Dominicana');

-- 3. Limpiar columnas redundantes y aplicar la restricción de llave foránea
ALTER TABLE movimientos_inventario
DROP COLUMN IF EXISTS rnc_suplidor,
DROP COLUMN IF EXISTS nombre_suplidor,
ADD COLUMN IF NOT EXISTS id_suplidor INT,
ADD CONSTRAINT fk_movimiento_suplidor 
FOREIGN KEY (id_suplidor) REFERENCES suplidores(id_suplidor);