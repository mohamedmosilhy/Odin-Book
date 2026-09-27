# Odin-Book — Phase 4: Database

**Status:** Completed / Approved

This package translates the Phase 2 domain model and Phase 3 architecture
into the actual Prisma schema.

## Contents

```
database/
├── schema.prisma                    The runnable Prisma schema
├── schema-overview.md                Table-by-table annotated walkthrough
├── deletion-and-cascades.md           Correction + full deletion mechanics
├── feed-fanout-strategy.md            FeedItem fan-out triggers + backfill rule
├── migration-and-seed-strategy.md     Prisma Migrate workflow + seed data plan
└── database-decisions.md              ADR log of the 5 decisions made this phase
```

## Key decisions made this phase

1. **`cuid()`** primary keys throughout.
2. **Correction:** the Phase 2 assumption that `ON DELETE CASCADE` cleans
   up a soft-deleted post's dependents was wrong — soft-delete never
   triggers that FK. Fixed: `DeletePostUseCase` explicitly hard-deletes
   Comments/Likes/PostImages in the same transaction; `ON DELETE CASCADE`
   stays in the schema only as a safety net for a future real hard-delete
   path.
3. **Feed backfill on follow-accept** is capped at the **last 20 posts**
   (configurable constant), not full history.
4. **`Like`** uses a composite primary key `(userId, postId)` — no
   surrogate id.
5. **No `GuestSession` table** — guest access is a pre-seeded demo
   account, restricted at the application layer.

Full rationale for each is in `database/database-decisions.md`.

## Next

**Phase 5 — API Contract**: concrete REST endpoints, request/response
DTOs, status codes, pagination shape (cursor-based, per FEED-04), and
error response format — the first phase where this schema becomes
something a frontend can actually talk to.
