-- ============================================================
-- NEON-STITCH — Limpieza PRO de duplicados
-- Correr en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Ver duplicados por public_id ANTES de borrar
SELECT
  public_id,
  COUNT(*) as total,
  array_agg(id ORDER BY created_at DESC) as ids,
  array_agg(created_at ORDER BY created_at DESC) as fechas
FROM design_assets
GROUP BY public_id
HAVING COUNT(*) > 1
ORDER BY total DESC;

-- ────────────────────────────────────────────────────────────
-- 2. Eliminar duplicados manteniendo el más reciente
-- ────────────────────────────────────────────────────────────
DELETE FROM design_assets
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY public_id
        ORDER BY created_at DESC
      ) AS rn
    FROM design_assets
  ) sub
  WHERE rn > 1
);

-- 3. También limpia duplicados por URL (misma imagen, distinto public_id)
DELETE FROM design_assets
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY url
        ORDER BY created_at DESC
      ) AS rn
    FROM design_assets
  ) sub
  WHERE rn > 1
);

-- ────────────────────────────────────────────────────────────
-- 4. Agrega constraint para EVITAR duplicados a futuro
-- ────────────────────────────────────────────────────────────
ALTER TABLE design_assets
  DROP CONSTRAINT IF EXISTS unique_public_id;

ALTER TABLE design_assets
  ADD CONSTRAINT unique_public_id UNIQUE (public_id);

ALTER TABLE design_assets
  DROP CONSTRAINT IF EXISTS unique_url;

ALTER TABLE design_assets
  ADD CONSTRAINT unique_url UNIQUE (url);

-- ────────────────────────────────────────────────────────────
-- 5. Agrega columna hash para detección futura
-- ────────────────────────────────────────────────────────────
ALTER TABLE design_assets
  ADD COLUMN IF NOT EXISTS image_hash TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_assets_hash ON design_assets (image_hash)
  WHERE image_hash != '';

-- ────────────────────────────────────────────────────────────
-- 6. Resultado final
-- ────────────────────────────────────────────────────────────
SELECT
  category,
  COUNT(*) as total
FROM design_assets
GROUP BY category
ORDER BY total DESC;
