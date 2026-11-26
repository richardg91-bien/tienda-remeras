# Resultados de la prueba aislada

Fecha: 2026-11-26. Ejecución con Wrangler 4.168.0 mediante `wrangler dev --local`; Cloudflare documenta que este modo ejecuta el proceso local `workerd`, el mismo runtime abierto que también utiliza Workers hospedado. No se usó `--remote`, no hubo despliegue, cuenta Cloudflare, binding remoto ni llamada a Supabase, Mercado Pago, Cloudinary o PostgreSQL.

## Flujos observados

`npm run test:local` pasó. El script solicita `/health`, crea una identidad sintética, inicia sesión, comprueba los flags `HttpOnly`, `Secure` y `SameSite=Lax`, manda el token JWT al endpoint de cambio de contraseña, confirma que la clave anterior ya no inicia sesión y que la nueva sí. El cambio de contraseña mantiene el método y ruta actuales (`PUT /api/users/change-password`) y sus nombres de campos.

La segunda ejecución midió dentro del Worker, con `performance.now()`:

| Operación bcryptjs (coste 12) | Tiempo observado |
| --- | ---: |
| Hash al registrar | 240 ms |
| Comparación en login | 237 ms |
| Verificación al cambiar contraseña | 234 ms |
| Hash al cambiar contraseña | 238 ms |

Estos valores son tiempo transcurrido en el `workerd` local, no la métrica CPU facturada/limitada de Workers Free. Wrangler local no valida la cuota de cuenta; no se desplegó una versión para consultar el CPU medido por Workers. Por lo tanto, no se presenta este resultado como benchmark de Workers Free. Comparado con el límite documentado de 10 ms CPU/invocación, bcrypt a coste 12 es el principal riesgo y hace que el backend completo no sea una opción Free segura hasta verificar o cambiar dónde se ejecuta la autenticación. No recomiendo reducir el coste bcrypt.

## Compatibilidad aislada

| Componente | Resultado local | Alcance |
| --- | --- | --- |
| Express 5 + adaptador oficial `httpServerHandler` (`cloudflare:node`) | Pasó | `/health` respondió 200 desde `workerd`. |
| `jsonwebtoken`, cookies, `node:crypto`, Web Crypto | Pasó | JWT emitido y verificado entre solicitudes; cookie creada y parseada. |
| Supabase JS | Cliente construye | Sin consultar Auth, REST, Realtime ni Storage. |
| Mercado Pago SDK | Cliente construye | Sin crear preferencias, consultar pagos ni enviar webhooks. |
| Cloudinary SDK | Configuración construye | Sin subir, firmar ni leer archivos remotos. |
| `pg` | Pool construye y cierra | Sin consulta ni conexión a PostgreSQL; no prueba el transporte. La documentación de Cloudflare recomienda Hyperdrive para PostgreSQL; no se creó ni vinculó ninguno. |

La comprobación de compatibilidad es deliberadamente superficial para los proveedores externos: prueba que los paquetes importen/construyan dentro del Worker local, no sus operaciones de red. El backend existente también usa `dotenv`, servidor Express, `process.env`, Supabase, `pg`, Multer, Axios y funciones de SDK que todavía requerirían una prueba individual dentro de Workers.

## No comprobado

- Límite real de CPU de cuenta Workers Free, errores 1102, memoria efectiva bajo carga y cuota diaria de cuenta.
- Consultas a una instancia PostgreSQL/Neon por Hyperdrive.
- Operaciones auténticas de Supabase, Mercado Pago o Cloudinary.
- Importación del servidor de aplicación completo y de todos sus middlewares. Este prototipo solo adapta Express y los flujos sintéticos de autenticación.

No se redujo bcrypt, no se tocaron archivos existentes del backend/frontend y no se conectaron servicios de producto. Para obtener una medición autoritativa del límite Free sería necesario ejecutar una versión de prueba en una cuenta Free; eso requiere desplegarla y queda expresamente fuera del alcance autorizado.

## Evaluación final de viabilidad — 2026-11-26

Esta sección complementa los resultados anteriores; no reemplaza ni descarta las mediciones previas.

### Medición local de CPU y límite de Workers

La documentación de Cloudflare advierte que `performance.now()` en Workers alojado no sirve para medir CPU de código síncrono: el reloj avanza con operaciones de I/O. El camino válido es el perfilador de CPU de DevTools en local o un perfil de una versión desplegada. Por eso, los tiempos de bcrypt de la sección anterior son tiempos transcurridos y no CPU.

Se agregó una ruta sintética exclusiva del prototipo (`POST /benchmark/bcrypt`) y un perfilador Inspector/CDP local. En la ejecución final con Wrangler 4.168.0 y `workerd`, bcryptjs cost 12 respondió en 259 ms transcurridos; el perfil reportó 282.978 ms de CPU muestreada no-idle para la solicitud completa, con 259.48 ms muestreados en `_encipher`. Una ejecución anterior registró 303.362 ms muestreados. El perfil incluye el overhead del handler y el muestreo, y el resultado depende del hardware local; no es una medición del límite alojado ni debe interpretarse como valor exacto de CPU para cada llamada.

**No se midió el comportamiento en Workers Free real.** Para obtener esa cifra, Cloudflare requiere un Worker de prueba desplegado, solicitudes sintéticas dirigidas a la ruta y captura mediante observabilidad/perfilado. No se desplegó por la restricción explícita. En la documentación consultada el límite Free es 10 ms CPU por invocación; el perfil local muestra un riesgo muy alto para bcrypt cost 12, pero no demuestra por sí solo qué respuesta o error daría el entorno alojado. No se bajaron las rondas.

### PostgreSQL y Hyperdrive

El prototipo solo comprobó que `pg` construye un `Pool` localmente sin conectar. La dependencia `pg` es `^8.23.1`, por encima del mínimo `8.16.3` que Cloudflare documenta para Hyperdrive. Esto confirma compatibilidad de versión del driver, no de las operaciones de NEON-STITCH.

No fue posible consultar la instancia Docker de laboratorio: `docker ps` fue rechazado por permisos del Docker Engine/pipe local. No se intentó conectar a una base remota. No se comprobó `SELECT`, escrituras, rollback, transacciones ni errores de conexión. Hyperdrive usa pool del lado del servicio y pooling por transacción; el patrón de conexión y estado de sesión del pool actual debe adaptarse y validarse. Las transacciones deben mantener sus consultas en el mismo cliente/transacción; no deben depender de estado de sesión o advisory locks, que Hyperdrive no soporta en su modo de pooling documentado. No se creó configuración Hyperdrive ni se almacenaron credenciales.

La documentación indica que Hyperdrive en Free permite 100.000 sentencias por día (cada SELECT/INSERT/UPDATE/DELETE y sentencia de esquema cuenta; al superar el límite, las operaciones fallan hasta el reinicio diario). Esta cifra no equivale a una cuota de conexiones ni fue probada en el prototipo.

### Matriz de evidencia

| Área | Importación/configuración | Ejecución local comprobada | Operación externa real | Estado |
| --- | --- | --- | --- | --- |
| Express + adaptador `httpServerHandler` | Sí | Sí: `/health` y autenticación sintética sobre `workerd` | No | Adaptación viable; falta portar/probar el backend completo y su middleware global. |
| JWT, cookies, Web Crypto y `node:crypto` | Sí | Sí: emitir/verificar JWT y comprobar atributos de cookie | No | Viable en el flujo sintético; no valida sesiones ni secretos productivos. |
| bcryptjs cost 12 | Sí | Sí; tiempos y perfil CPU local detallados arriba | No | Bloqueo probable en Free por CPU síncrona; requiere medición alojada para cifra concluyente. |
| Supabase JS | Cliente construye | No se ejecutó una solicitud de red | No | Compatibilidad operativa desconocida. |
| Mercado Pago | Cliente construye | No se ejecutó SDK, firma de webhook ni red | No | Compatibilidad operativa y límites de CPU desconocidos. |
| Cloudinary | Configuración construye | No se subieron/leyeron archivos; no se probó `upload_stream` ni firma | No | SDK/flujo de carga desconocido. Mantenerlo como almacenamiento externo requiere probar fetch/stream y tamaño de archivos. |
| `pg` / PostgreSQL | Pool construye sin conectar | No hubo consulta por bloqueo de acceso a Docker | No | `pg` tiene versión admitida para Hyperdrive, pero queries, pooling, transacciones y errores no están validados. |
| Carga multipart / Multer | Dependencia identificada en backend | No se portó ni probó | No | Compatibilidad desconocida; revisar APIs Node, buffers, límites y streaming antes de migrar. |
| Rate limiting | No se integró a este prototipo | No | No | Desconocido; almacenamiento local en memoria no sería una garantía global entre isolates. |
| Errores del backend principal, Axios, `dotenv`, arranque | Dependencias/configuración identificadas | No se ejecutaron como aplicación completa | No | Requieren adaptación a bindings/env y pruebas específicas. |

No hubo operaciones externas reales con Cloudflare, Railway, Neon, Supabase, Mercado Pago ni Cloudinary. Tampoco se modificaron los archivos principales de backend o frontend.

### Costos y cuotas consultados

Consulta de documentación oficial: 2026-11-26. Las cuotas pueden cambiar y deben verificarse de nuevo antes de contratar o desplegar.

| Servicio | Plan gratuito consultado | Límites relevantes para esta decisión |
| --- | --- | --- |
| Cloudflare Workers + Hyperdrive | $0; Cloudflare indica que se puede comenzar sin tarjeta | Workers: 100.000 requests/día, 10 ms CPU/invocación, 128 MB memoria, 50 subrequests/solicitud, 6 conexiones salientes simultáneas y 64 MiB por Worker. Hyperdrive: 100.000 sentencias/día. Plan Workers Paid: mínimo $5/mes; mayor cuota de CPU/requests, con cargos por exceso según uso. |
| Railway | Free $0, $1 de crédito de recursos cada mes, sin tarjeta; Hobby $5/mes con $5 de uso incluido | Free: hasta 3 servicios, cada uno hasta 1 vCPU/0,5 GB RAM, volumen de 0,5 GB; los servicios duermen tras 5–10 minutos sin tráfico saliente y se detienen si se agota el crédito. Free no incluye dominio personalizado. Hobby ofrece operación siempre activa y dominio personalizado; el consumo que exceda el crédito incluido se cobra según uso. |
| Neon | Free $0; la página oficial actual indica 100 proyectos, 100 CU-horas por proyecto/mes, 1 GB por proyecto y escalado hasta 2 CU | Al superar el uso gratuito puede haber cargos de cómputo/almacenamiento según el plan de uso. Es compartido por ambas alternativas y no se probó esta cuenta o base. |
| Cloudinary | Free $0 para siempre, sin tarjeta, 25 créditos mensuales | Un crédito equivale a 1.000 transformaciones, 1 GB almacenamiento gestionado o 1 GB de ancho de banda de imágenes, o una combinación proporcional. Es compartido por ambas arquitecturas. |

La opción A puede permanecer en $0 solo mientras el consumo de Railway quepa en el crédito mensual y Neon/Cloudinary en sus cuotas; presenta suspensión/latencia de despertar y límites de alojamiento Free. Para disponibilidad continua y dominio personalizado, Railway Hobby tiene mínimo de $5/mes, con excesos de consumo posibles. La opción B puede costar $0 dentro de cuotas, pero el límite de CPU hace inviable de momento alojar con seguridad el flujo de autenticación con bcrypt en Workers Free. Workers Paid comienza en $5/mes; su CPU puede configurarse más alta, pero no forma parte de la alternativa Free solicitada.

### Recomendación y siguientes pruebas

**Recomendación: conservar Railway + Neon + Cloudinary para el backend principal.** El prototipo prueba que Express puede responder en `workerd` y que el adaptador oficial funciona para rutas sencillas. No demuestra que el backend completo sea compatible, y el perfil local de bcrypt cost 12 es cientos de milisegundos frente al límite Free documentado de 10 ms. Mantener bcrypt seguro fuera de Workers Free es condición necesaria; moverlo o reducir rondas queda fuera de esta evaluación.

Cloudflare puede considerarse más adelante para una ruta aislada de baja CPU (por ejemplo, salud o lecturas públicas cacheables), solo después de medir sus rutas y probar autenticación, CORS, manejo de errores y política de disponibilidad. Eso no requiere reemplazar el backend principal y no se ha implementado aquí.

Para cerrar las incertidumbres se necesitarían dos autorizaciones/prerrequisitos separados:

1. Autorizar el despliegue temporal de un Worker de laboratorio en una cuenta Free (`workers.dev` de prueba), con datos sintéticos y sin bindings de producto, para medir CPU alojada de bcrypt cost 12 en Observability. Cloudflare indica Free sin cargo dentro de los límites y comienzo sin tarjeta; exceder cuotas puede hacer fallar solicitudes. No utilizar dominio productivo.
2. Habilitar acceso al contenedor PostgreSQL local de laboratorio para repetir pruebas de conexión/SQL. Para una prueba real de Hyperdrive se necesitaría, además, una base de prueba accesible desde Cloudflare y crear el binding remoto; eso no se hizo y requiere autorización específica, incluso si los servicios elegidos tuvieran nivel gratuito.

### Fuentes oficiales consultadas

- [Límites de Workers](https://developers.cloudflare.com/workers/platform/limits/) y [precios de Workers/Hyperdrive](https://developers.cloudflare.com/workers/platform/pricing/).
- [Perfil CPU local](https://developers.cloudflare.com/workers/observability/dev-tools/cpu-usage/), [perfil alojado](https://developers.cloudflare.com/workers/observability/profiling-in-production/) y [relojes/medición](https://developers.cloudflare.com/workers/runtime-apis/performance/).
- [Conexión PostgreSQL/driver `pg` para Hyperdrive](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/) y [pooling](https://developers.cloudflare.com/hyperdrive/concepts/connection-pooling/).
- [Railway Free](https://docs.railway.com/pricing/free-plan) y [planes/costos](https://docs.railway.com/pricing/plans).
- [Neon pricing](https://neon.com/pricing) (consulta vigente en noviembre de 2026; cuotas actuales resumidas también en el anuncio oficial de [octubre de 2026](https://neon.com/blog/neon-free-plan-1-gb-per-project)).
- [Cloudinary pricing](https://cloudinary.com/pricing) y [créditos](https://cloudinary.com/documentation/billing_and_plans).

## Validación final del prototipo

El 2026-11-26, `npm run test:local`, `node --check src/index.mjs`, `node --check profile-bcrypt.mjs` y `npm run profile:bcrypt` pasaron. En esta ejecución, el flujo de autenticación local midió 252–272 ms por operación; el perfil de la ruta bcrypt reportó 259 ms transcurridos y 282.978 ms CPU muestreada no-idle. No es un resultado alojado. Docker local no permitió acceder a `tienda-remeras-pg17-lab`; por ello no se ejecutaron consultas SQL. No se desplegó, no se conectó ningún proveedor externo y no se tocó producción.
