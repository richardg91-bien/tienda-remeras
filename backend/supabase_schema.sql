-- ============================================================
-- NEON-STITCH — Schema SQL para Supabase
-- Correr en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- búsqueda fuzzy en textos

-- ============================================================
-- TABLA: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identidad
  first_name        TEXT        NOT NULL CHECK (char_length(first_name) <= 50),
  last_name         TEXT        NOT NULL CHECK (char_length(last_name)  <= 50),
  email             TEXT        NOT NULL UNIQUE CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  phone             TEXT        DEFAULT '',

  -- Seguridad (JWT propio — no usa Supabase Auth)
  password_hash     TEXT        NOT NULL,
  role              TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_verified       BOOLEAN     NOT NULL DEFAULT FALSE,
  refresh_token     TEXT        DEFAULT '',

  -- Perfil
  avatar_url        TEXT        DEFAULT '',
  avatar_public_id  TEXT        DEFAULT '',
  bio               TEXT        DEFAULT '' CHECK (char_length(bio) <= 200),

  -- Dirección (JSON embebido)
  address           JSONB       NOT NULL DEFAULT '{
    "street":   "",
    "city":     "",
    "province": "",
    "zip":      "",
    "country":  "Argentina"
  }'::jsonb,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices: users ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users (role);

-- ── Trigger: actualiza updated_at automáticamente ─────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLA: designs
-- ============================================================
CREATE TABLE IF NOT EXISTS designs (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Propietario
  owner_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Imagen (almacenada en Cloudinary)
  image_url        TEXT        NOT NULL,
  image_public_id  TEXT        NOT NULL,
  image_meta       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  -- image_meta contiene: { width, height, format, bytes }

  -- Metadata
  title            TEXT        NOT NULL CHECK (char_length(title) <= 80),
  description      TEXT        DEFAULT '' CHECK (char_length(description) <= 300),
  tags             TEXT[]      DEFAULT '{}',
  category         TEXT        NOT NULL DEFAULT 'otro'
                               CHECK (category IN (
                                 'cyberpunk','minimalista','streetwear',
                                 'genesis','anime','abstracto','otro'
                               )),

  -- Estado
  is_public        BOOLEAN     NOT NULL DEFAULT FALSE,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected')),

  -- Stats
  likes            INTEGER     NOT NULL DEFAULT 0 CHECK (likes >= 0),
  views            INTEGER     NOT NULL DEFAULT 0 CHECK (views >= 0),

  -- Timestamps
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices: designs ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_designs_owner     ON designs (owner_id);
CREATE INDEX IF NOT EXISTS idx_designs_category  ON designs (category);
CREATE INDEX IF NOT EXISTS idx_designs_public    ON designs (is_public, status);
CREATE INDEX IF NOT EXISTS idx_designs_tags      ON designs USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_designs_title_trgm ON designs USING GIN (title gin_trgm_ops);

CREATE OR REPLACE TRIGGER designs_updated_at
  BEFORE UPDATE ON designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLA: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Usuario (nullable = compra como invitado)
  user_id            UUID        REFERENCES users(id) ON DELETE SET NULL,
  guest_email        TEXT        DEFAULT '',

  -- Productos (array de objetos JSON)
  -- Cada item: { product_id, name, price, quantity, selected_size, image }
  items              JSONB       NOT NULL DEFAULT '[]'::jsonb,

  -- Montos
  subtotal           NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  shipping           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping >= 0),
  total              NUMERIC(12,2) NOT NULL CHECK (total >= 0),

  -- MercadoPago
  mp_preference_id   TEXT        DEFAULT '',
  mp_payment_id      TEXT        DEFAULT '',
  mp_status          TEXT        DEFAULT '',

  -- Estado de la orden
  status             TEXT        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN (
                                   'pending','paid','processing',
                                   'shipped','delivered','cancelled','refunded'
                                 )),

  -- Dirección de envío
  shipping_address   JSONB       NOT NULL DEFAULT '{
    "street":   "",
    "city":     "",
    "province": "",
    "zip":      "",
    "country":  "Argentina"
  }'::jsonb,

  -- Método de pago
  payment_method     TEXT        NOT NULL DEFAULT 'mercadopago'
                                 CHECK (payment_method IN ('mercadopago','whatsapp','transfer')),

  -- Notas internas
  notes              TEXT        DEFAULT '',

  -- Timestamps
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices: orders ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_mp_pref_id ON orders (mp_preference_id);
CREATE INDEX IF NOT EXISTS idx_orders_created    ON orders (created_at DESC);

CREATE OR REPLACE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS (Row Level Security)
-- Como usamos JWT propio (no Supabase Auth), el backend accede
-- con la service_role key que bypasea RLS.
-- Habilitamos RLS de todas formas para bloquear acceso directo
-- desde el frontend si alguien intenta usar la anon key.
-- ============================================================
ALTER TABLE users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders  ENABLE ROW LEVEL SECURITY;

-- Bloquea todo acceso anon directo (el backend usa service_role)
CREATE POLICY "deny_anon_users"   ON users   FOR ALL TO anon USING (false);
CREATE POLICY "deny_anon_designs" ON designs FOR ALL TO anon USING (false);
CREATE POLICY "deny_anon_orders"  ON orders  FOR ALL TO anon USING (false);

-- ============================================================
-- VISTA: designs_public
-- Consulta rápida de diseños aprobados para la galería
-- ============================================================
CREATE OR REPLACE VIEW designs_public AS
  SELECT
    d.id, d.title, d.description, d.tags, d.category,
    d.image_url, d.image_meta, d.likes, d.views, d.created_at,
    u.id   AS owner_id,
    u.first_name || ' ' || u.last_name AS owner_name,
    u.avatar_url AS owner_avatar
  FROM designs d
  JOIN users u ON u.id = d.owner_id
  WHERE d.is_public = TRUE AND d.status = 'approved';

-- ============================================================
-- DATOS DE PRUEBA (opcional — comentar en producción)
-- ============================================================
-- INSERT INTO users (first_name, last_name, email, password_hash, role)
-- VALUES ('Admin', 'NEON', 'admin@neonstitch.com', 'HASH_AQUI', 'admin');
