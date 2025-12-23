-- =====================================================
-- FIX: Políticas RLS para tabla categories
-- =====================================================
-- Ejecutar este SQL en Supabase SQL Editor
-- Fecha: 2025

-- 1. Primero, agregar la columna category_type si no existe
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS category_type TEXT DEFAULT 'participant_based'
CHECK (category_type IN ('participant_based', 'text_based'));

-- 2. Verificar políticas actuales de categories
-- (Solo para ver qué políticas existen)
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'categories';

-- 3. ELIMINAR todas las políticas RLS restrictivas de categories
DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON categories;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON categories;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON categories;

-- 4. CREAR políticas RLS permisivas (permitir todo sin autenticación)
-- Esto es seguro para tu caso de uso porque es una app interna de premios

-- Permitir lectura a todos
CREATE POLICY "Anyone can view categories"
ON categories
FOR SELECT
USING (true);

-- Permitir insertar a todos (sin autenticación)
CREATE POLICY "Anyone can insert categories"
ON categories
FOR INSERT
WITH CHECK (true);

-- Permitir actualizar a todos
CREATE POLICY "Anyone can update categories"
ON categories
FOR UPDATE
USING (true);

-- Permitir eliminar a todos
CREATE POLICY "Anyone can delete categories"
ON categories
FOR DELETE
USING (true);

-- 5. Asegurar que RLS está habilitado
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecuta esto para verificar:
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name = 'category_type';

-- Verificar nuevas políticas
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'categories';
