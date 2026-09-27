# Odin-Book — Roadmap Overview

**Phase:** 8 — Implementation Plan
**Status:** Approved

---

## 1. Dependency Graph

```
M0  Bootstrap
 │
 ↓
M1  Auth + Users (local)
 │
 ├──→ M1b  Google OAuth
 │
 ↓
M2  Profiles
 │
 ↓
M3  Social (Follow)          ← VisibilityPolicy is born here
 │
 ↓
M4  Content: Posts
 │
 ↓
M5  Content: Comments & Likes
 │
 ↓
M6  Feed
 │
 ├──→ M7  Images
 │
 ↓
M8  Guest / Demo Mode
 │
 ↓
M9  Hardening Pass
 │
 ↓
MVP Definition of Done
```

`M1b` and `M7` are side-branches — they depend on what's to their left
but nothing depends on *them*, so they can be picked up slightly out of
strict sequence if you want a change of pace, with one exception: `M8`
(Guest Mode) needs the whole app, so it must come after everything,
including `M7`.

## 2. Why This Order, Not Some Other Order

- **Auth before everything**: nothing else has an identity to attach to
  without it.
- **Profiles before Social**: `FollowRelationship`'s PENDING/ACTIVE
  branch depends on knowing the target's `Profile.visibility`
  (Phase 1, FOLLOW-01/02) — Social literally cannot be built correctly
  without Profiles existing first.
- **Social before Content**: `VisibilityPolicy` (Phase 3,
  `cross-cutting-concerns.md` §1) composes Profile visibility *and*
  follow status. Posts can't correctly enforce POST-02 until that policy
  exists — building Posts first would mean building it twice.
- **Comments/Likes after Posts, not alongside**: both gate on
  `VisibilityPolicy.canView()` against a *post* that has to already exist
  and behave correctly, including its own ownership/deletion rules.
- **Feed after Content**: fan-out (Phase 4,
  `feed-fanout-strategy.md`) reacts to `PostCreatedEvent`/
  `PostDeletedEvent`, which only exist once Posts emits them, and to
  `FollowAcceptedEvent`/`UnfollowedEvent`, which only exist once Social
  emits them.
- **Guest Mode last**: it's a restricted *lens* over the entire app
  (Phase 4, DBD-05) — there's nothing to restrict access to until
  everything it restricts access to already works.
- **Hardening last**: rate limiting, CORS, the global exception filter —
  these are cross-cutting by nature (Phase 3), so applying them before
  there's a whole surface to apply them across means re-testing them
  after every subsequent milestone anyway.

## 3. How to Use the Per-Milestone Docs

Each milestone doc (`milestone-XX-name.md`) has the same shape:

1. **Objective** — the one-sentence capability that exists once this is
   done.
2. **Depends On** — which milestone(s) must already be passed.
3. **Docs to have open** — the exact prior-phase files you'll need,
   re-read before you start, not just skimmed once weeks ago.
4. **What must exist when you're done** — behavior, described from the
   outside (what a request does, what state results), never code
   structure.
5. **Suggested order of attack** — a process, not a solution: which
   layer to write first and why, when to write your first test, when to
   touch Prisma. This is about *how* to build it well, not *what* to
   build.
6. **Questions you should be able to answer** — if you can't answer
   these when we review, the milestone isn't actually done yet, even if
   the happy path works.
7. **Known pitfalls** — named traps specific to this design, including
   ones already caught during earlier phases (like the soft-delete
   cascade mistake from Phase 4).
8. **Definition of Done** — mapped to Phase 1's requirement/acceptance-
   criteria IDs. This is what gets checked at the strict-gate review.

## 4. Pacing

No calendar estimates are given here deliberately — your pace, your
schedule. Rough relative sizing is noted per milestone (S/M/L) just so
you know which ones are naturally bigger swings, not as a deadline.
