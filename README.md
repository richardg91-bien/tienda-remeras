# NEON-STITCH — Tienda de Remeras con Design Studio

Plataforma e-commerce de remeras con diseñador 3D interactivo, banco de imágenes, asistente IA y checkout integrado con MercadoPago.

---

## Stack Tecnológico

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| React | 19 | Framework UI |
| Vite | 8 | Build tool |
| Tailwind CSS | 3 | Estilos utilitarios |
| Framer Motion | 13 | Animaciones |
| React Router DOM | 7 | Navegación SPA |
| Three.js + React Three Fiber | 0.185 / 9 | Modelo 3D de la remera |
| React Three Drei | 10 | Helpers para Three.js |
| Fabric.js | 7 | Canvas 2D editable |
| Redux Toolkit + React Redux | 2 / 9 | Estado del Design Studio |

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 24 | Runtime |
| Express | 5 | Framework HTTP |
| Supabase JS | 2 | Cliente base de datos |
| Cloudinary | 2 | Almacenamiento de imágenes |
| Multer | 2 | Manejo de uploads |
| bcryptjs | 3 | Hash de contraseñas |
| jsonwebtoken | 9 | Autenticación JWT |
| MercadoPago SDK | 3 | Pagos |
| express-validator | 7 | Validación de inputs |
| express-rate-limit | 8 | Rate limiting |
| cookie-parser | 1 | Cookies httpOnly |
| axios | 1 | HTTP requests |

### Base de Datos e Infraestructura
| Servicio | Uso |
|---|---|
| Supabase (PostgreSQL) | Base de datos principal |
| Cloudinary | CDN + almacenamiento de imágenes |
| MercadoPago | Procesamiento de pagos |

---

## Estructura del Proyecto

```
tienda-remeras/
│
├── src/                          # Frontend React
│   ├── components/
│   │   ├── Navbar.jsx            # Navegación + sesión de usuario
│   │   ├── Hero.jsx              # Sección hero animada
│   │   ├── Cart.jsx              # Drawer carrito lateral
│   │   ├── ProductCard.jsx       # Card de producto
│   │   ├── Products.jsx          # Grid de productos
│   │   ├── AIAssistant.jsx       # Chat IA flotante
│   │   ├── StyleQuiz.jsx         # Quiz de estilo
│   │   └── ProtectedRoute.jsx    # Rutas protegidas
│   │
│   ├── pages/
│   │   ├── Home.jsx              # Landing page
│   │   ├── Catalogo.jsx          # Catálogo con filtros
│   │   ├── Galeria.jsx           # Galería del banco de imágenes
│   │   ├── Disenar.jsx           # Design Studio 3D
│   │   ├── Login.jsx             # Inicio de sesión
│   │   ├── Register.jsx          # Registro (2 pasos)
│   │   └── Perfil.jsx            # Perfil + historial de órdenes
│   │
│   ├── context/
│   │   ├── CartContext.jsx       # Estado global del carrito
│   │   └── AuthContext.jsx       # Estado global de autenticación
│   │
│   ├── data/
│   │   └── products.js           # Catálogo de productos
│   │
│   └── designer/                 # Módulo Design Studio (aislado)
│       ├── components/
│       │   ├── TshirtModel.jsx   # Modelo 3D con React Three Fiber
│       │   ├── TshirtCanvas.jsx  # Canvas 2D con Fabric.js
│       │   ├── DesignTools.jsx   # Herramientas de diseño
│       │   └── AssetLibrary.jsx  # Biblioteca de imágenes
│       ├── hooks/
│       │   ├── useCanvas.jsx             # Context del canvas
│       │   ├── useTshirtCanvas.jsx       # Inicialización Fabric.js
│       │   └── useCanvasTextureSync.jsx  # Sync canvas 2D → textura 3D
│       ├── store/
│       │   ├── designerStore.js  # Redux store aislado
│       │   └── designerSlice.js  # Color, vista, tipo de remera
│       ├── utils/
│       │   ├── canvasStorageManager.js  # Persistencia en localStorage
│       │   └── canvasSyncManager.js     # Sincronización de texturas
│       └── constants/
│           └── designConstants.js       # Colores, fuentes, SVG paths
│
├── backend/
│   ├── config/
│   │   ├── supabase.js           # Cliente Supabase (service_role)
│   │   └── cloudinary.js         # Config Cloudinary + multer
│   │
│   ├── middleware/
│   │   └── auth.js               # JWT protect / adminOnly / optionalAuth
│   │
│   ├── controllers/
│   │   ├── authController.js     # register, login, logout, refresh, me
│   │   ├── userController.js     # perfil, avatar, contraseña, órdenes
│   │   ├── designController.js   # CRUD diseños de usuarios
│   │   ├── assetController.js    # CRUD banco de imágenes
│   │   └── paymentController.js  # MercadoPago + webhook + órdenes
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── designRoutes.js
│   │   ├── assetRoutes.js
│   │   └── paymentRoutes.js
│   │
│   ├── scripts/
│   │   ├── syncFromCloudinary.mjs      # Sync Cloudinary → Supabase
│   │   ├── uploadPinterest.mjs         # Sube imágenes locales al banco
│   │   ├── categorizar_imagenes.sql    # Clasifica imágenes por categoría
│   │   └── limpiarDuplicados.sql       # Elimina duplicados en Supabase
│   │
│   ├── supabase_schema.sql       # Schema SQL completo (tablas + RLS)
│   ├── .env.example              # Variables de entorno requeridas
│   └── server.js                 # Entry point del servidor
│
├── public/
│   └── 3Dmodels/
│       ├── 02.glb                # Modelo 3D de la remera
│       └── textures/
│           └── design-fallback.png
│
└── .env                          # Variables del frontend (VITE_*)
```

---

## Rutas de la API

### Autenticación — `/api/auth`
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/register` | Crear cuenta | — |
| POST | `/login` | Iniciar sesión | — |
| POST | `/refresh` | Renovar access token (cookie) | — |
| GET | `/me` | Usuario autenticado | ✅ |
| POST | `/logout` | Cerrar sesión | ✅ |

### Usuarios — `/api/users`
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/profile` | Obtener perfil completo | ✅ |
| PUT | `/profile` | Actualizar datos personales | ✅ |
| PUT | `/change-password` | Cambiar contraseña | ✅ |
| POST | `/avatar` | Subir avatar (multipart) | ✅ |
| DELETE | `/avatar` | Eliminar avatar | ✅ |
| GET | `/orders` | Historial de órdenes | ✅ |
| DELETE | `/account` | Eliminar cuenta | ✅ |

### Banco de Imágenes — `/api/assets`
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/` | Listar imágenes (filtros: category, tags, search, page) | — |
| GET | `/categories` | Categorías con contadores | — |
| GET | `/:id` | Imagen por ID | — |
| POST | `/` | Subir imagen al banco (multipart) | ✅ |
| DELETE | `/:id` | Eliminar imagen | ✅ |

### Diseños de usuario — `/api/designs`
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/` | Galería pública | — |
| GET | `/mine` | Mis diseños | ✅ |
| GET | `/:id` | Diseño por ID | — |
| POST | `/` | Subir diseño (multipart) | ✅ |
| PUT | `/:id` | Actualizar diseño | ✅ |
| DELETE | `/:id` | Eliminar diseño | ✅ |
| POST | `/:id/like` | Like a un diseño | — |

### Pagos — `/api/payments`
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/create_preference` | Crear preferencia MercadoPago | — |
| POST | `/webhook` | Webhook de MercadoPago | — |
| GET | `/order/:id` | Obtener orden | ✅ |

---

## Base de Datos (Supabase)

### Tablas

**`users`** — Usuarios del sistema
```
id (uuid PK), first_name, last_name, email (unique), phone,
password_hash, role (user|admin), is_verified, refresh_token,
avatar_url, avatar_public_id, bio, address (jsonb), created_at, updated_at
```

**`designs`** — Diseños creados por usuarios
```
id (uuid PK), owner_id → users, image_url, image_public_id,
image_meta (jsonb), title, description, tags (text[]),
category, is_public, status (pending|approved|rejected),
likes, views, created_at, updated_at
```

**`orders`** — Órdenes de compra
```
id (uuid PK), user_id → users, guest_email, items (jsonb),
subtotal, shipping, total, mp_preference_id, mp_payment_id,
mp_status, status (pending|paid|processing|shipped|delivered|cancelled|refunded),
shipping_address (jsonb), payment_method, notes, created_at, updated_at
```

**`design_assets`** — Banco de imágenes
```
id (uuid PK), name, url, public_id, category, tags (text[]),
is_system, is_public, uploaded_by → users,
width, height, format, bytes, created_at
```

### Correr el schema
```bash
# En Supabase Dashboard → SQL Editor → New query
# Pegar el contenido de backend/supabase_schema.sql y ejecutar
```

---

## Instalación y configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/richardg91-bien/tienda-remeras.git
cd tienda-remeras
```

### 2. Instalar dependencias
```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

### 3. Variables de entorno

**Frontend** — crear `.env` en la raíz:
```env
VITE_BACKEND_URL=http://localhost:3000
VITE_WHATSAPP_PHONE=5491122334455
```

**Backend** — crear `backend/.env` (ver `backend/.env.example`):
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# Supabase → Settings → API
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# JWT — generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# MercadoPago → developers.mercadopago.com
MP_TOKEN=...

# Cloudinary → cloudinary.com → Dashboard
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### 4. Crear las tablas en Supabase
```bash
# Copiar el contenido de backend/supabase_schema.sql
# Pegar en Supabase → SQL Editor → New query → Run
```

### 5. Correr el proyecto
```bash
# Terminal 1 — Backend
cd backend
node server.js

# Terminal 2 — Frontend
npm run dev
```

O desde la raíz:
```bash
npm run server   # backend
npm run dev      # frontend
```

---

## Funcionalidades principales

### Tienda
- Catálogo de productos con filtros por categoría, búsqueda y ordenamiento
- Carrito persistente (localStorage) con control de cantidad
- Checkout via MercadoPago (Checkout Pro) o WhatsApp
- Webhook para actualización automática del estado de órdenes

### Autenticación
- Registro en 2 pasos con validación
- Login con JWT (access token 15min + refresh token 30 días en cookie httpOnly)
- Perfil editable: datos personales, dirección, avatar, contraseña
- Historial de órdenes

### Design Studio (`/disenar`)
- Modelo 3D de la remera con rotación en tiempo real
- Canvas 2D editable con Fabric.js (texto, imágenes del banco)
- Sincronización automática canvas 2D → textura 3D
- Diseño doble cara (frente y dorso)
- Selector de color de la remera
- Agregar diseño directamente al carrito

### Banco de Imágenes (`/galeria`)
- 514+ imágenes categorizadas (cyberpunk, streetwear, gráficos, logos, etc.)
- Almacenadas en Cloudinary, registradas en Supabase
- Filtros por categoría + búsqueda + paginación
- Modal de preview con link al Studio

### Asistente IA
- Chat flotante con respuestas por estilo (cyberpunk, minimalista, streetwear)
- Recomendaciones de productos según preferencias
- Guía de talles y medios de pago

---

## Scripts útiles

```bash
# Poblar banco de imágenes desde Cloudinary → Supabase
node backend/scripts/syncFromCloudinary.mjs

# Subir imágenes locales al banco
node backend/scripts/uploadPinterest.mjs

# Limpiar duplicados (correr en Supabase SQL Editor)
# backend/scripts/limpiarDuplicados.sql

# Categorizar imágenes (correr en Supabase SQL Editor)
# backend/scripts/categorizar_imagenes.sql
```

---

## Ramas del repositorio

| Rama | Descripción |
|---|---|
| `main` | Proyecto completo mergeado |
| `feature/neon-stitch-redesign` | Rediseño UI + backend Supabase + auth |
| `disenador-de-remera` | Design Studio 3D |
| `banco-de-imagenes` | Banco de imágenes + galería |

---

## Seguridad

- Contraseñas hasheadas con bcrypt (salt rounds: 12)
- JWT con expiración corta (15min) + refresh token en cookie httpOnly
- RLS habilitado en Supabase (acceso solo via service_role desde el backend)
- Rate limiting global (200 req/15min) y específico en auth (10 req/15min)
- Validación de inputs con express-validator en todos los endpoints
- `.env` excluido del repositorio con `.gitignore`
- Credenciales de Cloudinary nunca expuestas al frontend
