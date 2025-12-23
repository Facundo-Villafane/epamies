-- ============================================
-- CONFIGURACIÓN DE SUPABASE STORAGE
-- ============================================
-- Ejecuta esto en Supabase → Storage → Policies
-- para habilitar la subida de imágenes

-- 1. Crear bucket 'images' si no existe
-- Ve a: Storage → Create bucket
-- Nombre: images
-- Public: ✓ (checked)

-- 2. Ejecutar las siguientes políticas en SQL Editor:

-- Permitir lectura pública de todas las imágenes
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Permitir subida de imágenes (cualquiera puede subir)
CREATE POLICY "Allow uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'images');

-- Permitir actualizar imágenes
CREATE POLICY "Allow updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'images');

-- Permitir borrar imágenes
CREATE POLICY "Allow deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'images');

-- ============================================
-- NOTAS:
-- ============================================
-- ⚠️ IMPORTANTE: Estas políticas permiten que CUALQUIERA suba archivos.
-- Esto está bien para un MVP o uso personal, pero para producción
-- deberías agregar autenticación.
--
-- Para producción, cambia las políticas a algo como:
-- WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated')
--
-- Estructura de carpetas:
-- - images/
--   - participants/   (imágenes de participantes)
--   - categories/     (podrías agregar imágenes para categorías)
--
-- La app automáticamente sube a: images/participants/
