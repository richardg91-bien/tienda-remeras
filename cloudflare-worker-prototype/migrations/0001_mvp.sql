PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL CHECK (length(first_name) BETWEEN 1 AND 50),
  last_name TEXT NOT NULL CHECK (length(last_name) BETWEEN 1 AND 50),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  refresh_token_hash TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
  avatar_url TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(address)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_models (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('textil', 'sublimacion')),
  name TEXT NOT NULL,
  variant_schema TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(variant_schema)),
  print_surfaces TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(print_surfaces)),
  production_template TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(production_template)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS design_projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Proyecto sin título' CHECK (length(name) <= 120),
  product_ref TEXT NOT NULL DEFAULT 'tee-classic' REFERENCES product_models(id),
  product_category TEXT NOT NULL CHECK (product_category IN ('textil', 'sublimacion')),
  variant TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(variant)),
  canvas TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(canvas)),
  preview_url TEXT NOT NULL DEFAULT '',
  production TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(production)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_design_projects_owner_updated
  ON design_projects (owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  client_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (client_key, window_start)
);

INSERT OR IGNORE INTO product_models
  (id, category, name, variant_schema, print_surfaces, production_template, active, created_at, updated_at)
VALUES
  ('tee-classic', 'textil', 'Remera clásica',
   '{"sizes":["XS","S","M","L","XL","XXL"],"colors":[]}',
   '[{"id":"front","label":"Frente","widthMm":300,"heightMm":400},{"id":"back","label":"Espalda","widthMm":300,"heightMm":400}]',
   '{"resolutionDpi":300,"bleedMm":3,"safeMarginMm":5,"format":"PNG","colorMode":"sRGB"}',
   1, '2026-11-27T00:00:00.000Z', '2026-11-27T00:00:00.000Z');
