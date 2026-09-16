# Odin-Book — Domain Invariants

**Phase:** 2 — Domain Modeling

Invariants are rules that must **always** hold true. Each one below should
eventually map to: a domain rule + application validation + a database
constraint (where applicable) + a test. Phase 3+ will implement the second
and third; Phase 1's `acceptance-criteria.md` covers the testable behavior.

---

## User

- `email` is unique across all users.
- A user must have at least one authentication method: a `passwordHash` or
  at least one `ExternalIdentity`.
- Authentication credentials (password hashes) are never exposed in any
  read model or API response.

## Profile

- `username` is unique across all profiles.
- Every `User` has exactly one `Profile`, created atomically at registration.
- `visibility` is always one of `PUBLIC` or `PRIVATE` — no unset state.

## ExternalIdentity

- `(provider, providerUserId)` is unique.
- A Google login whose email matches an existing `User.email` links to that
  existing user rather than creating a new one.

## FollowRelationship

- A user must not be able to create a `FollowRelationship` where
  `requesterId == targetId` (no self-follow).
- At most one `FollowRelationship` row may exist for a given
  `(requesterId, targetId)` pair at any time.
- If the target's `Profile.visibility` is `PUBLIC`, a new
  `FollowRelationship` is created directly with status `ACTIVE`.
- If the target's `Profile.visibility` is `PRIVATE`, a new
  `FollowRelationship` is created with status `PENDING`.
- Only the `target` user may accept or reject a `PENDING` request.
- Accepting a `PENDING` request transitions it to `ACTIVE`.
- Rejecting a `PENDING` request **deletes** the row (no history retained).
- Unfollowing an `ACTIVE` relationship **deletes** the row.
- A `PENDING` request does **not** grant the requester access to the
  target's protected content — only `ACTIVE` does.

## Post

- Every `Post` has exactly one `authorId`.
- Only the author may edit their `Post`.
- Only the author may delete their `Post`.
- `Post` deletion is a **soft delete**: `deletedAt` is set; the row is not
  removed.
- Soft-deleted posts (`deletedAt` not null) are excluded from all normal
  reads: feed, profile view, and direct fetch by ID.
- A viewer may access a `Post` only if:
  - the author's `Profile.visibility` is `PUBLIC`, **or**
  - the viewer has an `ACTIVE` `FollowRelationship` targeting the author
    (or the viewer *is* the author).

## Deletion Cascade

- Deleting (soft-deleting) a `Post` **hard-deletes** all of its `Comment`,
  `Like`, and `PostImage` rows. These do not persist past the post's
  removal from visibility, regardless of the Post's own soft-delete —
  there's no scenario where a comment or like on an invisible post needs
  to survive independently. See `domain-decisions.md` for why Post and
  its dependents use different deletion strategies.

## Comment

- Every `Comment` has exactly one `authorId` and belongs to exactly one
  `Post`.
- A user may create a `Comment` only if they can view the parent `Post` at
  the time of creation.
- `Comment` content must be non-empty.
- Only the author may delete their own `Comment`.
- `Comment` deletion is a **hard delete**.
- Anyone who can view a `Post` can view all of its (non-deleted) comments —
  there is no separate comment-level visibility rule.

## Like

- A user may like a `Post` only if they can view it.
- `(userId, postId)` is unique — a user cannot like the same post twice.
  This must be enforced by both application logic and a database
  uniqueness constraint (concurrent requests can otherwise race past
  application-only checks).
- Unliking is a hard delete of the `Like` row.

## Authorization (cross-cutting)

- Authentication answers "who are you"; authorization answers "are you
  allowed to do this" — the two are never conflated.
- All authorization checks are enforced **server-side**. Frontend
  route guards / conditional rendering are UX conveniences only and must
  never be treated as the actual access boundary.
- Visibility and ownership rules (above) are the two authorization
  primitives everything else composes from — there is no third,
  ad-hoc permission concept in the MVP.
