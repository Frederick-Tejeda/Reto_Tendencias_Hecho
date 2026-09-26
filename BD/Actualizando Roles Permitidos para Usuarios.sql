ALTER TABLE usuarios DROP CONSTRAINT usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('Administrador', 'Supervisor', 'Despachador', 'Solicitante', 'Auditor'));