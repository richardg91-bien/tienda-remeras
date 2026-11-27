# Contrato de integración del diseñador

La API conserva los endpoints existentes `/api/assets` (biblioteca compartida) y `/api/designs` (diseños comunitarios). `GET /api/products/models` lista modelos activos y sus superficies/plantillas. Toda ruta `/api/projects` y `/api/private-assets` requiere `Authorization: Bearer <access JWT>`. El access token se devuelve al iniciar/renovar sesión y el frontend lo envía como bearer; la cookie `refreshToken` se usa solo en `/api/auth/refresh`. El backend resuelve el propietario desde el JWT verificado; nunca se acepta `owner_id` enviado por el cliente.

## Proyectos

- `GET /api/projects` lista proyectos propios ordenados por última edición.
- `POST /api/projects` crea; `PUT /api/projects/:id` actualiza el ID de la ruta; `GET /api/projects/:id` recupera; `DELETE /api/projects/:id` elimina. El backend ignora cualquier `id`/`owner_id` del cuerpo al crear y solo actualiza registros del usuario autenticado.
- Cuerpo de guardado: `{ name, productRef, productCategory, variant, canvas, previewUrl, production }`.
- Respuesta: `{ project: { id, name, product_ref, product_category, variant, canvas, preview_url, production, created_at, updated_at } }`.
- `canvas` es JSON serializable Fabric.js: `{ version, width, height, surfaces: { front: { objects: [...] }, back: { objects: [...] } } }`. Cada objeto puede conservar su `assetId` o `privateAssetPath` como referencia a la fuente reutilizable. Three.js solo necesita consumir la misma lista de superficies/objetos renderizados.
- El backend valida que `productRef` identifique un modelo activo, que `productCategory` coincida, que las superficies pertenezcan al modelo y que el talle (si se envía) exista en `variant_schema`. El dueño, producto, variante y superficies se devuelven juntos en el proyecto.
- El backend completa `production` con `productRef`, `productCategory`, `variant` y `products[productRef] = { template, surfaces }`. Cada superficie física configurada devuelve `widthMm`, `heightMm`, `dpi`, `widthPx` y `heightPx`; para una superficie circular usa el diámetro como caja cuadrada. El template declara formato, modo de color, sangrado y margen seguro. La fabricación debe usar dimensiones y perfiles confirmados por el proveedor, no tomar las referencias iniciales como especificación comercial aprobada.

## Biblioteca compartida y privada

- `GET /api/assets?page=1&limit=24&category=streetwear&subcategory=...&license=...&search=...&tags=...` pagina los recursos públicos existentes; `GET /api/assets/categories` devuelve categorías y cantidades. Al subir recursos centrales, `POST /api/assets` acepta además `subcategory`, `license`, `formats` y `metadata`.
- Un recurso central conserva un único `id` y `url`; proyectos/productos lo referencian por `assetId`. Categoría, subcategoría, tags, licencia, formatos y metadatos técnicos son campos de `design_assets` añadidos por la migración.
- `POST /api/private-assets` acepta `multipart/form-data` con campo `image`, guarda el original en el bucket privado `customer-designs` y devuelve `{ asset: { path, name, mimeType, bytes, url, expiresIn } }`.
- `GET /api/private-assets` lista los archivos propios con URLs firmadas de 5 minutos. `GET /api/private-assets/file?path=...` renueva una URL; el path debe ser un objeto directo dentro de la carpeta del usuario autenticado (sin subdirectorios ni segmentos `.`/`..`). Guardar `path` en el proyecto, nunca depender de una URL firmada vencible. Al recuperar un proyecto, el cliente solicita URLs nuevas para cada path único y aplica la respuesta a todas las instancias de esa imagen.
- Originales privados no se envían a Cloudinary ni se exponen con URL pública. Para compartir una versión, crear explícitamente un recurso central derivado, conservando la referencia al original privado bajo control de acceso.

## Modelos y fabricación

La migración incorpora `product_models` con IDs estables, categoría, variantes, superficies imprimibles y plantilla de producción. Los IDs iniciales son `tee-classic`, `mug-standard`, `plate-standard`, `bottle-standard`, `glass-standard` y `cooler-standard`. Cada superficie devuelve `id`, `label` y dimensiones camelCase (`widthMm`, `heightMm` o `diameterMm`), compatibles con el cálculo del frontend; también puede incluir `curved`. Cada plantilla define DPI, sangrado, margen seguro, formato y modo de color. El frontend deriva píxeles objetivo como `mm / 25.4 * resolutionDpi` y exporta separado por superficie. Los valores iniciales son referencias configurables, deben confirmarse con el proveedor antes de fabricar.

El esquema `variant` describe talle/color/capacidad y opciones del modelo. `production` puede persistir perfil de salida y dimensiones calculadas por superficie para que la exportación de fabricación sea reproducible. Fabric.js mantiene edición; Three.js consume el mismo `productRef`, `variant` y `canvas`, usando cada superficie como textura o mapeo específico.

## Despliegue

Aplicar manualmente `supabase_neon_stitch_mission1.sql` en el proyecto Supabase correcto antes de desplegar el backend. La migración es aditiva y no hace limpieza ni elimina datos. El backend necesita sus variables existentes `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`; nunca se pasan al frontend. RLS deniega acceso anon y la autorización de usuarios se aplica en el backend con JWT propio.
