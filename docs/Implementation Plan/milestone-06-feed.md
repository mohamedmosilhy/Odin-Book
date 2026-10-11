# Milestone 6 — Feed

**Size:** L
**Depends on:** M5

---

## Objective

Every user has a working, privacy-safe, paginated feed, kept up to date
via domain events rather than computed live on every request.

## Docs to Have Open

- Phase 1: `requirements.md` §1.11 (FEED-01 through 04)
- Phase 2: `relationships.md` §5 (the visibility-derivation chain)
- Phase 3: `architecture-decisions.md` AD-03, `cross-cutting-concerns.md`
  §4 (domain events table, and the "why FeedModule still calls
  VisibilityPolicy on read" reasoning — this is the single most
  important paragraph for this milestone)
- Phase 4: `schema.prisma` (FeedItem), `feed-fanout-strategy.md` (the
  full trigger table and the backfill rule — N=20)
- Phase 5: `endpoints-reference.md` (Feed section)

## What Must Exist When You're Done

- `FeedModule` with a `GetFeedUseCase` reading from `FeedItem`.
- Domain events actually emitted from the right places:
  `PostCreatedEvent`/`PostDeletedEvent` from `ContentModule`,
  `FollowAcceptedEvent`/`UnfollowedEvent` from `SocialModule`,
  `ProfileVisibilityChangedEvent` from `ProfilesModule`.
- Event handlers in `FeedModule` implementing every row of
  `feed-fanout-strategy.md`'s trigger table — including the two-directions
  of the visibility-change case (PUBLIC→PRIVATE removes rows;
  PRIVATE→PUBLIC does nothing, and you should know why).
- Follow-accept backfill capped at the last 20 posts, using the
  configurable constant from Phase 4.
- `GetFeedUseCase` running every result through `VisibilityPolicy` before
  returning it — not trusting the cache alone.
- Cursor pagination matching Phase 5's shape exactly.

## Suggested Order of Attack

1. Get plain reads working first against manually-inserted `FeedItem`
   rows (skip fan-out entirely at first) — prove pagination and the
   `VisibilityPolicy` safety filter work before any event plumbing exists.
2. Add the `PostCreatedEvent` fan-out next — the simplest trigger.
3. Add `PostDeletedEvent` cleanup.
4. Add the follow-accept backfill — this is where the N=20 cap matters;
   test it against an author with more than 20 posts, not fewer.
5. Add unfollow cleanup, then the two visibility-change cases last —
   they're the least intuitive and benefit from everything else already
   being solid.
6. As a deliberate exercise before calling this done: temporarily comment
   out the `VisibilityPolicy` check inside `GetFeedUseCase`, and try to
   get a private post to leak into a feed it shouldn't be in (e.g. via a
   fan-out bug you introduce on purpose, or a stale cache row). Confirm
   it *can* leak with the check removed, then put the check back and
   confirm it's caught. This is how you actually earn confidence in a
   "fail closed" design instead of just trusting the docs.

## Questions You Should Be Able to Answer

- Name all five triggers in the fan-out table from memory, and what each
  one does to `FeedItem`.
- Why does `PRIVATE → PUBLIC` require no feed change, while
  `PUBLIC → PRIVATE` does?
- If your fan-out logic had a bug that failed to remove a `FeedItem` row
  after an unfollow, what — precisely — stops that from leaking the
  unfollowed author's private post into the feed anyway?
- Why is the backfill capped, and what does a new follower miss out on
  as a result?

## Known Pitfalls

- Making feed reads trust the `FeedItem` cache completely and skip the
  `VisibilityPolicy` re-check "since it's already correct by
  construction" — that's exactly the assumption Phase 3 designed against.
  Fan-out bugs happen; the read-time check is the actual safety net.
- Missing the idempotency angle — event handlers should use `FeedItem`'s
  unique `(ownerId, postId)` constraint (upsert, not plain insert) so a
  duplicated or retried event doesn't crash or duplicate rows.
- Forgetting the backfill cap entirely and just fanning out full history
  on follow-accept — re-check `feed-fanout-strategy.md` §3 for the exact
  constant and why it's capped.

## Definition of Done

- FEED-01 through FEED-04 acceptance criteria pass.
- All five fan-out triggers demonstrated working, including the
  visibility-change asymmetry.
- The "break VisibilityPolicy on purpose, watch it leak, fix it, watch it
  get caught" exercise has actually been done, not just read about.
