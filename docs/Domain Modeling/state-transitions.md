# Odin-Book — State Transitions

**Phase:** 2 — Domain Modeling

State machines for the two entities in the domain that have a real
lifecycle: `FollowRelationship` and `Post`. Every other entity is
effectively stateless (exists → hard-deleted).

---

## FollowRelationship

### States
`PENDING`, `ACTIVE` — plus the implicit **NONE** state, meaning no row
exists at all (this is not a stored status; it's the absence of a row).

### Transition Diagram

```
                 target.visibility = PUBLIC
        NONE ─────────────────────────────────► ACTIVE
          │
          │ target.visibility = PRIVATE
          ↓
       PENDING
          │
          ├── target accepts ──────────────────► ACTIVE
          │
          └── target rejects ──────────────────► NONE (row deleted)

       ACTIVE
          │
          └── requester unfollows ─────────────► NONE (row deleted)
```

### Transition Table

| From | Event | Guard | To | Effect |
|---|---|---|---|---|
| NONE | `follow(A, B)` | `B.visibility == PUBLIC` | ACTIVE | Row created directly as ACTIVE |
| NONE | `follow(A, B)` | `B.visibility == PRIVATE` | PENDING | Row created as PENDING |
| PENDING | `accept()` | caller is `B` (target) | ACTIVE | Row updated |
| PENDING | `reject()` | caller is `B` (target) | NONE | Row **deleted** |
| ACTIVE | `unfollow()` | caller is `A` (requester) | NONE | Row **deleted** |

### Notes

- There is no `A → A` self-transition — self-follow is rejected before any
  state transition is attempted (see `invariants.md`).
- A rejected or unfollowed relationship leaves **no trace**. A subsequent
  `follow(A, B)` behaves exactly as if no prior relationship ever existed.
- Only `ACTIVE` grants content access. `PENDING` never does.

---

## Post

### States
`ACTIVE` (visible), `DELETED` (soft-deleted, `deletedAt` set) — implicit;
not a stored enum, just the presence/absence of `deletedAt`.

### Transition Diagram

```
        create()
NONE ───────────────► ACTIVE
                          │
                          │ edit() — content changes,
                          │ state unchanged
                          ↓
                       ACTIVE
                          │
                          │ delete() by author
                          ↓
                       DELETED
                    (deletedAt set;
                     row persists but
                     excluded from all
                     normal reads)
```

### Transition Table

| From | Event | Guard | To | Effect |
|---|---|---|---|---|
| NONE | `create(author, content)` | caller is authenticated | ACTIVE | Row created |
| ACTIVE | `edit(content)` | caller is author | ACTIVE | `content`, `updatedAt` changed |
| ACTIVE | `delete()` | caller is author | DELETED | `deletedAt` set; cascades hard-delete to Comments, Likes, PostImages |

### Notes

- There is no `DELETED → ACTIVE` transition in the MVP (no restore
  capability). This is a conscious simplification — see
  `domain-decisions.md`.
- `Comment` and `Like` have no state machine of their own: they exist, and
  are hard-deleted directly by their own author (`Comment`) or the reacting
  user (`Like`). There is no intermediate state.
