-- =====================================================
-- ACTUALIZACIÓN SIMPLE: Soporte para Categorías de Duo
-- =====================================================
-- Este enfoque extiende la tabla nominations existente
-- en lugar de crear tablas separadas

-- 1. Actualizar el CHECK constraint de category_type para incluir 'duo'
ALTER TABLE categories
DROP CONSTRAINT IF EXISTS categories_category_type_check;

ALTER TABLE categories
ADD CONSTRAINT categories_category_type_check
CHECK (category_type IN ('participant_based', 'text_based', 'duo'));

-- 2. Agregar columna para el segundo participante en duos
-- (participant_id será el participante 1, duo_participant2_id será el participante 2)
ALTER TABLE nominations
ADD COLUMN IF NOT EXISTS duo_participant2_id UUID REFERENCES participants(id) ON DELETE CASCADE;

-- 3. Crear índice para mejor performance
CREATE INDEX IF NOT EXISTS idx_nominations_duo_participant2
ON nominations(duo_participant2_id);

-- 4. Comentarios para documentación
COMMENT ON COLUMN categories.category_type IS
'Tipo de categoría: participant_based (voto por participantes individuales), text_based (escritura de texto en Fase 1), duo (voto por parejas de participantes)';

COMMENT ON COLUMN nominations.duo_participant2_id IS
'ID del segundo participante en nominaciones tipo duo. NULL para categorías no-duo.';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecuta esto para verificar que todo funcionó:

-- Verificar el constraint actualizado
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'categories' AND con.conname = 'categories_category_type_check';

-- Verificar columna agregada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'nominations' AND column_name = 'duo_participant2_id';
