# Odin-Book — Database Decisions

**Phase:** 4 — Database
**Status:** Resolved / Approved

ADR-style log of the decisions made this phase.

---

## DBD-01 — Primary key strategy

**Options considered:** `uuid()`, `cuid()`, auto-increment integer.

**Decision: `cuid()`.**

**Rationale:** Roughly time-ordered, which benefits index locality and,
specifically, `FeedItem` cursor pagination. Auto-increment integers were
not seriously considered — they leak row-count/sequence information and
don't fit a schema designed around string-keyed relations throughout.

---

## DBD-02 — Correction: Post-deletion cascade mechanism

**Issue found:** Phase 2 (`domain-decisions.md`, DD-03) assumed
`ON DELETE CASCADE` would clean up a soft-deleted post's dependents. It
cannot — that FK trigger only fires on an actual `DELETE`, and `Post`
uses `UPDATE ... SET deletedAt`, never `DELETE`.

**Resolution:** `ON DELETE CASCADE` is retained in the schema as a
safety net for any future hard-delete path, but the actual invariant is
enforced by `DeletePostUseCase` explicitly hard-deleting Comment, Like,
and PostImage rows in the same transaction as the soft-delete `UPDATE`,
then emitting `PostDeletedEvent` for `FeedModule` to clean up `FeedItem`
rows. Full detail in `deletion-and-cascades.md`.

**Why this matters enough to log:** this was a genuine correctness gap
between the domain design and its literal database implementation —
exactly the kind of thing the Database phase exists to catch before
implementation begins.

---

## DBD-03 — Feed backfill scope on follow-accept

**Options considered**
- **A. All historical posts.** Complete feed immediately; unbounded
  write cost per follow action.
- **B. Last N posts only.** Bounded cost; new follower doesn't see full
  history in-feed (must visit profile for older posts).
- **C. No backfill.** Simplest; feed only shows posts created after the
  follow — poorest immediate UX.

**Decision: Option B, N = 20 (configurable application constant).**

**Rationale:** Balances immediate feed population against unbounded
fan-out cost on a single follow action. Twenty was chosen as a reasonable
"feels populated" threshold without further tuning input; it's a
constant specifically so it can be adjusted post-launch without a schema
migration. Full mechanics in `feed-fanout-strategy.md`.

---

## DBD-04 — `Like` primary key shape

**Options considered:** composite `(userId, postId)` vs. surrogate `id`
plus a unique constraint on the pair.

**Decision: composite primary key `(userId, postId)`, no surrogate id.**

**Rationale:** Nothing in the domain ever needs to reference an
individual `Like` by its own identity — it's addressed only by the user/post
pair. A composite PK enforces LIKE-03 (no duplicate likes) directly as
the table's identity, rather than as a secondary unique constraint
alongside a meaningless surrogate key.

---

## DBD-05 — No dedicated `GuestSession` table

**Decision:** guest/demo access (GUEST-01/02) is backed by a single
pre-seeded demo `User`/`Profile`, not a schema construct of its own.

**Rationale:** Nothing about the guest experience requires its own
persistence shape — it's an application-layer access-restriction concern
(which guard/permission logic applies), not a data-modeling one. Adding a
table for it would model an authorization concept as if it were a domain
entity, which Phase 2 already flagged as something to avoid.

---

## Summary Table

| ID | Decision | Chosen Option |
|---|---|---|
| DBD-01 | Primary key strategy | `cuid()` |
| DBD-02 | Post-deletion cascade mechanism | App-layer transaction, not DB `ON DELETE CASCADE` |
| DBD-03 | Feed backfill scope | Last 20 posts, configurable constant |
| DBD-04 | Like table key shape | Composite PK `(userId, postId)` |
| DBD-05 | Guest access persistence | No dedicated table — pre-seeded demo account |
