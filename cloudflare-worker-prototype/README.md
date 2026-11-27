# ANATHEL local Worker API (D1 + R2)

This project reuses the existing Cloudflare prototype directory and exposes the designer's current API contract through a native Workers module. It replaces the prototype's in-memory-only identity check with D1 users and projects, and stores private design images in a local R2 simulation. It does not remove the legacy Node/Supabase backend used by other app routes.

## Local-only boundaries

- `wrangler.jsonc` has placeholder D1 identity, a local-only R2 bucket name, and `workers_dev: false`.
- All database commands and the automated test runner pass Wrangler's `--local` flag and use the isolated state directory `.wrangler/phase1c-state`.
- R2 local simulation and D1 local storage are separate from Cloudflare account resources. No remote bucket, database, account credential, deploy, or Supabase connection is used by this Worker.
- `.dev.vars` contains local-only signing secrets and is ignored by Git. `npm run test:local` generates random values there only when the file does not exist. Never copy production secrets into it.
- Local state is persistent across Wrangler restarts. The integration test creates synthetic records, restarts `workerd`, verifies them, then removes its own rows and R2 objects.

## Run the required local integration test

Prerequisites: Node and Wrangler dependencies already installed in this directory, and PowerShell available on Windows.

```powershell
npm run test:local
```

This applies the D1 migration locally, starts the Worker against local D1/R2 bindings, creates two synthetic accounts, tests project and image operations, stops and restarts Wrangler using the same state directory, verifies persistence and user isolation, and cleans up its generated test records. It never uses `--remote`.

For a persistent local API server instead:

```powershell
npm run migrate:local
npm run dev
```

Then open another terminal and point the Vite app at this Worker (same host for the local refresh cookie):

```powershell
$env:VITE_BACKEND_URL = "http://127.0.0.1:8787"
npm run dev -- --host 127.0.0.1
```

Register a synthetic account in the local app. The designer endpoints remain `/api/products/models`, `/api/projects`, and `/api/private-assets`; the access JWT format remains a bearer token and refresh remains an HTTP-only cookie. The Worker implements auth, projects, the adult tee model and private assets only. User profile, shared gallery, community designs and payment routes remain on their existing backend and are outside this phase.

The designer's `AssetLibrary` uses `/api/assets` only with the legacy shared-asset API. When `/health` identifies this local Worker (`persistence: d1+r2`), the library switches to the existing authenticated `GET /api/private-assets?projectId=...` route and loads images through signed private URLs. The Worker has no shared public asset catalog; the private route is not duplicated to imitate one.

## Contract mapping

| Existing API contract | Local Cloudflare implementation |
| --- | --- |
| `POST /api/projects` | Creates a D1 project. A client UUID `draftId` lets uploads made before the first save live under that project's R2 prefix. Existing clients that omit it receive a Worker-generated UUID. |
| `GET /api/projects`, `GET /api/projects/:id` | D1 list and full project read scoped by verified JWT subject. Foreign projects return 404. |
| `PUT /api/projects/:id`, `DELETE /api/projects/:id` | Update/delete by route ID plus verified owner. Body `id` and `owner_id` do not select ownership. Project deletion removes R2 objects under that user's project prefix. |
| `POST /api/private-assets` | Multipart image upload to `<userId>/<projectId>/<uuid>.<extension>` in private local R2. Max 8 MB; PNG, JPEG, WebP and SVG are accepted with content-type/signature checks. |
| `GET /api/private-assets?projectId=...` | Lists private objects only in the current user's project folder. |
| `GET /api/private-assets/file?path=...` | Authenticated request returns a five-minute HMAC-signed Worker URL. The URL streams the private R2 object without exposing the bucket. |
| `GET /api/products/models` | D1 model seed for `tee-classic`, including front/back dimensions and production template. |

Project canvas JSON rejects embedded `data:image/...` payloads so image bytes are not placed in D1. Private object paths must match both authenticated owner and project. Project saves verify each referenced R2 object exists. Updating a project removes its no-longer-referenced objects after the D1 update; delete cleanup is best-effort and logs only an error code.

## Authentication and security notes

- Passwords use Web Crypto PBKDF2-HMAC-SHA-256 with 600,000 iterations and per-user random salts. This is a new local Worker identity store; existing Supabase users/password hashes are not migrated.
- Access and refresh JWTs use distinct secrets. Refresh tokens are stored only as SHA-256 hashes in D1 and rotate on refresh. Logout revokes the stored refresh hash; access JWTs remain valid until their 15-minute expiry.
- Auth attempts are limited per client IP using a D1 window counter. Local tests use a higher cap to keep repeatable runs practical; the Worker default is 10 attempts per 15 minutes.
- CORS accepts only configured local Vite origins with credentials. Signed R2 URLs expire after five minutes and are also owner/project path scoped when issued.
- No code is claimed to be invulnerable. Password CPU cost and account-level Worker limits still require a separately authorized hosted measurement before choosing a Cloudflare plan.

## Migration and resources

- D1 migration: `migrations/0001_mvp.sql` creates the local users, product model, projects and auth rate-limit schema. It seeds only the existing adult `tee-classic` model.
- R2 local bucket binding: `PRIVATE_ASSETS` in `wrangler.jsonc`. No remote bucket was created.
- No duplicate database/table is used to work around an API failure; project state and user state are in D1, private image bytes are in R2.

## Later remote activation checklist (not performed)

1. Review and apply the D1 migration to a dedicated non-production D1 database through an explicitly approved remote setup.
2. Create a dedicated private R2 bucket and bind it under the expected name; keep public access disabled.
3. Store independent JWT, refresh JWT, asset-signing and rate-limit secrets using Cloudflare's secret management. Never put them in `vars`, frontend environment, or Git.
4. Configure exact production frontend origins and the frontend API URL, then verify secure cookies, TLS and CORS.
5. Run hosted security, CPU, storage, backup/retention and concurrency checks in a non-production environment before any production cutover.
6. Plan user migration separately. Existing Supabase identity rows and bcrypt hashes are not compatible with this new D1 auth store without an approved migration strategy.

No remote resource creation, migration, deployment or production change is part of this phase.
