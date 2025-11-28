-- Script para agregar campo titulo_personalizado a la tabla funcionalidades
-- Este campo permite personalizar el título mostrado, por defecto será igual al título de Redmine

BEGIN;

-- Agregar columna titulo_personalizado a funcionalidades
ALTER TABLE IF EXISTS public.funcionalidades
    ADD COLUMN IF NOT EXISTS titulo_personalizado TEXT;

-- Actualizar los registros existentes para que titulo_personalizado sea igual al titulo de Redmine
-- (se obtiene desde redmine_issues)
UPDATE public.funcionalidades f
SET titulo_personalizado = (
    SELECT r.titulo 
    FROM redmine_issues r 
    WHERE r.redmine_id = f.redmine_id 
    LIMIT 1
)
WHERE f.redmine_id IS NOT NULL 
  AND f.titulo_personalizado IS NULL;

-- Si hay funcionalidades sin redmine_id, usar un valor por defecto basado en el campo titulo si existe
UPDATE public.funcionalidades
SET titulo_personalizado = COALESCE(titulo, 'Nueva funcionalidad')
WHERE titulo_personalizado IS NULL;

COMMIT;

