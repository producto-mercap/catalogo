-- Agregar campos cf_91 (Es Reventa) y cf_92 (Proyecto Sponsor) a la tabla redmine_req_clientes
-- Fecha: 2025-01-XX

-- Agregar columna cf_91 (Es Reventa)
ALTER TABLE redmine_req_clientes 
ADD COLUMN IF NOT EXISTS cf_91 VARCHAR(255) NULL;

COMMENT ON COLUMN redmine_req_clientes.cf_91 IS 'Custom Field 91: Es Reventa';

-- Agregar columna cf_92 (Proyecto Sponsor)
ALTER TABLE redmine_req_clientes 
ADD COLUMN IF NOT EXISTS cf_92 VARCHAR(255) NULL;

COMMENT ON COLUMN redmine_req_clientes.cf_92 IS 'Custom Field 92: Proyecto Sponsor';

-- Actualizar la vista v_req_clientes_completos para incluir los nuevos campos
-- Primero eliminar la vista existente
DROP VIEW IF EXISTS v_req_clientes_completos CASCADE;

-- Crear la vista con la nueva estructura incluyendo cf_91 y cf_92
CREATE VIEW v_req_clientes_completos AS
SELECT 
    r.redmine_id,
    r.titulo,
    r.proyecto_completo,
    r.fecha_creacion,
    r.fecha_real_finalizacion,
    r.total_spent_hours,
    r.estado_redmine,
    r.cf_91,
    r.cf_92,
    r.sincronizado_en,
    rc.id,
    rc.descripcion,
    rc.seccion,
    rc.monto,
    rc.created_at,
    rc.updated_at
FROM redmine_req_clientes r
LEFT JOIN req_clientes rc ON r.redmine_id = rc.redmine_id;

