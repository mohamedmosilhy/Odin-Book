# Odin-Book — Database Schema Overview

**Phase:** 4 — Database
**Status:** Approved
**Depends on:** Phase 2 (domain model), Phase 3 (architecture)
**Schema file:** `schema.prisma`

---

## 1. Purpose

This document walks the Prisma schema table-by-table, explaining *why*
each field, type, and constraint is there — the schema file itself is the
source of truth; this is the annotated reading of it.

---

## 2. ID Strategy

Every primary key is `String @default(cuid())`.

**Why `cuid()` over `uuid()`:** cuids are roughly time-ordered, which
benefits `FeedItem` cursor pagination and general B-tree index locality.
A fully random `uuid()` would fragment those indexes for no offsetting
benefit at this scale.

---

## 3. Table-by-Table

### User
The authentication root. `email` is unique and is the login identifier —
`passwordHash` is nullable because a user may authenticate via Google
only (see `ExternalIdentity` below). No `username` here — that lives on
`Profile`, deliberately kept as a separate concern (Phase 2, DD-01).

### Profile
Independent aggregate, 1:1 with `User` via a unique `userId`. Owns
`username` uniqueness. `visibility` defaults to `PUBLIC` and drives every
content-access decision in the app — no other table carries a visibility
flag.

### ExternalIdentity
One row per linked provider. `(provider, providerUserId)` is unique so a
given Google account can only ever map to one `User`. Multiple rows per
user are allowed (future providers), though only `GOOGLE` exists in the
enum today.

### FollowRelationship
`(requesterId, targetId)` is unique — at most one row per directional
pair, ever, matching the Phase 2 decision to drop `REJECTED` as a
persisted state (DD-02). `status` is `PENDING` or `ACTIVE` only. Two
indexes support the two directions relationships get queried from:
`[targetId, status]` for "who has a pending request to me / who actively
follows me," and `[requesterId, status]` for "who do I actively follow /
have a pending request to."

### Post
`deletedAt` implements the soft-delete decision (Phase 2, DD-03). No
`visibility` field — visibility is always derived from
`author → Profile.visibility` (+ the viewer's follow status), never
stored redundantly on the post itself. `[authorId, createdAt]` supports
both "posts by this author, newest first" (profile view) and is the same
shape of index `FeedItem` uses for feed reads. `[deletedAt]` supports
efficiently filtering out soft-deleted rows.

### PostImage
Owned by `Post` (deleted alongside it — see
`deletion-and-cascades.md`). Stores only a `url`; the binary lives in
Supabase Storage per the Phase 3 decision (AD-05).

### Comment
No `deletedAt` — Comment uses hard delete (Phase 2, DD-03 as refined:
Post soft-deletes, Comment/Like hard-delete). `[postId, createdAt]`
supports "comments on this post, in order."

### Like
Composite primary key `(userId, postId)` — no surrogate `id`, since the
pair is already a natural unique key and nothing else ever needs to
reference an individual `Like` by its own identity. This directly
enforces LIKE-03 (duplicate-like prevention) at the database level, not
just in application logic.

### FeedItem
The materialized feed, per Phase 3's cached-feed decision (AD-03).
`ownerId` is whose feed the row belongs to; `postId` is the referenced
post; `authorId` is denormalized onto the row so feed queries can filter
or group by author without an extra join. `(ownerId, postId)` is unique
— a post can only appear once in a given owner's feed, which also makes
fan-out idempotent (safe to retry). `[ownerId, createdAt]` is the index
that makes feed reads fast and supports cursor pagination.

---

## 4. What's Deliberately Not in the Schema

- **No `GuestSession` table.** The guest/demo experience (GUEST-01/02) is
  implemented as a pre-seeded demo `User` + `Profile`, restricted at the
  application/guard layer. No schema footprint needed.
- **No `Session`/`RefreshToken` table here.** Authentication session
  mechanics are a Phase 7 (Security) concern, layered on top of this
  schema rather than being part of the domain-derived tables.
- **No `REJECTED` or `UNFOLLOWED` status, no relationship history table.**
  Deliberately dropped per Phase 2 DD-02.
