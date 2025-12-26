-- Agregar campo para sincronizar la categoría actual mostrada en /display
-- Ejecuta este SQL en tu consola de Supabase

ALTER TABLE editions
ADD COLUMN current_display_category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Opcional: Crear un índice para mejorar el rendimiento
CREATE INDEX idx_editions_current_display_category ON editions(current_display_category_id);
