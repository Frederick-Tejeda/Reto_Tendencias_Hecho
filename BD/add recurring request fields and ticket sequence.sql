ALTER TABLE solicitudes ADD COLUMN tipo_solicitud VARCHAR(30) DEFAULT 'Manual';
ALTER TABLE solicitudes ADD COLUMN frecuencia VARCHAR(30);
ALTER TABLE solicitudes ADD COLUMN dia_semana INT;
ALTER TABLE solicitudes ADD COLUMN fecha_inicio_recurrencia TIMESTAMP;
ALTER TABLE solicitudes ADD COLUMN fecha_fin_recurrencia TIMESTAMP;

-- Ajustar la secuencia para que genere los códigos COM-2026-XXXXXX automáticamente
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;