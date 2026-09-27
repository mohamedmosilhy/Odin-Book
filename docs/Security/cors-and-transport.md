# Odin-Book — CORS & Transport Security

**Phase:** 6 — Security
**Status:** Approved

---

## 1. CORS Policy

```
origin: [FRONTEND_URL]   // single allowlisted origin, from env config
credentials: true         // required — the refresh cookie must be sent cross-origin
methods: GET, POST, PATCH, DELETE
allowedHeaders: Content-Type, Authorization
```

**No wildcard (`*`) origin, ever** — this is non-negotiable once cookies
are involved: browsers refuse to combine `credentials: true` with a
wildcard origin anyway, but more importantly, an open origin policy on a
cookie-authenticated API is a direct CSRF/session-riding exposure.

`FRONTEND_URL` is env-configured so dev, staging, and production each
point at their own exact origin — never a pattern-matched or
partially-wildcarded domain.

## 2. Cookie Attributes (Refresh Token)

```
HttpOnly   — inaccessible to JavaScript, closes the XSS-theft vector entirely
Secure     — sent only over HTTPS (including localhost dev via mkcert/similar if needed)
SameSite=Lax
Path=/api/v1/auth   — scoped narrowly; not sent to every API route, only auth ones
```

**`SameSite=Lax`, not `Strict`:** `Strict` would prevent the cookie from
being sent on the top-level navigation that follows the Google OAuth
redirect back to the frontend (a cross-site navigation, by definition,
since it's arriving from `accounts.google.com`). `Lax` still blocks the
cookie from being attached to genuinely cross-site *subrequests*
(the actual CSRF threat model), while allowing top-level GET navigations
— exactly the case the OAuth callback needs.

## 3. Transport-Level Hardening

- **HTTPS everywhere** outside local dev — enforced at the deployment/
  reverse-proxy layer (Phase 12), not application code.
- **Helmet** (`helmet` middleware) applied globally in `main.ts` —
  standard security headers (`X-Content-Type-Options`,
  `X-Frame-Options`, a baseline `Content-Security-Policy`, etc.) with no
  Odin-Book-specific customization needed at this scale.
- **No sensitive data in URLs**, with the one deliberate, documented
  exception: the OAuth callback's access token in a URL *fragment*
  (Phase 5, `auth-flows.md` §3) — fragments are a client-side-only
  construct, never transmitted to any server, which is precisely why
  that exception is safe.

## 4. Injection Defense

Not a new decision this phase — inherited "for free" from earlier
choices, restated here for completeness:
- **SQL injection:** Prisma's query builder parameterizes all queries by
  default; no raw SQL string interpolation exists anywhere in this
  design.
- **Input validation:** every DTO is validated by the global
  `ValidationPipe` (Phase 3/5) before reaching a controller body —
  malformed or oversized input never reaches business logic.
