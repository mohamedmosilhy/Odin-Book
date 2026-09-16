# Odin-Book — Entities

**Phase:** 2 — Domain Modeling

This document defines every domain entity at the field level. Types are
conceptual (domain-level), not Prisma/SQL types — those are decided in
Phase 3.

---

## User

The application's authentication identity. Aggregate root.

```
User
--------------------------------
id
email                unique
passwordHash?        nullable — absent for Google-only accounts
createdAt
updatedAt
```

- `email` is the **login identifier**, not the public identity.
- `passwordHash` is nullable because a user may authenticate via Google only.
- A `User` may have **zero or one** `ExternalIdentity` per provider, and
  **zero or one** password credential — but must have at least one
  authentication method.

---

## Profile

The public/social identity of a user. **Independent aggregate**, linked
1:1 to `User` by `userId`. See `domain-decisions.md` for why this is split
out rather than embedded in `User`.

```
Profile
--------------------------------
userId               unique, references User
username              unique
displayName
bio?
profilePicture?
visibility            PUBLIC | PRIVATE
createdAt
updatedAt
```

- `username` is the **public identity** — unique, independent of `email`.
- `visibility` drives all post-visibility decisions (see `invariants.md`).
- Created atomically alongside `User` at registration (both succeed or both
  fail), but addressed and modified independently thereafter.

---

## ExternalIdentity

A linked external authentication provider identity.

```
ExternalIdentity
--------------------------------
id
userId                references User
provider              GOOGLE (extensible to other providers later)
providerUserId        provider's stable identifier for this user
createdAt
```

- `(provider, providerUserId)` is unique — one external identity maps to
  exactly one `User`.
- A `User` may have multiple `ExternalIdentity` rows (one per provider) in
  the future, though only Google is in scope for MVP.
- If a Google login's email matches an existing local `User.email`, the
  `ExternalIdentity` is linked to that existing user rather than creating a
  duplicate account.

---

## FollowRelationship

Represents the connection — or pending request — between two users.

```
FollowRelationship
--------------------------------
id
requesterId           references User
targetId               references User
status                 PENDING | ACTIVE
createdAt
updatedAt
```

- No `REJECTED` or `UNFOLLOWED` status exists. The row is deleted when a
  request is rejected or an active follow is ended (see `state-transitions.md`).
- At most one row may exist for a given `(requesterId, targetId)` pair at
  any time, regardless of status.
- `requesterId != targetId` is enforced (no self-follow).

---

## Post

User-authored content. Aggregate root (own aggregate; Comments and Likes
reference it but are not part of its aggregate boundary).

```
Post
--------------------------------
id
authorId              references User
content
createdAt
updatedAt
deletedAt?            soft delete
```

- Visibility is **not** a field on `Post` — it's derived from
  `Post.author.profile.visibility` plus the viewer's follow relationship
  to the author.
- `deletedAt` set (non-null) means the post is soft-deleted: excluded from
  all normal reads (feed, profile view, direct fetch) but the row persists.

---

## PostImage

An image attached to a post. Part of the `Post` aggregate.

```
PostImage
--------------------------------
id
postId                references Post
url
position?             display order, if multiple images
createdAt
```

- The binary file lives in external Image Storage; only the resulting URL
  is persisted here.
- Hard-deleted when its parent Post is hard-cascaded (see `invariants.md`
  §Deletion Cascade) — note this is a hard delete even though `Post` itself
  is soft-deleted; see `domain-decisions.md` for the rationale.

---

## Comment

A reply attached to a post, authored by a user.

```
Comment
--------------------------------
id
authorId              references User
postId                 references Post
content
createdAt
updatedAt
```

- No `deletedAt` — Comment deletion is a **hard delete**.
- Requires the author to be able to view the post at creation time (not
  re-validated retroactively if visibility later changes).

---

## Like

A user's reaction to a post.

```
Like
--------------------------------
userId                references User
postId                 references Post
createdAt
```

- No `deletedAt` — unliking is a hard delete of the row.
- `(userId, postId)` is unique — a user can like a post at most once.
- No standalone `id`; the composite key `(userId, postId)` is sufficient.

---

## Field Notation Key

- `?` — optional / nullable field
- `unique` — must be unique across all rows of that entity
- No explicit type system here on purpose — types are a Phase 3 (Prisma
  schema) concern, not a domain concern.
