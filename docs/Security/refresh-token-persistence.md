# Odin-Book — Refresh Token Persistence & Rotation

**Phase:** 6 — Security
**Status:** Approved
**Resolves:** the open dependency flagged in Phase 5 (`auth-flows.md` §4)
— rotation requires server-side tracking of issued refresh tokens.
**Amends:** Phase 4's `schema.prisma`, adding one new table.

---

## 1. Why This Needs Persistence At All

A refresh token has to be revocable — on logout (AUTH-04), and on
detecting reuse of an already-rotated token (theft signal). A purely
stateless design (e.g. a signed JWT refresh token with an embedded
rotation counter) can't actually satisfy either of those without an
additional revocation list, which is itself state — so there's no real
way to avoid a database table here; the only choice is what it stores.

## 2. Schema Addition

```prisma
model RefreshToken {
  id                  String    @id @default(cuid())
  userId              String
  tokenHash           String    @unique   // SHA-256 hash of the raw token — never the raw value
  familyId            String              // groups a chain of rotations
  expiresAt           DateTime
  revokedAt           DateTime?
  replacedByTokenHash String?             // set when rotated forward
  createdAt           DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([familyId])
}
```

And on `User`, add:
```prisma
refreshTokens RefreshToken[]
```

**Why `tokenHash`, not the raw token:** identical reasoning to password
storage — if the database were ever read (backup leak, SQL injection
elsewhere, insider access), stored raw refresh tokens would be
immediately usable credentials. Hashing them (SHA-256 is sufficient here
— unlike passwords, these are already high-entropy random values, not
human-guessable) means a DB-only leak doesn't hand over live sessions.

**Why `familyId`, not just per-token tracking:** a single login creates
one family; every rotation within that login's lifetime keeps the same
`familyId` and points `replacedByTokenHash` at the next token. This is
what makes reuse detection possible — see §4.

## 3. Rotation Flow (Normal Case)

```
POST /auth/refresh
  1. Hash the incoming refresh token (from the httpOnly cookie).
  2. Look up RefreshToken by tokenHash.
     - Not found → 401 (invalid or already-cleaned-up token).
     - Found but revokedAt is set → THEFT SIGNAL, see §4.
     - Found, expiresAt passed → 401, expected re-login.
     - Found, valid → continue.
  3. Generate a new opaque refresh token + new access token.
  4. UPDATE the old RefreshToken row:
       revokedAt = now(), replacedByTokenHash = hash(newToken)
  5. INSERT a new RefreshToken row (same familyId, new tokenHash).
  6. Set-Cookie the new refresh token; return the new access token.
```

## 4. Reuse Detection (Theft Case)

If a refresh token is presented and its row is found but **already has
`revokedAt` set**, that specific token has already been rotated away
once before — meaning whoever is presenting it now is not the legitimate
holder of the *current* token in that chain (it was already exchanged).
That's the signature of a stolen-and-replayed refresh token.

**Response:** revoke the entire `familyId` — every `RefreshToken` row
sharing that family gets `revokedAt` set immediately, regardless of its
individual state. The legitimate user (whose actual current token is now
also revoked as a side effect) is forced to log in again. This is an
accepted trade-off: a false-positive inconvenience (re-login) is strictly
preferable to leaving a compromised session chain alive.

## 5. Logout (AUTH-04)

```
POST /auth/logout
  1. Hash the incoming refresh token.
  2. Set revokedAt = now() on that RefreshToken row (and, for safety,
     the whole familyId — a user logging out on one device shouldn't
     necessarily kill other devices' sessions in a future multi-device
     model, but for MVP scope we revoke the family, matching the
     single-session assumption elsewhere in this design).
  3. Clear the cookie.
```

## 6. Housekeeping

Expired and revoked `RefreshToken` rows are not deleted immediately —
retained for a grace period (e.g. 7 days past `expiresAt`/`revokedAt`)
in case of investigation, then purged by a periodic cleanup job. Exact
job scheduling mechanism is a Phase 12 (Deployment) concern; this phase
only establishes that the rows are safe to delete once past that window.
