-- Agregar política para que admins puedan ver TODOS los text_submissions
-- Esto permite que en /admin/votes-audit se vean todos los votos de texto

-- 1. Crear política para lectura de admin
CREATE POLICY "Admins can read all text submissions"
ON text_submissions
FOR SELECT
USING (
  -- Permite ver todos los registros si el usuario es admin
  -- Cambia estos emails por los emails de tus admins
  auth.email() IN (
    'facundo.tnd@gmail.com'
    -- Agrega más emails de admins aquí si es necesario
    -- 'otro-admin@gmail.com',
    -- 'admin2@gmail.com'
  )
  OR
  -- O permite ver sus propios registros (política existente)
  user_id = auth.email()
);

-- 2. Eliminar la política antigua de lectura para evitar conflictos
DROP POLICY IF EXISTS "Users can read own submissions" ON text_submissions;

-- 3. También crear política para que admins puedan eliminar cualquier submission
CREATE POLICY "Admins can delete any text submission"
ON text_submissions
FOR DELETE
USING (
  auth.email() IN (
    'facundo.tnd@gmail.com'
    -- Agrega más emails de admins aquí
  )
);
