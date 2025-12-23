-- IMPORTANTE: Ejecuta este SQL en Supabase para actualizar la estructura

-- 1. Crear tabla de ediciones
CREATE TABLE IF NOT EXISTS editions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  year INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla de participantes (pool global)
CREATE TABLE IF NOT EXISTS participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Modificar tabla categories para asociarla con ediciones
ALTER TABLE categories ADD COLUMN IF NOT EXISTS edition_id UUID REFERENCES editions(id) ON DELETE CASCADE;

-- 4. Modificar tabla nominees para referenciar participantes en vez de tener datos duplicados
-- Primero, crear la nueva tabla de nominaciones
CREATE TABLE IF NOT EXISTS nominations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_id, category_id) -- No se puede nominar la misma persona dos veces en la misma categoría
);

-- 5. Habilitar realtime para las nuevas tablas
ALTER PUBLICATION supabase_realtime ADD TABLE editions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE nominations;

-- 6. Migrar datos existentes (si los hay)
-- Crear una edición por defecto
INSERT INTO editions (name, description, year, is_active)
VALUES ('Edición 2024', 'Primera edición de premios', 2024, true)
ON CONFLICT DO NOTHING;

-- Asociar categorías existentes con la edición por defecto
UPDATE categories
SET edition_id = (SELECT id FROM editions ORDER BY created_at LIMIT 1)
WHERE edition_id IS NULL;

-- Migrar nominados existentes a participantes y nominaciones
DO $$
DECLARE
  nominee_record RECORD;
  participant_uuid UUID;
BEGIN
  FOR nominee_record IN SELECT * FROM nominees LOOP
    -- Crear participante si no existe
    INSERT INTO participants (name, description, image_url)
    VALUES (nominee_record.name, nominee_record.description, nominee_record.image_url)
    ON CONFLICT DO NOTHING
    RETURNING id INTO participant_uuid;

    -- Si no se insertó (ya existía), obtener el id
    IF participant_uuid IS NULL THEN
      SELECT id INTO participant_uuid FROM participants
      WHERE name = nominee_record.name LIMIT 1;
    END IF;

    -- Crear nominación
    INSERT INTO nominations (participant_id, category_id, is_winner)
    VALUES (participant_uuid, nominee_record.category_id, nominee_record.is_winner)
    ON CONFLICT (participant_id, category_id) DO NOTHING;
  END LOOP;
END $$;

-- 7. Opcional: Puedes mantener la tabla nominees vieja o eliminarla
-- DROP TABLE IF EXISTS nominees; -- Descomenta si quieres eliminarla

-- 8. Insertar datos de ejemplo si no hay nada
INSERT INTO participants (name, description, image_url)
SELECT * FROM (VALUES
  ('Baldur''s Gate 3', 'RPG épico de fantasía', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400'),
  ('Zelda: Tears of the Kingdom', 'Aventura de mundo abierto', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400'),
  ('Alan Wake 2', 'Thriller psicológico', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400'),
  ('Spider-Man 2', 'Acción y aventura', 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=400'),
  ('Resident Evil 4 Remake', 'Survival horror', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400')
) AS v(name, description, image_url)
WHERE NOT EXISTS (SELECT 1 FROM participants);

COMMIT;
