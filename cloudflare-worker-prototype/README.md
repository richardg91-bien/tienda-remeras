# Cloudflare Workers isolated compatibility lab

This directory is a synthetic, in-memory prototype only. It does not import the application backend or frontend, read `.env` files, contact vendor APIs, create remote resources, or contain production credentials. Its test identity and secrets are disposable constants. User state is held in memory and disappears when the local Worker restarts.

The Express bridge uses Cloudflare's documented `httpServerHandler` from `cloudflare:node`. `wrangler dev --local` runs the local Workers runtime for compatibility checks. It does not reproduce the account's Workers Free plan quota enforcement and cannot prove that a remote Free invocation stays under its 10 ms CPU limit.

Run `npm install`, then start `npm run dev` in one terminal and `npm run test:local` in another. The `/compat` route only imports or constructs SDK clients with synthetic values; it never makes network calls.
