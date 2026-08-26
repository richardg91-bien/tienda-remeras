-- ============================================================
-- NEON-STITCH — Categorización del banco de imágenes
-- Correr en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Streetwear (cartoons de acción, velocidad, urbano)
UPDATE design_assets SET category = 'streetwear', tags = ARRAY['streetwear','retro','cartoon']
WHERE public_id ILIKE ANY(ARRAY[
  '%thunder%','%hawk%','%speed%','%racer%','%ghost%','%ninja%',
  '%falcao%','%thundarr%','%muttley%','%dastardly%','%jonny%',
  '%silver%','%marine%','%shazzan%','%bionic%','%imposible%',
  '%comando%','%centella%','%diseno%'
]);

-- Cyberpunk / Sci-Fi
UPDATE design_assets SET category = 'cyberpunk', tags = ARRAY['cyberpunk','sci-fi','retro']
WHERE public_id ILIKE ANY(ARRAY[
  '%space%','%star%','%trek%','%gekko%','%kamen%',
  '%gatchaman%','%dororo%','%hyakkimaru%'
]);

-- Logos / Héroes / Posters
UPDATE design_assets SET category = 'logos', tags = ARRAY['logo','poster','retro','heroe']
WHERE public_id ILIKE ANY(ARRAY[
  '%poster%','%album%','%capitan%','%hercules%','%mighty%',
  '%coloring%','%collector%','%edition%','%style%'
]);

-- Minimalista (los t-shirt básicos)
UPDATE design_assets SET category = 'minimalista', tags = ARRAY['minimal','basico','remera']
WHERE public_id ILIKE ANY(ARRAY[
  '%standard%','%classic%','%basic%','%everyday%','%traditional%'
]);

-- Verifica la distribución final
SELECT category, COUNT(*) as total
FROM design_assets
GROUP BY category
ORDER BY total DESC;
