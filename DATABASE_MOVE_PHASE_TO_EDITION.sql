-- Migración: Mover voting_phase de categories a editions
-- Ejecuta este SQL en tu consola de Supabase

-- 1. Agregar voting_phase a la tabla editions
ALTER TABLE editions
ADD COLUMN voting_phase INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN phase1_end_date TIMESTAMPTZ,
ADD COLUMN phase2_end_date TIMESTAMPTZ;

-- 2. Opcional: Copiar el voting_phase de la primera categoría a la edición
-- (Solo si quieres preservar el estado actual)
UPDATE editions e
SET voting_phase = (
  SELECT c.voting_phase
  FROM categories c
  WHERE c.edition_id = e.id
  ORDER BY c.order
  LIMIT 1
)
WHERE e.is_active = true;

-- 3. Opcional: Eliminar voting_phase de categories
-- (Descomenta estas líneas después de verificar que todo funciona)
-- ALTER TABLE categories DROP COLUMN voting_phase;
-- ALTER TABLE categories DROP COLUMN phase1_end_date;
-- ALTER TABLE categories DROP COLUMN phase2_end_date;

-- 4. Agregar índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_editions_voting_phase ON editions(voting_phase);

-- 5. Comentario para documentar el cambio
COMMENT ON COLUMN editions.voting_phase IS 'Fase de votación global: 1=Nominación Popular, 2=Votación Final';
