# Odin-Book — Deletion & Cascade Semantics

**Phase:** 4 — Database
**Status:** Approved

This document exists specifically to correct and formalize a mistake made
in Phase 2's `domain-decisions.md`, and to make the actual deletion
behavior unambiguous before implementation starts.

---

## 1. The Correction

Phase 2 (DD-03) stated that deleting a `Post` would cascade to its
`Comment`, `Like`, and `PostImage` rows via a database-level
`ON DELETE CASCADE`, "triggered by the same operation that sets
`deletedAt`."

**That's not how `ON DELETE CASCADE` works.** It's a foreign-key trigger
that fires only on an actual SQL `DELETE` of the parent row. Since `Post`
deletion is a **soft delete** — an `UPDATE` setting `deletedAt`, never a
`DELETE` — the FK cascade never fires. If we'd relied on it as originally
written, deleting a post would have left its comments, likes, and images
silently orphaned and still queryable.

---

## 2. What the Schema Actually Does

`schema.prisma` still declares `onDelete: Cascade` on every FK from
`Comment`, `Like`, `PostImage`, and `FeedItem` back to `Post`. This is
kept deliberately — it's a correctness safety net for any *future* hard-delete
path (e.g., a GDPR account-deletion feature, or a data-retention purge
job that eventually hard-deletes old soft-deleted posts), so the database
itself guarantees no orphaned rows if a real `DELETE` ever happens. It
simply isn't what powers the **current** Post-deletion flow.

## 3. What Actually Enforces the Phase 2 Invariant

The invariant — *"deleting a Post removes its Comments, Likes,
PostImages, and FeedItems from view"* — is enforced by **application
code**, in a single database transaction, inside `DeletePostUseCase`
(`ContentModule`, per Phase 3):

```
DeletePostUseCase.execute(userId, postId):

  BEGIN TRANSACTION
    1. Verify caller owns the post (else throw NotPostOwnerError)
    2. UPDATE Post SET deletedAt = now() WHERE id = postId
    3. DELETE FROM Comment WHERE postId = postId
    4. DELETE FROM Like WHERE postId = postId
    5. DELETE FROM PostImage WHERE postId = postId
  COMMIT

  6. Emit PostDeletedEvent(postId)   -- outside the transaction,
                                       after commit succeeds
```

`PostDeletedEvent` is then handled by `FeedModule` (per Phase 3's
cross-cutting concerns) to remove the corresponding `FeedItem` rows —
kept as an event rather than a direct call in the same transaction,
consistent with the module-boundary decision that `ContentModule` doesn't
directly reach into `FeedModule`'s data.

**Why steps 3–5 are hard deletes despite Post being soft-deleted:** per
Phase 2 DD-03, there's no scenario where a comment or like on an
invisible (soft-deleted) post needs to survive independently — soft-delete
was chosen for `Post` specifically for moderation/undo value on the post's
*content*, not for its dependents.

---

## 4. Read-Path Enforcement

Every query that returns `Post` rows — direct fetch, profile view, and
(at the `VisibilityPolicy` safety-filter layer) feed reads — filters
`WHERE deletedAt IS NULL`. This is enforced once, at the repository
layer (`PrismaPostRepository`), not re-implemented per call site: every
read method on that repository applies the filter by default, and a
soft-deleted post is never returned unless a method is explicitly named
otherwise (none currently is — there's no "view deleted post" feature in
the MVP).

---

## 5. Summary Table

| Entity | Deletion type | Enforced by |
|---|---|---|
| Post | Soft (`deletedAt`) | `DeletePostUseCase`, filtered on every read |
| Comment | Hard | `DeletePostUseCase` (cascade cleanup) or `DeleteCommentUseCase` (standalone) |
| Like | Hard | `DeletePostUseCase` (cascade cleanup) or `UnlikePostUseCase` (standalone) |
| PostImage | Hard | `DeletePostUseCase` (cascade cleanup) only — no standalone delete in MVP |
| FeedItem | Hard | `FeedModule`'s `PostDeletedEvent` handler |
| FollowRelationship | Hard | `RejectRequestUseCase` / `UnfollowUseCase` directly (Phase 2, DD-02) |

`ON DELETE CASCADE` in the schema remains a defense-in-depth measure for
future hard-delete paths, not the mechanism for any of the above.
