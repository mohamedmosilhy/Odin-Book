# Odin-Book — Password Hashing

**Phase:** 6 — Security
**Status:** Approved
**Decision:** argon2id

---

## 1. Algorithm

**argon2id** — the hybrid Argon2 variant, OWASP's current recommendation
for password storage. Chosen over bcrypt specifically for its
memory-hardness: bcrypt's cost factor only slows down CPU time, which
GPU/ASIC clusters parallelize around; argon2id's memory cost makes that
kind of parallelization meaningfully more expensive per guess.

## 2. Parameters

Using the `argon2` npm package (native bindings), with parameters set at
or above OWASP's current minimum recommendation for argon2id:

```
memoryCost:  19456   // ~19 MiB
timeCost:    2
parallelism: 1
```

These are starting values, not permanently fixed — they're read from
config (env-overridable) specifically so they can be tuned upward as
server hardware headroom allows, without a code change.

## 3. Where Hashing Happens

Hashing/verification is a pure utility, not tied to any one module — it
lives in `SharedModule` (alongside `VisibilityPolicy` and the other
cross-cutting concerns from Phase 3) as a small `PasswordHasher` service
with `hash(plaintext)` and `verify(plaintext, hash)` methods. `AuthModule`
is the only consumer.

## 4. Invariants (ties back to Phase 2/1)

- Plaintext passwords are never logged, never persisted, and never
  included in any error message or exception payload.
- `passwordHash` is never present in any API response (Phase 5's
  `GET /users/me` explicitly excludes it — enforced by the response DTO
  shape, not by hoping the field gets left out).
- Hashing happens in `RegisterUseCase` before the `User` entity is ever
  constructed with a password — a plaintext password never reaches the
  repository layer.

## 5. Migration Note

Since Phase 4's `User.passwordHash` was already modeled as a nullable
opaque string (no length/format assumption baked into the schema),
choosing argon2id here requires zero schema change — the column already
just stores "whatever the hash string looks like."
