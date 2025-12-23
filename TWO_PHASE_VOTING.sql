-- Sistema de votación en 2 fases
-- Ejecuta este SQL en Supabase

-- 1. Eliminar tabla votes anterior (si existe)
DROP TABLE IF EXISTS votes CASCADE;

-- 2. Agregar campos de fase a las categorías
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS voting_phase INTEGER DEFAULT 1, -- 1 = Nominación, 2 = Final
ADD COLUMN IF NOT EXISTS phase1_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS phase2_end_date TIMESTAMP WITH TIME ZONE;

-- 3. Agregar campo is_finalist a nominations
ALTER TABLE nominations
ADD COLUMN IF NOT EXISTS is_finalist BOOLEAN DEFAULT false;

-- 4. Crear nueva tabla de votos con soporte para múltiples votos
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nomination_id UUID REFERENCES nominations(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  voter_identifier TEXT NOT NULL,
  voting_phase INTEGER NOT NULL, -- 1 o 2
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_votes_nomination ON votes(nomination_id);
CREATE INDEX IF NOT EXISTS idx_votes_category ON votes(category_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_identifier, category_id, voting_phase);
CREATE INDEX IF NOT EXISTS idx_nominations_finalist ON nominations(is_finalist);

-- 6. Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- 7. Función para obtener top votados por categoría
CREATE OR REPLACE FUNCTION get_top_voted_nominations(
  category_uuid UUID,
  phase INTEGER,
  top_limit INTEGER DEFAULT 4
)
RETURNS TABLE (
  nomination_id UUID,
  vote_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT v.nomination_id, COUNT(v.id) as vote_count
  FROM votes v
  WHERE v.category_id = category_uuid AND v.voting_phase = phase
  GROUP BY v.nomination_id
  ORDER BY vote_count DESC
  LIMIT top_limit;
END;
$$ LANGUAGE plpgsql;

-- 8. Función para marcar finalistas automáticamente
CREATE OR REPLACE FUNCTION mark_top_4_as_finalists(category_uuid UUID)
RETURNS void AS $$
DECLARE
  top_nominations UUID[];
BEGIN
  -- Obtener top 4 IDs
  SELECT ARRAY_AGG(nomination_id)
  INTO top_nominations
  FROM get_top_voted_nominations(category_uuid, 1, 4);

  -- Resetear todos los finalistas de esta categoría
  UPDATE nominations
  SET is_finalist = false
  WHERE category_id = category_uuid;

  -- Marcar top 4 como finalistas
  UPDATE nominations
  SET is_finalist = true
  WHERE id = ANY(top_nominations);
END;
$$ LANGUAGE plpgsql;

-- 9. Función para verificar si un usuario ya votó por X nominados en fase 1
CREATE OR REPLACE FUNCTION get_user_vote_count_phase1(
  category_uuid UUID,
  voter_id TEXT
)
RETURNS INTEGER AS $$
DECLARE
  vote_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT nomination_id)
  INTO vote_count
  FROM votes
  WHERE category_id = category_uuid
    AND voter_identifier = voter_id
    AND voting_phase = 1;

  RETURN vote_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;
