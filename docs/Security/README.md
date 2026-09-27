# Odin-Book — Phase 6: Security

**Status:** Completed / Approved

This package makes the concrete security implementation decisions
layered on top of the Phase 3 architecture and Phase 5 API contract.

## Contents

```
security/
├── password-hashing.md              argon2id parameters and usage
├── jwt-and-tokens.md                 HS256 signing, access/refresh lifetimes
├── refresh-token-persistence.md       RefreshToken table, rotation + reuse detection
├── cors-and-transport.md              CORS policy, cookie attributes, Helmet
├── rate-limiting.md                    @nestjs/throttler limits per route class
├── oauth-hardening.md                  state param, why PKCE isn't needed, redirect allowlist
└── security-decisions.md               ADR log of the 5 decisions made this phase
```

## Key decisions made this phase

1. **argon2id** for password hashing (over bcrypt).
2. **HS256** JWT signing (single-service monolith — no need for RS256).
3. **Refresh tokens are DB-backed**, hashed, with family-based rotation
   and reuse detection — this resolves the dependency Phase 5 flagged,
   and adds one new table (`RefreshToken`) to Phase 4's schema.
4. **Rate limiting is in-memory** for now, with Redis flagged as the
   required upgrade if the app is ever deployed across multiple
   instances.
5. **No PKCE** on the Google OAuth flow — it's a confidential
   server-side client, so PKCE's threat model doesn't apply; `state` is
   still used for CSRF protection.

Full rationale for each is in `security/security-decisions.md`.

## Schema Amendment

`refresh-token-persistence.md` §2 adds a `RefreshToken` model to Phase
4's `schema.prisma` and a `refreshTokens RefreshToken[]` relation on
`User`. This is the only schema change introduced by this phase.

## Next

**Phase 7 — Project Structure**: the literal repo layout — folder
structure, module organization on disk, naming conventions, and
config/env validation setup, translating everything decided so far into
where things actually live in the codebase.
