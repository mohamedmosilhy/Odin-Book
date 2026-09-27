# Odin-Book — Configuration & Environment Validation

**Phase:** 7 — Project Structure
**Status:** Approved

This resolves the note left open in Phase 3's `cross-cutting-concerns.md`
§5: "exact `.env` structure is a Project Structure concern."

---

## 1. Principle

The application must **fail to start**, not run in a half-configured
state, if any required environment variable is missing or malformed.
Validation happens once, at boot, in `env.validation.ts` — nothing
downstream re-checks that a config value is present.

## 2. Structure

```
src/config/
├── env.validation.ts
├── database.config.ts
├── jwt.config.ts
├── google-oauth.config.ts
├── storage.config.ts
├── cors.config.ts
└── throttler.config.ts
```

`env.validation.ts` defines one Zod schema composing all the variables
below, passed to `ConfigModule.forRoot({ validate })` in `app.module.ts`.
Each `*.config.ts` file uses `registerAs` to expose a narrow, typed slice
of that validated environment to only the module(s) that need it —
`StorageModule` never sees `JWT_SECRET`, for instance, even though
technically it could reach `process.env` directly.

## 3. Full Variable List

| Variable | Owner config | Required | Notes |
|---|---|---|---|
| `NODE_ENV` | — (global) | Yes | `development` \| `test` \| `production` |
| `PORT` | — (global) | No (default 3000) | |
| `DATABASE_URL` | `database.config.ts` | Yes | Phase 4 |
| `JWT_SECRET` | `jwt.config.ts` | Yes | High-entropy, Phase 6 SEC-02 |
| `JWT_ACCESS_TOKEN_TTL` | `jwt.config.ts` | No (default `15m`) | Phase 6 |
| `JWT_REFRESH_TOKEN_TTL_DAYS` | `jwt.config.ts` | No (default `30`) | Phase 6 |
| `GOOGLE_CLIENT_ID` | `google-oauth.config.ts` | Yes | Phase 1 AUTH-03 |
| `GOOGLE_CLIENT_SECRET` | `google-oauth.config.ts` | Yes | Never logged |
| `GOOGLE_CALLBACK_URL` | `google-oauth.config.ts` | Yes | Must exactly match Google Console allowlist (Phase 6) |
| `SUPABASE_URL` | `storage.config.ts` | Yes | Phase 3 AD-05 |
| `SUPABASE_KEY` | `storage.config.ts` | Yes | Service-role key; never exposed client-side |
| `FRONTEND_URL` | `cors.config.ts` | Yes | Single allowlisted CORS origin, Phase 6 |
| `THROTTLE_AUTH_LIMIT` | `throttler.config.ts` | No (default `5`) | Phase 6 |
| `THROTTLE_DEFAULT_LIMIT` | `throttler.config.ts` | No (default `100`) | Phase 6 |

## 4. `.env.example`

Committed to the repo, every key above present with a placeholder value
(never a real secret):

```
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://user:password@localhost:5432/odinbook

JWT_SECRET=replace-with-a-long-random-value
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL_DAYS=30

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key

FRONTEND_URL=http://localhost:5173

THROTTLE_AUTH_LIMIT=5
THROTTLE_DEFAULT_LIMIT=100
```

## 5. Secrets Handling

- The real `.env` is gitignored; only `.env.example` is committed.
- Production secrets are supplied by the deployment platform's own
  secret store (exact mechanism is a Phase 12 concern) — never
  committed, never passed as plain build-time arguments that would land
  in image layers or CI logs.
