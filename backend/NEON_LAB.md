# PostgreSQL / Neon lab adapter

The current application still boots through `config/supabase.js`. `server.js` and its environment defaults are unchanged; product-model, project, shared-asset and community-design database operations have an explicit lab-only PostgreSQL branch. The branch is selected only by `NEON_LAB_MODE=1`, refuses production and any `RAILWAY_*` environment, and connects to the fixed loopback target. It cannot redirect the published application.

## Local lab only

`config/labPostgresPool.js` fixes the destination to `127.0.0.1:55432/tienda_remeras_app_lab`. It does not load dotenv, accept a connection URL, or fall back to remote hosts. Supply the lab container password only as the temporary process variable `NEON_LAB_PASSWORD` when running `npm run test:pg-lab` from `backend/`.

Apply `migrations/neon/001_catalog_projects.sql` only to a disposable/local lab using a transaction. It is additive: it adds nullable asset metadata fields and indexes, creates the product/project/link tables, enables owner-context RLS for projects, and inserts six models with `ON CONFLICT DO NOTHING`. It does not migrate auth or files, or create Supabase Storage objects. The existing Supabase Misión 1 migration remains unchanged and must not be used against Neon as-is.

## Neon provisioning still required

- Create a dedicated backend database role, grant it only the required table/sequence privileges, and keep network credentials in the hosting provider's secret store.
- Configure TLS for Neon. The lab pool intentionally disables TLS only for loopback.
- For private projects, run each request in a transaction, set `app.user_id` only from the verified JWT subject with `setDatabaseUser`, and apply owner filtering/RLS. Never expose the database credential to the browser.
- Existing controllers still use Supabase PostgREST/Auth-compatible client calls and Supabase Storage. The SQL pool does not translate those calls; controller cutover, private-file storage/signing, authentication behavior, and route-level tests need a separately reviewed implementation before Neon can serve traffic.
- `product_models` and `design_projects` schema fields match the current controller payloads. Existing asset metadata fields added here are nullable so restored records remain intact.

`npm run test:pg-lab` performs existing-row counts and relation checks, tests six models and project RLS using synthetic identities, and runs HTTP checks against the existing project, product, asset, design and profile routes. It rolls back or cleans up only its own synthetic data. Upload and delete tests replace Cloudinary calls in-process; no remote image is touched. Test identity middleware is local to the test scripts; production authentication remains the existing Supabase-backed JWT middleware. Profile coverage exercises database persistence only and does not validate JWTs.

`GET /api/products/models/:id` is available for retrieving one active model; the existing list route remains unchanged. Project responses retain the existing JSON shape and authenticated owner scope. Asset and design JSON fields, pagination envelopes, visibility checks and Cloudinary URLs follow their existing route contracts.

## Orders lab coverage

`POST /api/payments/create_preference`, `GET /api/payments/order/:id`, the existing user order list, and the payment webhook have PostgreSQL lab branches. The lab checkout requires `app.locals.neonLabPaymentGateway`; absent that test double it returns 503 and never falls through to the Mercado Pago SDK. Lab webhook processing also requires a test gateway and an explicitly injected local webhook secret. Order inserts and webhook updates run in transactions with parameterized SQL. The lab resolves product identity and price from the repository catalog (`src/data/products.js`), rejects client-price mismatches, and validates quantities and sizes before creating the simulated preference. Supabase remains the default and retains its existing order-item payload and Mercado Pago calls.

Order ownership is read from the authenticated `req.user.id`; the request body cannot set `user_id`. Private order reads are owner-scoped, with the existing admin exception. The webhook still maps the same provider statuses (`approved` to `paid`, `rejected`/`cancelled` to `cancelled`, and `in_process`/`pending` to `pending`). Migration `002_payment_webhook_idempotency.sql` adds a private event ledger with unique `(provider,event_id)` and `(provider,request_id)` constraints. The signed request ID protects against a replay whose unsigned body event ID was changed. A transaction claims each event before the payment lookup; concurrent duplicate deliveries do not both reach payment processing. Failures are marked retryable, and state changes plus event completion are transactional. Distinct event IDs/request IDs for one payment are intentionally accepted and serialize on the order row.

The HTTP harness injects simulated identities and a local payment gateway; it does not validate production JWTs. No Mercado Pago or Cloudinary calls are made. The harness cleans only its uniquely prefixed synthetic orders, users, and event records. Baseline and final lab counts are users=8, design_assets=514, designs=0, orders=3, design_projects=0; synthetic webhook event rows are removed.

### Payment integration items to resolve before production cutover

- Webhook HMAC validation now follows Mercado Pago's documented `ts=...,v1=...` format and manifest, uses constant-time digest comparison, and rejects absent secrets. The lab uses a synthetic secret only. The Mercado Pago validator procedure is documented [here](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro-preferences/payment-notifications).
- The persistent event ledger and price validation migration/code are laboratory-only; the Supabase production branch has not been migrated to that ledger or server-side price resolution. Do not treat production payments as ready.
- Preference creation does not currently attach the order ID as `external_reference`, and the existing webhook mapping may need the Merchant Order lookup fallback. The `orders` schema still has no unique preference/payment constraints. Event delivery dedupe is separate from payment identity; distinct notifications for one payment remain processable.
- The current cart caller sends only name, price, and quantity, without a stable product ID or selected variant. Lab name fallback works only for unique names in the static catalog; the least disruptive durable contract is to send the existing product ID and selected variant and resolve them from an authoritative server catalog. Current catalog `price` is the sale amount and `originalPrice` is display-only; there is no size-specific price rule. The custom design item has a hard-coded client price and no catalog record, so the lab rejects it until an authorized server-side price is defined.
- Server checkout still relies on the current shipping threshold and flat fee. Those are preserved existing rules, not independently verified commercial settings. Discounts, taxes, production costs, and project-specific costs have no backend pricing rules in the inspected catalog.
