# Odin-Book — Domain Decisions

**Phase:** 2 — Domain Modeling
**Status:** Resolved / Approved

This document records the open questions raised during domain modeling, the
options considered, and the final decision with rationale — a lightweight
decision log (ADR-style) so future phases don't have to reconstruct *why*
the model looks the way it does.

---

## DD-01 — Should Profile be part of the User aggregate, or its own aggregate?

**Options considered**
- **A. Part of User aggregate.** Simpler; Profile has no independent
  lifecycle (1:1, created atomically with User, no scenario where it's
  updated without User-adjacent context).
- **B. Independent aggregate.** Cleaner conceptual separation between
  authentication identity and public social identity; more room to grow
  (multiple profile types, independent versioning) later.

**Initial recommendation:** Option A — the 1:1, atomically-created,
no-independent-lifecycle nature of Profile made the extra aggregate
boundary feel like unearned complexity for an MVP.

**Decision: Option B — Independent aggregate.**

**Rationale:** Chosen deliberately over the more conservative default. The
separation between "who you are" (User: email, credentials) and "what you
present" (Profile: username, bio, visibility) is treated as a first-class
domain distinction rather than an implementation detail, which keeps the
door open for Profile to evolve its own rules later without touching
authentication concerns.

**Consequence:** `User` and `Profile` are created together transactionally
at registration but are addressed, loaded, and modified independently
thereafter. `username` uniqueness is a `Profile`-aggregate concern, not a
`User`-aggregate concern.

---

## DD-02 — Should rejected/unfollowed FollowRelationships be retained as history?

**Options considered**
- **A. Delete the row.** A rejection or unfollow removes the relationship
  entirely; a subsequent follow attempt starts fresh.
- **B. Retain with a `REJECTED`/`UNFOLLOWED` status.** Preserves history,
  enables future features like re-request cooldowns or "previously
  declined" indicators.

**Decision: Option A — Delete the row. (Matches initial recommendation.)**

**Rationale:** Nothing in the Phase 1 requirements calls for relationship
history, cooldowns, or audit trails on the social graph. Persisting
rejected/historical states is complexity with no current payoff. If a
future requirement needs this, it's cheap to add as an append-only event
log layered on top, rather than baked into the live relationship's status
field now.

**Consequence:** `FollowRelationship.status` only ever takes `PENDING` or
`ACTIVE`. Uniqueness of `(requesterId, targetId)` only needs to hold while
a row exists at all — there's never ambiguity about "which" row is active,
since there's at most one.

---

## DD-03 — Post/Comment deletion: soft-delete or hard-delete?

**Options considered**
- **A. Hard-delete.** Row removed entirely. Simple; no `deletedAt` filtering
  anywhere; no cascade planning needed since dependents can cascade at the
  database level via `ON DELETE CASCADE`.
- **B. Soft-delete.** Row persists with `deletedAt` set; excluded from
  reads via a filter. Enables moderation review and undo; avoids relying
  on foreign-key cascades for visibility.

**Initial recommendation:** Soft-delete for `Post`, hard-delete for
`Comment`.

**Decision: Mixed — Option B for `Post`, Option A for `Comment` and `Like`.**

**Rationale:**
- **Post → soft-delete.** Content moderation/abuse review benefits from
  "the post existed, here's what it said" even after removal, and
  soft-delete gives undo/recovery essentially for free. This was judged
  worth the small added complexity of a `deletedAt` filter on every Post
  read path.
- **Comment → hard-delete.** No moderation/recovery need was identified at
  comment granularity for the MVP; keeping comments simple avoids doubling
  up on soft-delete filtering logic across two entities for one that
  doesn't clearly need it.
- **Like → hard-delete.** Likes are a pure toggle with no content or
  moderation value to retain.

**Consequence — the deletion cascade is asymmetric and worth stating
explicitly:** deleting a `Post` *soft*-deletes the Post itself, but still
*hard*-deletes its Comments, Likes, and PostImages. There is no world in
which a comment or like on an invisible (soft-deleted) post needs to
survive independently, so those dependents are fully removed even though
their parent Post row is retained. This is implemented as an
`ON DELETE CASCADE` from Comment/Like/PostImage to Post at the database
level in Phase 3, triggered by the same operation that sets `deletedAt` —
not by the eventual (nonexistent, in this MVP) hard-deletion of the Post
row itself.

---

## DD-04 — Authentication identity linking strategy

**Options considered**
- **A. One auth method per user, chosen at registration, immutable.**
  Simpler; but forces users into local-only or Google-only permanently,
  and creates duplicate-account risk if someone registers locally and
  later tries Google with the same email.
- **B. Multiple auth methods per user, linked by email match.** A user may
  hold both a password credential and a Google `ExternalIdentity`
  simultaneously; a Google login is linked to an existing local account
  when emails match, rather than creating a duplicate.

**Decision: Option B.**

**Rationale:** This is the standard pattern for a reason — duplicate
accounts from the same person logging in via two different methods is a
real support/UX problem, and the cost of supporting it (nullable
`passwordHash`, an email-match lookup during Google callback handling) is
low relative to the pain it avoids. This was treated as a low-ambiguity
decision rather than a genuine either/or.

**Consequence:** `User.passwordHash` is nullable. A user must have *at
least one* authentication method (password or ≥1 `ExternalIdentity`) — see
`invariants.md`. Google OAuth callback handling must check for an existing
`User` by email before creating a new one.

---

## Summary Table

| ID | Decision | Chosen Option | Deviated from initial recommendation? |
|---|---|---|---|
| DD-01 | Profile aggregate boundary | Independent aggregate | Yes |
| DD-02 | Follow request rejection history | Delete, no history | No |
| DD-03 | Post/Comment deletion strategy | Soft-delete Post, hard-delete Comment/Like | No (matches recommendation) |
| DD-04 | Auth identity linking | Link by email match, multiple methods allowed | No |

All four decisions are now reflected consistently across `entities.md`,
`relationships.md`, `invariants.md`, and `state-transitions.md`.
