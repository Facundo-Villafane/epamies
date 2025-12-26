-- SQL para verificar las nominaciones y sus relaciones
-- Ejecuta esto en la consola SQL de Supabase para debugear

-- 1. Ver todas las nominaciones con los datos del participante
SELECT
  n.id,
  n.category_id,
  n.participant_id,
  n.duo_participant2_id,
  n.is_winner,
  n.is_finalist,
  p.name as participant_name,
  c.name as category_name,
  c.category_type
FROM nominations n
LEFT JOIN participants p ON n.participant_id = p.id
LEFT JOIN categories c ON n.category_id = c.id
ORDER BY c.order, p.name;

-- 2. Contar nominaciones por categoría
SELECT
  c.name as category_name,
  c.category_type,
  COUNT(n.id) as nomination_count
FROM categories c
LEFT JOIN nominations n ON c.id = n.category_id
WHERE c.edition_id = (SELECT id FROM editions WHERE is_active = true LIMIT 1)
GROUP BY c.id, c.name, c.category_type
ORDER BY c.order;

-- 3. Verificar si hay participant_id NULL
SELECT COUNT(*) as nominations_with_null_participant
FROM nominations
WHERE participant_id IS NULL;
