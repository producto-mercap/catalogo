-- ================================================
-- BASE DE DATOS PARA CATÁLOGO DE FUNCIONALIDADES
-- ================================================

-- Tabla de funcionalidades
CREATE TABLE IF NOT EXISTS funcionalidades (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    sponsor VARCHAR(100),
    epic_redmine VARCHAR(100),
    productivo_en DATE,
    seccion VARCHAR(100),
    monto DECIMAL(12, 2),
    score_total DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) UNIQUE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de relación cliente-funcionalidad
CREATE TABLE IF NOT EXISTS cliente_funcionalidad (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    funcionalidad_id INTEGER NOT NULL,
    estado_comercial VARCHAR(50) NOT NULL, -- 'En Desarrollo', 'Implementado', 'Planificado', 'Cancelado'
    fecha_inicio DATE,
    fecha_fin DATE,
    notas TEXT,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (funcionalidad_id) REFERENCES funcionalidades(id) ON DELETE CASCADE,
    UNIQUE(cliente_id, funcionalidad_id)
);

-- Tabla de score (criterios de puntuación)
CREATE TABLE IF NOT EXISTS score (
    id SERIAL PRIMARY KEY,
    funcionalidad_id INTEGER NOT NULL,
    -- Criterios de evaluación (valores de 1 a 5)
    origen INTEGER DEFAULT 0 CHECK (origen >= 0 AND origen <= 5),
    facturacion INTEGER DEFAULT 0 CHECK (facturacion >= 0 AND facturacion <= 5),
    urgencia INTEGER DEFAULT 0 CHECK (urgencia >= 0 AND urgencia <= 5),
    facturacion_potencial INTEGER DEFAULT 0 CHECK (facturacion_potencial >= 0 AND facturacion_potencial <= 5),
    impacto_cliente INTEGER DEFAULT 0 CHECK (impacto_cliente >= 0 AND impacto_cliente <= 5),
    esfuerzo INTEGER DEFAULT 0 CHECK (esfuerzo >= 0 AND esfuerzo <= 5),
    incertidumbre INTEGER DEFAULT 0 CHECK (incertidumbre >= 0 AND incertidumbre <= 5),
    riesgo INTEGER DEFAULT 0 CHECK (riesgo >= 0 AND riesgo <= 5),
    -- Pesos de cada criterio (%)
    peso_origen DECIMAL(5, 2) DEFAULT 40.00,
    peso_facturacion DECIMAL(5, 2) DEFAULT 20.00,
    peso_urgencia DECIMAL(5, 2) DEFAULT 20.00,
    peso_facturacion_potencial DECIMAL(5, 2) DEFAULT 20.00,
    peso_impacto_cliente DECIMAL(5, 2) DEFAULT 33.33,
    peso_esfuerzo DECIMAL(5, 2) DEFAULT 33.33,
    peso_incertidumbre DECIMAL(5, 2) DEFAULT 33.33,
    peso_riesgo DECIMAL(5, 2) DEFAULT 33.33,
    score_calculado DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (funcionalidad_id) REFERENCES funcionalidades(id) ON DELETE CASCADE,
    UNIQUE(funcionalidad_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_funcionalidades_seccion ON funcionalidades(seccion);
CREATE INDEX IF NOT EXISTS idx_funcionalidades_score ON funcionalidades(score_total);
CREATE INDEX IF NOT EXISTS idx_cliente_funcionalidad_cliente ON cliente_funcionalidad(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_funcionalidad_func ON cliente_funcionalidad(funcionalidad_id);
CREATE INDEX IF NOT EXISTS idx_cliente_funcionalidad_estado ON cliente_funcionalidad(estado_comercial);

-- ================================================
-- DATOS DE EJEMPLO
-- ================================================

-- Insertar clientes de ejemplo
INSERT INTO clientes (nombre, codigo) VALUES
('Cliente Banco A', 'BANCO_A'),
('Cliente Retail B', 'RETAIL_B'),
('Cliente Fintech C', 'FINTECH_C'),
('Cliente Seguros D', 'SEGUROS_D')
ON CONFLICT (codigo) DO NOTHING;

-- Insertar funcionalidades de ejemplo
INSERT INTO funcionalidades (titulo, descripcion, sponsor, epic_redmine, productivo_en, seccion, monto) VALUES
('Dashboard Analítico', 'Dashboard con métricas y KPIs en tiempo real para análisis de negocio', 'Juan Pérez', 'EPIC-1234', '2024-03-15', 'Analytics', 45000.00),
('Integración API Pagos', 'Integración con pasarelas de pago para procesamiento de transacciones', 'María González', 'EPIC-1235', '2024-04-20', 'Pagos', 60000.00),
('Sistema de Notificaciones', 'Sistema centralizado de notificaciones push, email y SMS', 'Carlos Rodríguez', 'EPIC-1236', '2024-05-10', 'Comunicación', 30000.00),
('Módulo de Reportes', 'Generación automática de reportes en PDF y Excel', 'Ana Martínez', 'EPIC-1237', NULL, 'Reportes', 25000.00)
ON CONFLICT DO NOTHING;

-- Insertar scores de ejemplo para las funcionalidades
INSERT INTO score (funcionalidad_id, origen, facturacion, urgencia, facturacion_potencial, impacto_cliente, esfuerzo, incertidumbre, riesgo)
SELECT id, 4, 4, 3, 5, 4, 3, 2, 3 FROM funcionalidades WHERE titulo = 'Dashboard Analítico'
ON CONFLICT (funcionalidad_id) DO NOTHING;

INSERT INTO score (funcionalidad_id, origen, facturacion, urgencia, facturacion_potencial, impacto_cliente, esfuerzo, incertidumbre, riesgo)
SELECT id, 5, 5, 5, 5, 5, 4, 3, 4 FROM funcionalidades WHERE titulo = 'Integración API Pagos'
ON CONFLICT (funcionalidad_id) DO NOTHING;

INSERT INTO score (funcionalidad_id, origen, facturacion, urgencia, facturacion_potencial, impacto_cliente, esfuerzo, incertidumbre, riesgo)
SELECT id, 3, 3, 4, 3, 4, 2, 2, 2 FROM funcionalidades WHERE titulo = 'Sistema de Notificaciones'
ON CONFLICT (funcionalidad_id) DO NOTHING;

INSERT INTO score (funcionalidad_id, origen, facturacion, urgencia, facturacion_potencial, impacto_cliente, esfuerzo, incertidumbre, riesgo)
SELECT id, 3, 2, 2, 3, 3, 3, 2, 2 FROM funcionalidades WHERE titulo = 'Módulo de Reportes'
ON CONFLICT (funcionalidad_id) DO NOTHING;

-- Insertar relaciones cliente-funcionalidad de ejemplo
INSERT INTO cliente_funcionalidad (cliente_id, funcionalidad_id, estado_comercial, fecha_inicio)
SELECT c.id, f.id, 'Implementado', '2024-01-15'
FROM clientes c, funcionalidades f
WHERE c.codigo = 'BANCO_A' AND f.titulo = 'Dashboard Analítico'
ON CONFLICT DO NOTHING;

INSERT INTO cliente_funcionalidad (cliente_id, funcionalidad_id, estado_comercial, fecha_inicio)
SELECT c.id, f.id, 'En Desarrollo', '2024-02-01'
FROM clientes c, funcionalidades f
WHERE c.codigo = 'BANCO_A' AND f.titulo = 'Integración API Pagos'
ON CONFLICT DO NOTHING;

INSERT INTO cliente_funcionalidad (cliente_id, funcionalidad_id, estado_comercial, fecha_inicio)
SELECT c.id, f.id, 'Planificado', NULL
FROM clientes c, funcionalidades f
WHERE c.codigo = 'RETAIL_B' AND f.titulo = 'Sistema de Notificaciones'
ON CONFLICT DO NOTHING;

INSERT INTO cliente_funcionalidad (cliente_id, funcionalidad_id, estado_comercial, fecha_inicio)
SELECT c.id, f.id, 'Implementado', '2023-12-01'
FROM clientes c, funcionalidades f
WHERE c.codigo = 'FINTECH_C' AND f.titulo = 'Integración API Pagos'
ON CONFLICT DO NOTHING;

-- Función para actualizar el score calculado
CREATE OR REPLACE FUNCTION calcular_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular score basado en los criterios y sus pesos
    NEW.score_calculado := (
        (NEW.origen * NEW.peso_origen / 100) +
        (NEW.facturacion * NEW.peso_facturacion / 100) +
        (NEW.urgencia * NEW.peso_urgencia / 100) +
        (NEW.facturacion_potencial * NEW.peso_facturacion_potencial / 100) +
        (NEW.impacto_cliente * NEW.peso_impacto_cliente / 100) +
        (NEW.esfuerzo * NEW.peso_esfuerzo / 100) +
        (NEW.incertidumbre * NEW.peso_incertidumbre / 100) +
        (NEW.riesgo * NEW.peso_riesgo / 100)
    );
    
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    -- Actualizar el score en la tabla funcionalidades
    UPDATE funcionalidades 
    SET score_total = NEW.score_calculado,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.funcionalidad_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular automáticamente el score
DROP TRIGGER IF EXISTS trigger_calcular_score ON score;
CREATE TRIGGER trigger_calcular_score
BEFORE INSERT OR UPDATE ON score
FOR EACH ROW
EXECUTE FUNCTION calcular_score();

-- Actualizar scores iniciales
UPDATE score SET origen = origen;

-- Función para actualizar timestamp de funcionalidades
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp en funcionalidades
DROP TRIGGER IF EXISTS trigger_actualizar_timestamp ON funcionalidades;
CREATE TRIGGER trigger_actualizar_timestamp
BEFORE UPDATE ON funcionalidades
FOR EACH ROW
EXECUTE FUNCTION actualizar_timestamp();

