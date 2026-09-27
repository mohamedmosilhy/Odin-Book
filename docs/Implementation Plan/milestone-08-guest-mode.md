# Milestone 8 — Guest / Demo Mode

**Size:** S/M
**Depends on:** every prior milestone

---

## Objective

A visitor can enter a working demo experience without registering, and
that demo account genuinely cannot damage the application beyond its
intended sandbox.

## Docs to Have Open

- Phase 1: `requirements.md` §1.12 (GUEST-01, GUEST-02 — notice how
  little detail Phase 1 gives here; that's deliberate, and it's now your
  job to fill in the specifics)
- Phase 4: `database-decisions.md` DBD-05 (no dedicated table — a
  pre-seeded account), `migration-and-seed-strategy.md` §2

## What Must Exist When You're Done

- A pre-seeded demo `User` + `Profile` (with some existing posts/
  follows/etc. from your seed script, so the demo doesn't look empty).
- A "continue as guest" entry point that logs into this account —
  decide yourself whether that's a real login-flow shortcut or a
  distinct endpoint; either is defensible, but you should be able to say
  why you picked one.
- A concrete, written list — your own mini-decision-record — of exactly
  which mutations the guest account is blocked from, and the
  guard/check that enforces each one. GUEST-02 only says "restricted" and
  "should not be able to compromise or modify the application beyond the
  intended demo experience" — Phase 4 deferred the specifics to exactly
  this moment. Nobody has decided this yet. You are deciding it now.

## Suggested Order of Attack

1. Get plain login-as-guest working first, with **no** restrictions yet
   — prove the demo account can do everything a normal account can.
2. Write your restriction list on paper before writing a single guard.
   Think about what a public demo actually needs to prevent: can a guest
   change their own password (there isn't one)? Delete the seed data
   other visitors rely on for the demo to look populated? Follow/unfollow
   in ways that would corrupt the seeded state for the next visitor?
3. Implement the restrictions as an explicit guard/check, not scattered
   ad hoc conditions across use cases — consistent with how every other
   authorization concern in this project has one clear home.

## Questions You Should Be Able to Answer

- What's on your restriction list, and why did you draw the line there
  and not somewhere stricter or looser?
- If two people are using the guest demo at the same time, can one see
  the effects of the other's actions? Is that a problem for this
  project, or an acceptable demo quirk?

## Known Pitfalls

- Treating "restricted" as vague enough to skip entirely, or bolting a
  single `if (user.isGuest)` check into one random controller instead of
  a real, consistent guard.
- Forgetting that the guest account is shared by every visitor — actions
  it takes affect what the *next* visitor sees, unless you've decided
  (and documented) otherwise.

## Definition of Done

- GUEST-01 and GUEST-02 acceptance criteria pass.
- Your written restriction list exists and matches what the code
  actually enforces — I will ask you to justify at least one item on it.
