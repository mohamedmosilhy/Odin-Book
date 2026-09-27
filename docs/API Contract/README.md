# Odin-Book — Phase 5: API Contract

**Status:** Completed / Approved

This package defines the concrete REST surface a frontend is built
against — routes, request/response shapes, status codes, pagination, and
the full authentication flow.

## Contents

```
api-contract/
├── api-conventions.md      Base path, casing, response/error shape, status codes
├── auth-flows.md            Register/login/Google OAuth/refresh/logout — token mechanics
├── endpoints-reference.md    Full route catalog by module, with example payloads
├── dto-reference.md          Validation rules for every request DTO
└── api-decisions.md          ADR log of the 4 decisions made this phase
```

## Key decisions made this phase

1. **Auth transport:** hybrid — short-lived JWT access token returned in
   the response body (kept in frontend memory, never persisted), plus a
   long-lived httpOnly refresh cookie, with rotation on every refresh.
   Google OAuth's final redirect carries the access token in a URL
   fragment (never sent to any server) since that flow can't return a
   response body.
2. **Privacy-preserving status codes:** a private post/comment the
   viewer can't see returns `404`; `403` is reserved for ownership
   failures on visible resources. A private profile's shell is still
   `200`.
3. **URL identification:** `username` for public paths, `id` for
   internal action targets (requests, comments).
4. **No likers-list endpoint** in this phase — count only.

Full rationale for each is in `api-contract/api-decisions.md`.

## Open dependency flagged for the next phase

Refresh-token rotation (§4 of `auth-flows.md`) needs a
persistence/revocation mechanism not yet in the Phase 4 schema — Phase 7
must decide between a `RefreshToken` table or a stateless signed-family
approach before this is fully implementable.

## Next

**Phase 6 — Security.** Password hashing algorithm, JWT signing and
lifetime specifics, the refresh-token persistence mechanism flagged
above, CORS policy, rate limiting, and OAuth hardening (state/PKCE).
