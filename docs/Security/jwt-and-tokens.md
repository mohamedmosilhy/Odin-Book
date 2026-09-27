# Odin-Book — JWT Signing & Token Lifetimes

**Phase:** 6 — Security
**Status:** Approved

---

## 1. Signing Algorithm: HS256

**HS256** (HMAC-SHA256, symmetric) over RS256 (asymmetric). RS256 earns
its complexity when multiple independent services need to *verify*
tokens without ever holding the secret that *signs* them (e.g. a
separate microservice validating a token issued elsewhere). Odin-Book is
a modular monolith (Phase 3, AD-01) — exactly one process ever signs or
verifies a token — so the asymmetric key-pair management RS256 requires
buys nothing here.

`JWT_SECRET` is a high-entropy random value, supplied via environment
variable, validated non-empty at boot (Phase 3, `cross-cutting-concerns.md`
§5).

## 2. Access Token

- **Lifetime:** 15 minutes.
- **Payload (claims):** `sub` (userId), `iat`, `exp`. Deliberately
  minimal — no email, no roles/permissions baked in, since authorization
  in this system is always resolved dynamically via `VisibilityPolicy`
  and ownership checks (Phase 3) against current database state, never
  by trusting a claim that could go stale mid-lifetime.
- **Never persisted** server-side. Statelessly verified by signature +
  expiry on every request via the `AuthGuard` (Phase 3).

## 3. Refresh Token

- **Lifetime:** 30 days.
- **Not a JWT** — a high-entropy random opaque string (e.g. 256 bits from
  a CSPRNG, base64url-encoded). This is deliberate: a refresh token's
  only job is to be looked up against the `RefreshToken` table
  (`refresh-token-persistence.md`) to decide validity/rotation — it
  carries no self-contained claims, so there's nothing to gain from JWT's
  signature-verification model here, and an opaque token can be
  instantly and completely invalidated by deleting its DB row, which a
  signed-but-unexpired JWT cannot be without an additional blocklist
  anyway.

## 4. Configurability

Both lifetimes are config values, not hardcoded literals — tunable
per-environment (e.g. a longer access-token lifetime might be tolerable
in a dev environment for convenience) without a code change.

## 5. Why Not Encode a "Remember Me" Option

Out of scope for MVP (not in any Phase 1 requirement). If added later, it
would extend refresh-token lifetime per-session rather than changing the
token architecture itself.
