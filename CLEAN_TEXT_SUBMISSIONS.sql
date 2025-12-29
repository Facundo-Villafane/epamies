-- Limpiar todos los text_submissions existentes
-- Esto permite que los usuarios vuelvan a votar en categorías de texto
-- con el nuevo sistema basado en auth.email()

-- 1. Eliminar todos los registros existentes
TRUNCATE TABLE text_submissions;

-- Listo! Ahora los usuarios pueden votar de nuevo en categorías de texto
-- El sistema usará auth.email() automáticamente gracias a las políticas RLS
