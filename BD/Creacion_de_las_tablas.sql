-- Habilitar extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Departamentos
CREATE TABLE departamentos (
    id_departamento SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    estado BOOLEAN DEFAULT TRUE
);

-- 2. Tabla de Usuarios
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) CHECK (rol IN ('Administrador', 'Supervisor', 'Despachador', 'Auditor', 'Consulta')) NOT NULL,
    estado BOOLEAN DEFAULT TRUE
);

-- 3. Tabla de Empleados
CREATE TABLE empleados (
    id_empleado SERIAL PRIMARY KEY,
    codigo_empleado VARCHAR(20) UNIQUE NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    id_departamento INT REFERENCES departamentos(id_departamento),
    cargo VARCHAR(100),
    correo VARCHAR(100) UNIQUE,
    telefono_movil VARCHAR(20),
    estado BOOLEAN DEFAULT TRUE
);

-- 4. Tabla de Vehículos
CREATE TABLE vehiculos (
    id_vehiculo SERIAL PRIMARY KEY,
    placa VARCHAR(20) UNIQUE NOT NULL,
    ficha_interna VARCHAR(20) UNIQUE NOT NULL,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    anio INT,
    tipo VARCHAR(50),
    id_departamento INT REFERENCES departamentos(id_departamento),
    capacidad_tanque DECIMAL(10,2) NOT NULL,
    kilometros DECIMAL(12,2) DEFAULT 0,
    estado BOOLEAN DEFAULT TRUE
);

-- 5. Tabla de Solicitudes (Actualizada con CHECK)
CREATE TABLE solicitudes (
    id_solicitud SERIAL PRIMARY KEY,
    id_empleado INT REFERENCES empleados(id_empleado),
    id_vehiculo INT REFERENCES vehiculos(id_vehiculo),
    id_departamento INT REFERENCES departamentos(id_departamento),
    cantidad_autorizada DECIMAL(10,2) NOT NULL,
    tipo_combustible VARCHAR(50) NOT NULL,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento TIMESTAMP NOT NULL,
    estado VARCHAR(30) CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada', 'Anulada')) DEFAULT 'Pendiente'
);

-- 6. Tabla de Tickets
CREATE TABLE tickets (
    id_ticket UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    secuencia VARCHAR(30) UNIQUE NOT NULL, -- Ej: COM-2026-000001
    id_solicitud INT REFERENCES solicitudes(id_solicitud),
    id_empleado INT REFERENCES empleados(id_empleado),
    id_vehiculo INT REFERENCES vehiculos(id_vehiculo),
    id_departamento INT REFERENCES departamentos(id_departamento),
    cantidad_autorizada DECIMAL(10,2) NOT NULL,
    tipo_combustible VARCHAR(50) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento TIMESTAMP NOT NULL,
    qr_hash TEXT UNIQUE NOT NULL,
    estado VARCHAR(30) CHECK (estado IN ('Creado', 'Enviado', 'Pendiente', 'Próximo a vencer', 'Vencido', 'Consumido', 'Anulado')) DEFAULT 'Creado'
);

-- 7. Tabla de Despachos
CREATE TABLE despachos (
    id_despacho SERIAL PRIMARY KEY,
    id_ticket UUID REFERENCES tickets(id_ticket),
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    galones_servidos DECIMAL(10,2) NOT NULL,
    id_operador INT REFERENCES usuarios(id_usuario),
    estacion VARCHAR(100) NOT NULL,
    observaciones TEXT
);

-- 8. Tabla de Inventario (Tanques)
CREATE TABLE inventario (
    id_tanque SERIAL PRIMARY KEY,
    tipo_combustible VARCHAR(50) UNIQUE NOT NULL,
    existencia_actual DECIMAL(12,2) DEFAULT 0,
    capacidad_maxima DECIMAL(12,2) NOT NULL,
    nivel_critico DECIMAL(12,2) NOT NULL
);

-- 9. Movimientos de Inventario (Entradas, Salidas, Ajustes)
CREATE TABLE movimientos_inventario (
    id_movimiento SERIAL PRIMARY KEY,
    id_tanque INT REFERENCES inventario(id_tanque),
    tipo_movimiento VARCHAR(50) CHECK (tipo_movimiento IN ('Entrada', 'Salida', 'Ajuste Positivo', 'Ajuste Negativo')) NOT NULL,
    volumen DECIMAL(12,2) NOT NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rnc_suplidor VARCHAR(20),
    nombre_suplidor VARCHAR(100),
    factura VARCHAR(50),
    id_usuario INT REFERENCES usuarios(id_usuario)
);

-- 10. Cierres Diarios
CREATE TABLE cierres_diarios (
    id_cierre SERIAL PRIMARY KEY,
    fecha DATE DEFAULT CURRENT_DATE UNIQUE,
    volumen_despachado DECIMAL(12,2) NOT NULL,
    inventario_final DECIMAL(12,2) NOT NULL,
    diferencias DECIMAL(12,2) DEFAULT 0,
    id_usuario INT REFERENCES usuarios(id_usuario),
    fecha_hora_cierre TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Tabla de Auditoría (Trazabilidad)
CREATE TABLE auditoria_trazabilidad (
    id_auditoria SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES usuarios(id_usuario),
    accion VARCHAR(100) NOT NULL,
    tabla_afectada VARCHAR(50) NOT NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    direccion_ip VARCHAR(45),
    detalles TEXT
);