-- =====================================================
-- ACTUALIZACIÓN: Soporte para Categorías de Duo/Pareja
-- =====================================================
-- Ejecutar este SQL en Supabase SQL Editor
-- Fecha: 2025

-- 1. Actualizar el CHECK constraint de category_type para incluir 'duo'
ALTER TABLE categories
DROP CONSTRAINT IF EXISTS categories_category_type_check;

ALTER TABLE categories
ADD CONSTRAINT categories_category_type_check
CHECK (category_type IN ('participant_based', 'text_based', 'duo'));

-- 2. Crear tabla para almacenar los duos/parejas
CREATE TABLE IF NOT EXISTS duos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant1_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  duo_name TEXT, -- Nombre opcional para el duo, ej: "Facundo & Lucía"
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(participant1_id, participant2_id),
  CHECK (participant1_id != participant2_id) -- No puede ser el mismo participante
);

-- 3. Crear tabla para nominaciones de duos
-- Esta tabla relaciona un duo con una categoría
CREATE TABLE IF NOT EXISTS duo_nominations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duo_id UUID NOT NULL REFERENCES duos(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_winner BOOLEAN DEFAULT false,
  is_finalist BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(duo_id, category_id)
);

-- 4. Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_duos_participant1
ON duos(participant1_id);

CREATE INDEX IF NOT EXISTS idx_duos_participant2
ON duos(participant2_id);

CREATE INDEX IF NOT EXISTS idx_duo_nominations_duo
ON duo_nominations(duo_id);

CREATE INDEX IF NOT EXISTS idx_duo_nominations_category
ON duo_nominations(category_id);

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE duos ENABLE ROW LEVEL SECURITY;
ALTER TABLE duo_nominations ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS permisivas para duos (sin autenticación)
CREATE POLICY "Anyone can view duos"
ON duos
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert duos"
ON duos
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update duos"
ON duos
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete duos"
ON duos
FOR DELETE
USING (true);

-- 7. Políticas RLS permisivas para duo_nominations
CREATE POLICY "Anyone can view duo nominations"
ON duo_nominations
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert duo nominations"
ON duo_nominations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update duo nominations"
ON duo_nominations
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete duo nominations"
ON duo_nominations
FOR DELETE
USING (true);

-- 8. Tabla para votos de duos (similar a la tabla votes existente)
CREATE TABLE IF NOT EXISTS duo_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duo_nomination_id UUID NOT NULL REFERENCES duo_nominations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  voter_identifier TEXT NOT NULL,
  voting_phase INTEGER NOT NULL CHECK (voting_phase IN (1, 2)),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_duo_votes_nomination
ON duo_votes(duo_nomination_id);

CREATE INDEX IF NOT EXISTS idx_duo_votes_category
ON duo_votes(category_id);

CREATE INDEX IF NOT EXISTS idx_duo_votes_voter
ON duo_votes(voter_identifier, category_id, voting_phase);

ALTER TABLE duo_votes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para duo_votes
CREATE POLICY "Anyone can view duo votes"
ON duo_votes
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert duo votes"
ON duo_votes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete duo votes"
ON duo_votes
FOR DELETE
USING (true);

-- 9. Comentarios para documentación
COMMENT ON COLUMN categories.category_type IS
'Tipo de categoría: participant_based (voto por participantes individuales), text_based (escritura de texto en Fase 1), duo (voto por parejas/duos de participantes)';

COMMENT ON TABLE duos IS
'Almacena parejas/duos de participantes para categorías tipo duo';

COMMENT ON TABLE duo_nominations IS
'Almacena nominaciones de duos a categorías tipo duo';

COMMENT ON TABLE duo_votes IS
'Almacena votos para nominaciones de duos';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecuta esto para verificar que todo funcionó:

-- Verificar el constraint actualizado
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'categories' AND con.conname = 'categories_category_type_check';

-- Verificar tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('duos', 'duo_nominations', 'duo_votes')
ORDER BY table_name;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('duos', 'duo_nominations', 'duo_votes')
ORDER BY tablename, policyname;
