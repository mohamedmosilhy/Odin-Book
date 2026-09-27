# Odin-Book — Phase 8: Implementation Plan

**Status:** Completed / Approved

This package is the roadmap for building Odin-Book yourself. It is
deliberately not a tutorial — it tells you *what* must exist and *which
docs answer your questions*, not how to write the code.

## Contents

```
implementation-plan/
├── mentorship-mode.md                 The operating contract for Phase 9 onward — read this first
├── roadmap-overview.md                 Dependency graph, why this order, how to use the milestone docs
├── milestone-00-bootstrap.md
├── milestone-01-auth-users.md
├── milestone-01b-google-oauth.md
├── milestone-02-profiles.md
├── milestone-03-social.md
├── milestone-04-posts.md
├── milestone-05-comments-likes.md
├── milestone-06-feed.md
├── milestone-07-images.md
├── milestone-08-guest-mode.md
├── milestone-09-hardening.md
├── mvp-definition-of-done.md            The final requirement-by-requirement checklist
└── implementation-plan-decisions.md      ADR log of the 4 decisions made this phase
```

## How to Use This Package

1. **Read `mentorship-mode.md` first.** It governs every interaction
   from here on — no implementation code from me, strict milestone
   gating, how reviews work.
2. **Read `roadmap-overview.md` second** for the big picture and why the
   order is what it is.
3. Work through the milestones **in order** (with M1b and M7 as the only
   flexible exceptions). Each milestone doc tells you which prior-phase
   documents to have open, what must exist, a suggested process (not a
   solution), the questions you should be able to answer, named pitfalls
   specific to this design, and its Definition of Done.
4. Bring each milestone to me when you believe it's done, per the review
   process in `mentorship-mode.md` §4. I check it against that
   milestone's Definition of Done — by asking you to demonstrate and
   explain, not by reading a code dump — and only then do we move on.
5. `mvp-definition-of-done.md` is the final scoreboard — every MUST
   requirement from Phase 1, mapped to the milestone that delivers it.

## Key decisions made this phase

1. **11-milestone sequence**, strictly ordered by real dependency (not
   difficulty) — most notably, Social (and `VisibilityPolicy`) comes
   before Content, because Content can't be built correctly without it.
2. **Strict gating** — no milestone starts before the previous one is
   reviewed and passed.
3. **No implementation code from Claude**, formalized as a standing
   contract, not a one-off instruction.
4. **Two flexible milestones** (Google OAuth, Images) that can be
   reordered slightly since nothing downstream depends on them.

Full rationale for each is in `implementation-plan/implementation-plan-decisions.md`.

## Next

**Phase 9 — Development.** This is where you start building, milestone
by milestone, under the contract in `mentorship-mode.md`. Come back
whenever Milestone 0 is done and ready for review.
