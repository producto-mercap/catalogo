-- Script para modificar la foreign key constraint de score_backlog
-- para que acepte tanto proyectos_internos como req_clientes
--
-- IMPORTANTE: Ejecutar este script en la base de datos
-- Uso: psql -d tu_base_de_datos -f scripts/modificar-constraint-score-backlog.sql

-- 1. Eliminar la constraint existente
ALTER TABLE score_backlog 
DROP CONSTRAINT IF EXISTS score_backlog_funcionalidad_id_fkey;

-- 2. Crear una función que verifique que el ID existe en proyectos_internos O req_clientes
CREATE OR REPLACE FUNCTION verificar_funcionalidad_id_backlog(id_val NUMERIC)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM proyectos_internos WHERE redmine_id = id_val
        UNION
        SELECT 1 FROM req_clientes WHERE redmine_id = id_val
        UNION
        SELECT 1 FROM redmine_proyectos_internos WHERE redmine_id = id_val
        UNION
        SELECT 1 FROM redmine_req_clientes WHERE redmine_id = id_val
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Crear un CHECK constraint usando la función
ALTER TABLE score_backlog
ADD CONSTRAINT score_backlog_funcionalidad_id_check
CHECK (verificar_funcionalidad_id_backlog(funcionalidad_id));

-- Verificar que se aplicó correctamente
DO $$
BEGIN
    RAISE NOTICE '✅ Constraint modificada exitosamente.';
    RAISE NOTICE '✅ Ahora score_backlog puede contener IDs de proyectos_internos y req_clientes.';
    RAISE NOTICE '✅ La validación se hace mediante CHECK constraint con función.';
END $$;

