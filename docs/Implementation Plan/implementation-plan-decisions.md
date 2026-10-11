# Odin-Book — Implementation Plan Decisions

**Phase:** 8 — Implementation Plan
**Status:** Resolved / Approved

---

## IPD-01 — Milestone sequencing

**Decision:** Bootstrap → Auth/Users → Google OAuth → Profiles → Social →
Posts → Comments/Likes → Feed → Images → Guest Mode → Hardening.

**Rationale:** Ordered strictly by dependency, not by perceived
difficulty or interest — in particular, `VisibilityPolicy` (born in the
Social milestone) is a hard prerequisite for correctly building Posts,
which is why Social comes before Content despite feeling like a
"secondary" feature. Full reasoning per-edge in `roadmap-overview.md`
§2.

## IPD-02 — Review/gating model

**Options considered**
- **A. Strict gate.** No milestone `N+1` starts until `N` is reviewed and
  passed against its Definition of Done.
- **B. Flexible checkpoints.** Work can proceed out of order; review
  happens whenever brought up.
- **C. Roadmap only.** No structured review at all.

**Decision: Option A.**

**Rationale:** Chosen explicitly by the project owner, prioritizing
learning depth over pace. This is consistent with the entire premise of
this phase — the plan exists to produce understanding, not just working
code, and unreviewed forward progress risks compounding a
misunderstanding across multiple later milestones before it surfaces.

## IPD-03 — No code from Claude during Development

**Decision:** formalized in `mentorship-mode.md` as a standing contract:
no implementation code, including small "illustrative" snippets drawn
from this project's own domain, is provided during Phase 9 onward.
Guidance is limited to pointing at existing design docs, asking
diagnostic questions, and naming which requirement/invariant a review
finding violates.

**Rationale:** Explicitly requested — the stated goal is to learn to
code by building this, not to have it built. Writing this down as a
formal phase deliverable (rather than leaving it as a one-off
instruction in conversation) means it survives across sessions and
isn't accidentally relaxed later.

## IPD-04 — Two "loose" milestones (1b, 7) allowed out of strict order

**Decision:** Google OAuth (M1b) and Images (M7) may be built slightly
out of sequence relative to their listed position, since nothing
downstream depends on them — but both still require their own listed
prerequisites to be complete first.

**Rationale:** Gives a controlled amount of flexibility (a change of
pace is legitimate) without compromising the strict-gate principle where
it actually matters — no other milestone gets this exception, since
every other one is a real, load-bearing dependency for what follows.

---

## Summary Table

| ID | Decision | Chosen Option |
|---|---|---|
| IPD-01 | Milestone order | Strict dependency-driven sequence (11 milestones) |
| IPD-02 | Review/gating model | Strict gate |
| IPD-03 | Code from Claude during Development | None — pointers and questions only |
| IPD-04 | Out-of-order exceptions | M1b and M7 only |
