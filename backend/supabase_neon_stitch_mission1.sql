-- Migración incremental NEON-STITCH. Aplicar manualmente en Supabase SQL Editor.
-- No elimina ni reemplaza filas existentes. La API usa JWT propio y service_role;
-- las políticas RLS bloquean el acceso directo desde anon.

CREATE TABLE IF NOT EXISTS design_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'Sin nombre',
  url TEXT NOT NULL DEFAULT '',
  public_id TEXT NOT NULL DEFAULT '',
  image_hash TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  format TEXT NOT NULL DEFAULT '',
  bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Sin nombre';
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS url TEXT NOT NULL DEFAULT '';
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS public_id TEXT NOT NULL DEFAULT '';
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS image_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS width INTEGER NOT NULL DEFAULT 0;
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS height INTEGER NOT NULL DEFAULT 0;
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT '';
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS bytes BIGINT NOT NULL DEFAULT 0;
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS subcategory TEXT NOT NULL DEFAULT '';
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS license TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS formats TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE design_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_design_assets_image_hash
  ON design_assets (image_hash) WHERE image_hash IS NOT NULL AND image_hash <> '';
CREATE INDEX IF NOT EXISTS idx_design_assets_category_subcategory
  ON design_assets (category, subcategory);
ALTER TABLE design_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon_design_assets ON design_assets;
CREATE POLICY deny_anon_design_assets ON design_assets FOR ALL TO anon USING (false);

CREATE TABLE IF NOT EXISTS design_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Proyecto sin título' CHECK (char_length(name) <= 120),
  product_ref TEXT NOT NULL DEFAULT 'tee-classic',
  product_category TEXT NOT NULL DEFAULT 'textil' CHECK (product_category IN ('textil','sublimacion')),
  variant JSONB NOT NULL DEFAULT '{}'::jsonb,
  canvas JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_url TEXT NOT NULL DEFAULT '',
  production JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_design_projects_owner_updated
  ON design_projects(owner_id, updated_at DESC);
ALTER TABLE design_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon_design_projects ON design_projects;
CREATE POLICY deny_anon_design_projects ON design_projects FOR ALL TO anon USING (false);

CREATE TABLE IF NOT EXISTS product_models (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('textil','sublimacion')),
  name TEXT NOT NULL,
  variant_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  print_surfaces JSONB NOT NULL DEFAULT '[]'::jsonb,
  production_template JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE product_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon_product_models ON product_models;
CREATE POLICY deny_anon_product_models ON product_models FOR ALL TO anon USING (false);

INSERT INTO product_models (id, category, name, variant_schema, print_surfaces, production_template)
VALUES
('tee-classic', 'textil', 'Remera clásica',
 '{"sizes":["XS","S","M","L","XL","XXL"],"colors":[]}'::jsonb,
 '[{"id":"front","label":"Frente","widthMm":300,"heightMm":400},{"id":"back","label":"Espalda","widthMm":300,"heightMm":400}]'::jsonb,
 '{"resolutionDpi":300,"bleedMm":3,"safeMarginMm":5,"format":"PNG","colorMode":"sRGB"}'::jsonb),
('mug-standard', 'sublimacion', 'Taza estándar',
 '{"capacityMl":350,"colors":[]}'::jsonb,
 '[{"id":"wrap","label":"Área envolvente","widthMm":200,"heightMm":90,"curved":true}]'::jsonb,
 '{"resolutionDpi":300,"bleedMm":2,"safeMarginMm":5,"format":"PNG","colorMode":"sRGB"}'::jsonb),
('plate-standard', 'sublimacion', 'Plato estándar',
 '{"diameterMm":200}'::jsonb,
 '[{"id":"top","label":"Cara superior","diameterMm":180}]'::jsonb,
 '{"resolutionDpi":300,"bleedMm":3,"safeMarginMm":5,"format":"PNG","colorMode":"sRGB"}'::jsonb),
('bottle-standard', 'sublimacion', 'Botella estándar',
 '{"capacityMl":600,"colors":[]}'::jsonb,
 '[{"id":"wrap","label":"Área envolvente","widthMm":210,"heightMm":140,"curved":true}]'::jsonb,
 '{"resolutionDpi":300,"bleedMm":2,"safeMarginMm":5,"format":"PNG","colorMode":"sRGB"}'::jsonb),
('glass-standard', 'sublimacion', 'Vaso estándar',
 '{"capacitiesMl":[350,500],"colors":[]}'::jsonb,
 '[{"id":"wrap","label":"Área envolvente","widthMm":190,"heightMm":110,"curved":true}]'::jsonb,
 '{"resolutionDpi":300,"bleedMm":2,"safeMarginMm":5,"format":"PNG","colorMode":"sRGB"}'::jsonb),
('cooler-standard', 'sublimacion', 'Cooler estándar',
 '{"capacitiesMl":[350,473],"colors":[]}'::jsonb,
 '[{"id":"wrap","label":"Área envolvente","widthMm":240,"heightMm":105,"curved":true}]'::jsonb,
 '{"resolutionDpi":300,"bleedMm":2,"safeMarginMm":5,"format":"PNG","colorMode":"sRGB"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Bucket privado. Las cargas se guardan como {user_id}/{uuid}_{filename};
-- el backend genera URLs firmadas después de verificar la propiedad.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('customer-designs', 'customer-designs', false, 20971520,
        ARRAY['image/png','image/jpeg','image/webp','image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Vínculos de impresión reutilizan los mismos registros de design_assets.
CREATE TABLE IF NOT EXISTS asset_product_links (
  asset_id UUID NOT NULL REFERENCES design_assets(id) ON DELETE CASCADE,
  product_model_id TEXT NOT NULL REFERENCES product_models(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, product_model_id)
);
ALTER TABLE asset_product_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon_asset_product_links ON asset_product_links;
CREATE POLICY deny_anon_asset_product_links ON asset_product_links FOR ALL TO anon USING (false);
