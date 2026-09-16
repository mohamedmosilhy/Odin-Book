# Odin-Book — Relationships

**Phase:** 2 — Domain Modeling

This document defines cardinalities between entities and aggregate
boundaries. Aggregate boundaries matter because they determine transactional
consistency — operations within an aggregate are atomic; operations across
aggregates are eventually-consistent-by-convention (application-orchestrated).

---

## 1. Aggregate Boundaries

```
┌─────────────────┐   1:1   ┌─────────────────┐
│      User        │◄───────►│     Profile      │
│  (aggregate)      │         │  (aggregate)      │
└────────┬─────────┘         └──────────────────┘
         │
         │ 1:N
         ↓
┌─────────────────┐
│  ExternalIdentity │   (part of User aggregate — no independent lifecycle)
└──────────────────┘

┌─────────────────┐   1:N   ┌─────────────────┐
│      User        │────────►│      Post         │
│                   │         │  (aggregate)      │
└──────────────────┘         └────────┬─────────┘
                                       │ 1:N (part of aggregate)
                                       ↓
                              ┌─────────────────┐
                              │   PostImage       │
                              └──────────────────┘
```

`Comment` and `Like` **reference** `Post` and `User` by ID but are their own
aggregates — a `Comment` is not loaded/saved as part of the `Post` aggregate.
This matters practically: liking or commenting on a post does not require
loading or locking the entire Post aggregate.

---

## 2. Full Relationship Table

| From | To | Cardinality | Notes |
|---|---|---|---|
| User | Profile | 1 : 1 | Created together at registration; independent aggregates |
| User | ExternalIdentity | 1 : N | One per linked provider; part of User aggregate |
| User | Post | 1 : N | Author relationship |
| User | Comment | 1 : N | Author relationship |
| User | Like | 1 : N | Reactor relationship |
| User | FollowRelationship (as requester) | 1 : N | Outgoing follows/requests |
| User | FollowRelationship (as target) | 1 : N | Incoming follows/requests |
| Post | PostImage | 1 : N | Part of Post aggregate |
| Post | Comment | 1 : N | Referenced, not owned |
| Post | Like | 1 : N | Referenced, not owned |

---

## 3. Social Graph Relationship

`FollowRelationship` is a **many-to-many self-relationship on User**,
mediated through an explicit join entity (rather than a plain join table)
because the relationship carries state (`status`) and its own lifecycle.

```
        requester                    target
   User ───────────► FollowRelationship ───────────► User
```

A single `FollowRelationship` row represents the directional edge
`requester → target`. There is no implicit symmetry — User A following
User B says nothing about whether User B follows User A back. Mutual
follows are simply two independent rows.

---

## 4. Content Ownership Chain

```
User (author)
  │
  ↓
 Post
  │
  ├──► PostImage   (owned — deleted with Post)
  ├──► Comment      (referenced — independently owned by its author)
  └──► Like          (referenced — independently owned by its author)
```

The distinction between "owned" and "referenced" matters for deletion
semantics — see `invariants.md` §Deletion Cascade.

---

## 5. Visibility Dependency Chain

Not a data relationship, but a **derivation** relationship worth making
explicit since it crosses aggregate boundaries:

```
Post.authorId
      │
      ↓
   User
      │
      ↓
   Profile.visibility ──► determines who may view Post
      │
      ↓
FollowRelationship(viewer → author).status ──► ACTIVE required if PRIVATE
```

Any query that returns a `Post` must, in principle, resolve this chain. In
practice this becomes a single authorization service/policy in Phase 3
rather than being re-implemented per query.
