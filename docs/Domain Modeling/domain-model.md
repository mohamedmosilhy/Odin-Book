# Odin-Book — Domain Model

**Phase:** 2 — Domain Modeling
**Status:** Approved
**Depends on:** Phase 1 (`requirements.md`, `use-cases.md`, `acceptance-criteria.md`)

---

## 1. Purpose

This document defines the business/domain model of Odin-Book: the entities that
exist, how they relate to one another, and the rules that govern them —
independent of database schema, ORM, or API design.

> Domain model ≠ database schema.
> The Prisma schema (Phase 3+) is derived from this model, not the other way around.

---

## 2. Domain Vocabulary

### Identity & Users
- **User** — application identity (authentication + account root)
- **Profile** — public/social identity of a user (own aggregate)
- **ExternalIdentity** — a linked external auth provider identity (Google)

### Social Graph
- **FollowRelationship** — the connection (or pending request) between two users

### Content
- **Post** — user-authored content
- **PostImage** — an image attached to a post
- **Comment** — a reply attached to a post
- **Like** — a user's reaction to a post

### Deliberately excluded from the domain model
Technical/infrastructure concerns that are *not* domain entities:
- Session / RefreshToken (authentication mechanics, not a business concept)
- GuestSession (application-level concern)
- Notification (out of scope for MVP)

---

## 3. High-Level Structure

```
                         ┌──────────────┐
                         │     User     │
                         └──────┬───────┘
                                │
               ┌────────────────┼────────────────┐
               │                │                │
               ↓                ↓                ↓
            Profile           Post          ExternalIdentity
         (own aggregate)       │
                     ┌──────────┼──────────┐
                     │          │          │
                     ↓          ↓          ↓
                  Comment      Like     PostImage
```

Social graph:

```
FollowRelationship
┌───────────────┐
│ requester      │
│ target         │
│ status         │
└───────────────┘

   User A ── follows ──→ User B
```

---

## 4. Aggregates

Odin-Book has **three** aggregate roots:

| Aggregate | Root Entity | Contains |
|---|---|---|
| User | `User` | `User` only (identity + auth) |
| Profile | `Profile` | `Profile` only (social/public identity) |
| Post | `Post` | `Post`, `PostImage` (Comments/Likes reference Post but are their own aggregates — see `relationships.md`) |

`Profile` was deliberately split out from `User` as its **own aggregate** rather
than being treated as User attributes. See `domain-decisions.md` for the
reasoning and trade-offs of this choice.

---

## 5. Core Domain Rules (Summary)

These are elaborated fully in `invariants.md` — summarized here for orientation:

1. A user's **Profile visibility** (`PUBLIC` / `PRIVATE`) governs access to
   their posts — posts do not carry their own visibility flag.
2. A **FollowRelationship** exists only while `PENDING` or `ACTIVE` — there is
   no persisted rejected/unfollowed state; the row is deleted instead.
3. **Post** deletion is a soft delete (`deletedAt`); **Comment** and **Like**
   deletion are hard deletes.
4. Deleting a Post cascades to hard-delete its Comments, Likes, and
   PostImages, regardless of the soft-delete on the Post itself.
5. A user may hold both a local credential and a Google `ExternalIdentity`
   simultaneously.

---

## 6. Feed as a Derived View

The feed is not a stored entity — it's a query composed from the social graph
and visibility rules:

```
                    User A
                       │
            ┌──────────┴──────────┐
            ↓                     ↓
       Own posts            Active follows
                                  │
                         ┌────────┼────────┐
                         ↓        ↓        ↓
                        B         C        D
                         │        │        │
                         ↓        ↓        ↓
                       Posts    Posts    Posts
                         └────────┼────────┘
                                  ↓
                         Visibility Rules
                                  ↓
                              Feed(A)
```

---

## 7. Documents in This Package

| File | Purpose |
|---|---|
| `domain-model.md` | This document — overview and orientation |
| `entities.md` | Detailed field-level definition of every entity |
| `relationships.md` | Cardinalities and aggregate boundaries between entities |
| `invariants.md` | Full list of business rules that must always hold |
| `state-transitions.md` | State machines for FollowRelationship and Post |
| `domain-decisions.md` | Record of the open questions resolved in this phase, with rationale |

---

## 8. Next Phase

**Phase 3 — Architecture**, where this domain model is translated into
NestJS module boundaries, service layer responsibilities, and the Prisma
schema.
