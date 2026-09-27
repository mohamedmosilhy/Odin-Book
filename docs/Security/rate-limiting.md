# Odin-Book — Rate Limiting

**Phase:** 6 — Security
**Status:** Approved

---

## 1. Mechanism

`@nestjs/throttler`, with its default **in-memory** storage backend (no
Redis). This matches the project's actual deployment shape — a single
backend instance (Phase 3's modular-monolith decision already assumes
this; nothing in the architecture calls for horizontal scaling).

**Known limitation, accepted:** in-memory limits reset on process
restart and don't share state across instances. If Odin-Book is ever
deployed behind multiple instances, this must move to a Redis-backed
throttler storage — flagged here explicitly so it isn't forgotten, not
because it's needed now.

## 2. Limits

| Route(s) | Limit | Rationale |
|---|---|---|
| `POST /auth/login` | 5 requests / 60s per IP | Brute-force/credential-stuffing protection — the single highest-value target on the whole API |
| `POST /auth/register` | 5 requests / 60s per IP | Prevents mass fake-account creation |
| `POST /auth/refresh` | 10 requests / 60s per IP | Looser than login (legitimate clients refresh routinely) but still bounded — a tight loop hitting refresh is never legitimate |
| Google OAuth routes | 10 requests / 60s per IP | Same class of concern as login |
| Every other route | 100 requests / 60s per IP | General abuse/DoS backstop — generous enough not to interfere with normal use |

Limits are keyed by IP by default; authenticated routes could additionally
key by `userId`, but IP-based is sufficient for MVP scope and simpler to
reason about.

## 3. Response on Limit Exceeded

`429 Too Many Requests`, using the same uniform error shape as every
other error (Phase 5, `api-conventions.md` §3):
```json
{ "error": { "code": "RATE_LIMITED", "message": "Too many requests. Please try again later.", "details": null } }
```

## 4. Interaction with Refresh Rotation

Worth noting explicitly: the stricter login/register limits are IP-based
and independent of the refresh-token reuse-detection logic
(`refresh-token-persistence.md` §4) — rate limiting slows down *guessing*
attacks; reuse detection catches *stolen-token replay*. They defend
against different threats and neither substitutes for the other.
