# Fase 1 — proyectos de remera adulta y assets privados

Fecha: 27/11/2026. Trabajo y pruebas realizados solo en el workspace y en el PostgreSQL local de laboratorio. No se desplegó ni se conectó con servicios externos.

## Cambios

- El CRUD de proyectos valida que el producto exista y esté activo, que la categoría corresponda, que las superficies pertenezcan al modelo y que un talle enviado exista en el esquema del producto.
- Si se envía `variant.catalogProductId`, el backend comprueba que exista en el catálogo frontend compartido, que corresponda al `productRef` (cuando el catálogo declara esa relación) y que el talle esté disponible para ese producto específico.
- `POST /api/projects` siempre crea un ID nuevo, aunque el cuerpo contenga `id`; `PUT /api/projects/:id` actualiza exclusivamente el ID de la ruta y siempre limita la operación al usuario autenticado.
- `production` se completa desde la plantilla del catálogo con producto, categoría, variante y dimensiones físicas y de salida por superficie (`widthMm`, `heightMm`, `dpi`, `widthPx`, `heightPx`). Las superficies circulares usan su diámetro para generar una caja cuadrada de salida.
- Assets privados siguen en el bucket Supabase `customer-designs`. Las rutas firmadas ahora requieren un path de objeto directo dentro de la carpeta del dueño; se rechazan otros dueños y rutas con segmentos adicionales. Si una carga funciona pero falla la firma, se intenta borrar el objeto nuevo para evitar dejarlo huérfano.
- La recuperación del canvas renueva una sola URL por path privado único y la aplica a todas las instancias de esa imagen. Los datos locales `data:` siguen siendo utilizables sin una solicitud de firma.
- Se documentó que el API usa access JWT Bearer; `refreshToken` es una cookie exclusiva para renovar sesión.

## Pruebas ejecutadas

- `node scripts/pgLabRoutesSmoke.mjs`: pasó contra PostgreSQL 17 local; cubre crear/listar/recuperar/actualizar/eliminar, dos usuarios, spoofing de dueño, ID de creación, modelo `tee-classic`, talle M/L, frente y dorso, medidas 300 DPI, y rechazo de talle/superficie/ID de catálogo inválidos. El baseline final fue `users=8, assets=514, designs=0, orders=3, projects=0`.
- `node scripts/pgLabProjectAuthSmoke.mjs`: pasó. Usa el middleware JWT real, una API Supabase REST sintética en loopback para resolver usuarios y el PostgreSQL local de laboratorio para CRUD. Sin token o con JWT inválido recibe 401; el otro usuario no puede leer ni modificar el proyecto.
- `node scripts/testPrivateAssets.mjs`: pasó con Storage sintético en memoria. Verifica carga, listado, firma de 300 segundos, renovación, aislamiento entre dos usuarios, rechazo de path traversal y limpieza de la carga cuando falla la firma. No valida el proveedor Supabase remoto.
- `npx vitest run src/designer/utils/designerApi.test.js`: 2 pruebas aprobadas; serialización estable por path, renovación de firma y varias instancias del mismo asset.
- ESLint focalizado en los archivos modificados: aprobado.
- `npm run build`: aprobado. Vite mantiene la advertencia existente de chunk Three.js de 969,83 kB.

También se ejecutó la suite previa `npm run test:pg-lab` antes de estos cambios; todas sus suites terminaron y los datos sintéticos volvieron al baseline. No se cambió código de pagos.

Las pruebas son de laboratorio y no demuestran que la migración esté aplicada en el proyecto Supabase de producto, que sus políticas reales de Storage permitan estas operaciones, ni que credenciales, CORS y URL de frontend estén configurados para un entorno desplegado.

## Contrato de producción

El proyecto debe conservar: `productRef`, categoría, variante elegida (incluido talle y color si aplica), IDs de superficie, JSON de canvas por superficie, referencias `assetId`/`privateAssetPath`, plantilla de fabricación, medidas físicas en milímetros, DPI y dimensiones de raster calculadas por superficie. La plantilla actual especifica formato, modo de color, sangrado y margen seguro. La salida calculada describe el tamaño nominal del raster; el exportador aún debe aplicar sangrado y perfil de color de acuerdo con el proveedor. El proveedor debe confirmar las medidas y los valores antes de fabricar pedidos reales.

## Pendientes para Copilot

1. Revisar e integrar los cambios frontend paralelos que aparecieron en el workspace durante esta fase: enlace al diseñador con `catalogProductId`/talle/color, estado Redux y guardado/recuperación desde `ProjectManager`. No fueron editados por este trabajo; falta validación funcional de UI para confirmar que la selección navega, persiste y se restaura de punta a punta.
2. Confirmar visualmente que el contenido de canvas de frente y dorso se representa en ambas superficies y que los objetos conservan `assetId` o `privateAssetPath` al copiar, limpiar, cambiar de producto y reabrir.
3. Si la interfaz indica “listo para producción”, aclarar que `production` contiene metadatos/dimensiones y no un archivo de fabricación exportado; conectar la exportación por superficie solo después de acordar con el proveedor formato, sangrado, margen seguro y perfil de color.

## Bloqueos antes del MVP comercial

- Validar en un proyecto Supabase de prueba (no producción) que exista `design_projects`, `product_models`, el bucket privado, sus límites/MIME types y las políticas Storage necesarias. La migración incluida aún requiere una aplicación autorizada en el entorno correcto.
- Ejecutar una prueba real de carga/lectura privada y CRUD con cuentas sintéticas en ese entorno aislado. En esta fase la capa Storage fue sustituida por un doble local.
- Validar flujo navegador/frontend contra backend de prueba con JWT real, URL/CORS configurados y rehidratación de imagen firmada. No se modificaron componentes frontend.
- Confirmar medidas físicas y plantilla de fabricación de `tee-classic` con el proveedor.
- Autenticación sigue usando JWT propio y lookup de usuario Supabase; la prueba usa API REST sintética para no contactar al servicio. Registro/login/refresh completos quedan fuera de esta fase.
