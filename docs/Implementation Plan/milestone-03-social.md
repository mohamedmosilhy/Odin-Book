# Milestone 3 — Social (Follow)

**Size:** L
**Depends on:** M2

---

## Objective

The full follow state machine works end to end, and `VisibilityPolicy` —
the single authorization source of truth almost everything downstream
depends on — exists and is correct.

## Docs to Have Open

- Phase 1: `requirements.md` §1.7 (FOLLOW-01 through 07), §1.15 (core
  visibility rules)
- Phase 2: `state-transitions.md` (FollowRelationship state machine —
  study this until you could draw it from memory), `invariants.md`
  (Follow section), `domain-decisions.md` DD-02
- Phase 3: `cross-cutting-concerns.md` §1 (`VisibilityPolicy` — this is
  the most important few paragraphs in the whole design docset so far)
- Phase 4: `schema.prisma` (FollowRelationship)
- Phase 5: `endpoints-reference.md` (Social section)

## What Must Exist When You're Done

- `SocialModule`: `FollowRelationship` entity, use cases for
  follow/unfollow/accept/reject, self-follow prevention, duplicate-
  request prevention.
- `VisibilityPolicy` in `SharedModule`, composing `ProfilesModule`'s
  visibility lookup and `SocialModule`'s active-follower check, exactly
  as specified in `cross-cutting-concerns.md` §1 — this is the first
  piece of code in the whole project that spans two modules by design,
  so take it slowly.
- Full endpoint set from Phase 5: follow/unfollow, incoming requests
  list, accept, reject, followers/following lists.

## Suggested Order of Attack

1. Before any code: on paper, walk through all four transitions in
   `state-transitions.md`'s FollowRelationship diagram with concrete
   example users. What row exists, with what status, after each step?
2. Implement the "follow a public profile" path first in isolation — it
   never touches `PENDING` at all, so it's the simplest slice to get
   right before the private-profile branching complicates things.
3. Add the private-profile `PENDING` path, then accept/reject.
4. Only once the state machine itself is solid, build `VisibilityPolicy`
   — by this point `IsActiveFollowerUseCase` (which it depends on)
   already exists and is tested.

## Questions You Should Be Able to Answer

- Walk me through exactly what row(s) exist in `FollowRelationship`
  after: A follows public B; A follows private C; C accepts A; C rejects
  a different pending request from D.
- Why does rejecting a request delete the row instead of marking it
  `REJECTED`? What would you lose, and what would you gain, either way?
- `VisibilityPolicy.canView()` calls into two other modules' use cases.
  Which two, and why is it `SharedModule`'s job to compose them rather
  than, say, `ContentModule` calling both directly later?

## Known Pitfalls

- Allowing a duplicate `PENDING` request to be created — this needs both
  the DB unique constraint *and* an application-level check that
  produces a clean `409`, not a raw constraint-violation error leaking
  through (FOLLOW-07 explicitly calls this out).
- Forgetting `requesterId != targetId` validation (FOLLOW-06) and only
  catching it by accident via some other constraint.
- Writing `VisibilityPolicy` as a one-off inline check instead of the
  shared, reusable service Phase 3 specifies — every future module that
  needs an authorization decision is supposed to call this, not
  reimplement it.

## Definition of Done

- FOLLOW-01 through FOLLOW-07 acceptance criteria all pass.
- `VisibilityPolicy.canView()` has its own unit tests covering: viewer is
  the author, author is public, author is private + viewer is active
  follower, author is private + viewer is not a follower, author is
  private + viewer has only a pending request (must return false — this
  is the case most likely to be gotten wrong).
