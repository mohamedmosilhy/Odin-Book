# Odin-Book — Security Decisions

**Phase:** 6 — Security
**Status:** Resolved / Approved

ADR-style log of the decisions made this phase.

---

## SEC-01 — Password hashing algorithm

**Options considered:** bcrypt, argon2id.

**Decision: argon2id.**

**Rationale:** OWASP's current recommendation; memory-hard, meaningfully
more resistant to GPU/ASIC-accelerated cracking than bcrypt's CPU-only
cost factor. Chosen deliberately over the more ubiquitous bcrypt default
to reflect current best practice. Full parameters in
`password-hashing.md`.

---

## SEC-02 — JWT signing algorithm

**Options considered:** HS256 (symmetric), RS256 (asymmetric).

**Decision: HS256.**

**Rationale:** Odin-Book is a modular monolith (Phase 3, AD-01) — one
process signs and verifies every token. RS256's asymmetric key-pair
management earns its complexity only when multiple independent services
must verify tokens without holding the signing secret, which doesn't
apply here.

---

## SEC-03 — Refresh token architecture

**Options considered**
- **A. Stateless** (e.g. JWT refresh token with an embedded rotation
  counter, no DB row). Simpler; but genuinely can't support immediate
  revocation (logout, theft response) without an additional blocklist —
  which is itself state, so this option doesn't actually avoid a
  database.
- **B. DB-backed, hashed, family-based rotation with reuse detection.**
  One new table; supports true, immediate revocation and detects
  stolen-token replay.

**Decision: Option B.**

**Rationale:** AUTH-04 (logout) requires the session to actually end,
not just expire eventually — only a stateful design delivers that
honestly. Full schema and flow in `refresh-token-persistence.md`. This
resolves the open dependency Phase 5 flagged and constitutes a
retroactive, additive amendment to Phase 4's `schema.prisma` (one new
`RefreshToken` table; no changes to existing tables besides a new
relation field on `User`).

---

## SEC-04 — Rate limiting storage backend

**Options considered:** in-memory (`@nestjs/throttler` default),
Redis-backed.

**Decision: in-memory, for now.**

**Rationale:** Matches the actual deployment shape assumed since Phase 3
— a single backend instance. Redis-backed limiting is the correct
upgrade *if and when* the app is ever deployed across multiple
instances, since in-memory limits don't share state across processes;
flagged explicitly in `rate-limiting.md` rather than silently deferred.

---

## SEC-05 — PKCE for Google OAuth

**Decision: not used.**

**Rationale:** PKCE protects public clients that cannot hold a client
secret. Odin-Book's OAuth exchange is server-side with a confidential
client secret (Phase 5's flow design) — the attack PKCE defends against
doesn't apply to a confidential-client flow. Using it anyway would be
unnecessary complexity with no corresponding threat closed. Full
reasoning in `oauth-hardening.md`.

---

## Summary Table

| ID | Decision | Chosen Option |
|---|---|---|
| SEC-01 | Password hashing | argon2id |
| SEC-02 | JWT signing algorithm | HS256 |
| SEC-03 | Refresh token architecture | DB-backed, hashed, family-based rotation |
| SEC-04 | Rate limiting backend | In-memory (Redis flagged as future scaling need) |
| SEC-05 | OAuth PKCE | Not used — confidential client, `state` param only |
