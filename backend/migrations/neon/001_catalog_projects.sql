-- Additive PostgreSQL migration for Neon and the restored local lab.
-- Does not touch Supabase Storage, existing rows, or current application config.

ALTER TABLE public.design_assets ADD COLUMN IF NOT EXISTS image_hash TEXT;
ALTER TABLE public.design_assets ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.design_assets ADD COLUMN IF NOT EXISTS license TEXT;
ALTER TABLE public.design_assets ADD COLUMN IF NOT EXISTS formats TEXT[];
ALTER TABLE public.design_assets ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.design_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_design_assets_image_hash
  ON public.design_assets (image_hash) WHERE image_hash IS NOT NULL AND image_hash <> '';
CREATE INDEX IF NOT EXISTS idx_design_assets_category_subcategory
  ON public.design_assets (category, subcategory);

CREATE TABLE IF NOT EXISTS public.product_models (
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

CREATE TABLE IF NOT EXISTS public.design_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
  ON public.design_projects (owner_id, updated_at DESC);

ALTER TABLE public.design_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_projects FORCE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'design_projects'
      AND policyname = 'design_projects_owner_context'
  ) THEN
    CREATE POLICY design_projects_owner_context ON public.design_projects
      USING (owner_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
      WITH CHECK (owner_id = NULLIF(current_setting('app.user_id', true), '')::uuid);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.touch_design_project_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'design_projects_updated_at'
      AND tgrelid = 'public.design_projects'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER design_projects_updated_at
      BEFORE UPDATE ON public.design_projects
      FOR EACH ROW EXECUTE FUNCTION public.touch_design_project_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.asset_product_links (
  asset_id UUID NOT NULL REFERENCES public.design_assets(id) ON DELETE CASCADE,
  product_model_id TEXT NOT NULL REFERENCES public.product_models(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, product_model_id)
);

INSERT INTO public.product_models (id, category, name, variant_schema, print_surfaces, production_template)
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

-- Supabase-compatible local role grants are optional. Neon deployments should
-- grant these objects to the dedicated backend role as part of provisioning.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT ON public.product_models TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_projects TO authenticated';
  END IF;
END $$;
