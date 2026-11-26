# Authentication and profile migration notes

## Current identity flow

- This application does not call Supabase Auth (`supabase.auth.*`). Registration and login are implemented in `controllers/authController.js` against `public.users`.
- Registration hashes passwords with bcryptjs (cost 12). Login verifies the stored hash. Password change also verifies/re-hashes locally. No hash values are logged or included in API responses.
- The access JWT and refresh JWT are signed by this backend. Each contains the `id` claim; the access token defaults to 15 minutes and the refresh token to 30 days. `protect` verifies the access JWT and hydrates `req.user` from `public.users` by that ID. Roles are read from the database on each request, not copied into JWT claims.
- The refresh token is stored in `public.users.refresh_token`. The browser keeps the access token in local storage, sends it as a bearer token, and sends the refresh token as an HTTP-only cookie (`SameSite=Lax`, `Secure` in production). Login replaces the user's single stored refresh token; logout clears it. Access tokens have no separate revocation record and remain usable until expiry unless their signing secret changes or the user lookup fails.
- `role` is constrained to `user` or `admin`; `adminOnly` checks the hydrated database role. Profile edit only allows first name, last name, phone, bio and a merged address.
- There is no password-recovery endpoint or email-verification flow in the backend. `is_verified` exists in the profile schema but registration does not verify email. Login/register share a process-local limit of 10 attempts per 15 minutes.

## Identity/profile relationship

The restored lab schema contains `public.users` with a UUID primary key, bcrypt hash, refresh token, profile and role columns. It has no `auth` schema, and `public.users` has no foreign key to `auth.users`. The repository contains no `supabase.auth` calls. Therefore the current application identity and profile are the same `public.users` row; this is not evidence about inaccessible remote Supabase data. Do not assume a paused Supabase project's internal `auth.users` rows are empty or synchronized. Any external Auth users would need explicit reconciliation by stable ID/email before a future cutover.

## Neon transition recommendation

Supabase Auth replacement is not required by the current code because authentication is already custom. Keep the existing token format and semantics during a gradual cutover: same `id` claim, signing algorithms and securely transferred signing secrets, while retaining matching user UUIDs and stored refresh-token values. That is the only plausible no-forced-logout path for unexpired access/refresh tokens. Transfer the signing secrets through the hosting provider's secret manager only during an explicitly approved cutover; never place them in SQL, source control, or this repository.

Before moving login or refresh, establish a verified export for `public.users` and reconcile it with any external Supabase Auth identities if they exist. Preserve bcrypt hashes byte-for-byte if the source values are verified as compatible; do not reset passwords as part of a database copy. Test refresh, logout, account deletion, and secret rotation in a separate environment. A coordinated secret change invalidates sessions and requires an explicit user-facing reauthentication plan. Add recovery/verification only as separately designed features; neither currently exists.

## Profile lab branch

Only `GET /api/users/profile` and `PUT /api/users/profile` have a PostgreSQL lab branch. It uses the authenticated `req.user.id`, parameterized SQL and an update transaction; only profile fields are writable. Supabase remains the default. The lab HTTP test injects a synthetic identity and does not validate JWTs or represent production authentication. Password, refresh-token, avatar, order, registration, login, refresh, logout and account-deletion operations remain on their existing Supabase-backed paths.
