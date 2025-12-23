-- =====================================================
-- ACTUALIZACIÓN: Soporte para Categorías de Texto
-- =====================================================
-- Ejecutar este SQL en Supabase SQL Editor
-- Fecha: 2025

-- 1. Agregar columna category_type a categories
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS category_type TEXT DEFAULT 'participant_based'
CHECK (category_type IN ('participant_based', 'text_based'));

-- 2. Crear tabla para respuestas de texto (Fase 1)
CREATE TABLE IF NOT EXISTS text_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  submission_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category_id, user_id)
);

-- 3. Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_text_submissions_category
ON text_submissions(category_id);

CREATE INDEX IF NOT EXISTS idx_text_submissions_user
ON text_submissions(user_id);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE text_submissions ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para text_submissions

-- Usuarios pueden crear sus propias submissions
CREATE POLICY "Users can insert their own text submissions"
ON text_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden leer todas las submissions (para mostrar top submissions)
CREATE POLICY "Anyone can view text submissions"
ON text_submissions
FOR SELECT
USING (true);

-- Usuarios pueden actualizar solo sus propias submissions
CREATE POLICY "Users can update their own text submissions"
ON text_submissions
FOR UPDATE
USING (auth.uid() = user_id);

-- Usuarios pueden eliminar solo sus propias submissions
CREATE POLICY "Users can delete their own text submissions"
ON text_submissions
FOR DELETE
USING (auth.uid() = user_id);

-- 6. Comentarios para documentación
COMMENT ON COLUMN categories.category_type IS
'Tipo de categoría: participant_based (voto por participantes) o text_based (escritura de texto en Fase 1)';

COMMENT ON TABLE text_submissions IS
'Almacena respuestas de texto para categorías text_based en Fase 1. En Fase 2, el admin crea participantes con las mejores respuestas.';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecuta esto para verificar que todo funcionó:
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name = 'category_type';

SELECT COUNT(*) as text_submissions_table_exists
FROM information_schema.tables
WHERE table_name = 'text_submissions';

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'text_submissions';
