-- Ejecuta este SQL en Supabase para agregar el sistema de votación

-- 1. Crear tabla de votos
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nomination_id UUID REFERENCES nominations(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  voter_identifier TEXT, -- IP o session ID para evitar votos duplicados (opcional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, voter_identifier) -- Solo un voto por categoría por persona
);

-- 2. Habilitar realtime para votos
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- 3. Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_votes_nomination ON votes(nomination_id);
CREATE INDEX IF NOT EXISTS idx_votes_category ON votes(category_id);

-- 4. Función para obtener conteo de votos por nominación
CREATE OR REPLACE FUNCTION get_vote_counts(category_uuid UUID)
RETURNS TABLE (
  nomination_id UUID,
  vote_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT v.nomination_id, COUNT(v.id) as vote_count
  FROM votes v
  WHERE v.category_id = category_uuid
  GROUP BY v.nomination_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
