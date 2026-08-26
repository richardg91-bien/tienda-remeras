-- ============================================================
-- NEON-STITCH — Limpiar duplicados en Supabase
-- Correr en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Ver cuántos duplicados hay (mismo url o mismo bytes+width+height)
SELECT
  url,
  COUNT(*) as total,
  array_agg(id) as ids
FROM design_assets
GROUP BY url
HAVING COUNT(*) > 1
ORDER BY total DESC;

-- 2. Eliminar duplicados manteniendo el registro más reciente
-- (deja el de mayor id, borra los anteriores)
DELETE FROM design_assets
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY url
        ORDER BY created_at DESC
      ) as rn
    FROM design_assets
  ) sub
  WHERE rn > 1
);

-- 3. También limpia duplicados por public_id
DELETE FROM design_assets
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY public_id
        ORDER BY created_at DESC
      ) as rn
    FROM design_assets
  ) sub
  WHERE rn > 1
);

-- 4. Verifica el resultado final
SELECT
  category,
  COUNT(*) as total
FROM design_assets
GROUP BY category
ORDER BY total DESC;
