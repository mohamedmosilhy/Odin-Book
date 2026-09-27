# Odin-Book — Feed Fan-Out Strategy

**Phase:** 4 — Database
**Status:** Approved
**Depends on:** Phase 3 architecture-decisions.md (AD-03 — cached/precomputed feed)

---

## 1. Overview

`FeedItem` is fanned out on write (new post) and adjusted on social-graph
changes (follow accepted, unfollow, privacy change), rather than computed
per-request. This document specifies exactly when each fan-out/cleanup
happens and how much history is involved.

---

## 2. Trigger Table

| Event | Handler (in `FeedModule`) | Action |
|---|---|---|
| `PostCreatedEvent` | `OnPostCreated` | Insert one `FeedItem` row for the author + one for each of the author's active followers |
| `PostDeletedEvent` | `OnPostDeleted` | Delete all `FeedItem` rows where `postId` matches |
| `FollowAcceptedEvent` | `OnFollowAccepted` | Backfill — see §3 |
| `UnfollowedEvent` | `OnUnfollowed` | Delete `FeedItem` rows where `ownerId` = the unfollower AND `authorId` = the unfollowed |
| `ProfileVisibilityChangedEvent` (PUBLIC→PRIVATE) | `OnVisibilityChanged` | Delete `FeedItem` rows where `authorId` = the user AND `ownerId` is not an active follower of that user |
| `ProfileVisibilityChangedEvent` (PRIVATE→PUBLIC) | `OnVisibilityChanged` | No feed change — non-followers still aren't following; their feed is unaffected until they actually follow |

All handlers use `(ownerId, postId)`'s unique constraint to make fan-out
idempotent — a retried or duplicate event is a safe no-op (upsert
semantics), which matters because event handlers aren't guaranteed
exactly-once delivery even with an in-process emitter (a crash between
DB commit and event handling is possible).

---

## 3. Backfill Scope on Follow-Accept

**Decision: last N posts only, where N = 20 (configurable constant).**

When `FollowAcceptedEvent` fires (a private-profile follow request gets
accepted, or — for symmetry — a public follow completes as `ACTIVE`
immediately), `FeedModule` backfills the **20 most recent** posts by the
newly-followed author into the new follower's feed:

```
OnFollowAccepted(followerId, authorId):
  recentPosts = Post.findMany({
    where: { authorId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: FEED_BACKFILL_LIMIT,   // = 20
  })
  upsert FeedItem rows for (followerId, each recentPost)
```

**Why capped rather than full history:** bounds the write cost of a
single follow action regardless of how prolific the followed author has
been — following someone with 5,000 historical posts shouldn't trigger a
5,000-row write in one request. Twenty is enough to make a new follower's
feed feel populated immediately without unbounded fan-out cost.

**`FEED_BACKFILL_LIMIT` is an application-level constant** (not schema-encoded), defined in `FeedModule`'s config, deliberately kept tunable without
a migration.

**Known trade-off, accepted:** a new follower will not see an author's
posts older than the 20 most recent purely by scrolling their feed — only
by visiting that author's profile directly, where `GetPostsByAuthorUseCase`
reads live from `Post` (no cap). This is judged acceptable for the MVP;
revisit only if user feedback says otherwise.

---

## 4. Consistency Note

`FeedItem` is a read-optimization cache, not the authorization boundary —
`GetFeedUseCase` still runs every result through `VisibilityPolicy` before
returning it (Phase 3, `cross-cutting-concerns.md` §4). A bug in any
handler above can cause a feed to be incompletely populated (fail closed)
but can never cause it to leak content the viewer isn't authorized to see
(fail open) — the policy check is the backstop regardless of what the
cache contains.
