# Odin-Book — Migration & Seed Strategy

**Phase:** 4 — Database
**Status:** Approved

---

## 1. Migrations

Standard Prisma Migrate workflow, no deviation:

- **Local development:** `npx prisma migrate dev --name <description>` —
  generates a timestamped migration file under `prisma/migrations/` and
  applies it to the dev database.
- **CI/CD & production:** `npx prisma migrate deploy` — applies pending
  migrations without generating new ones or prompting; safe for
  non-interactive pipelines.
- Migration files are committed to version control. `schema.prisma` is
  the source of truth; migrations are the generated history of how the
  database got there.

## 2. Seed Script

`prisma/seed.ts`, run via `npx prisma db seed`. Populates:

- A handful of demo `User` + `Profile` rows (mix of `PUBLIC` and
  `PRIVATE` visibility, so reviewers/testers can exercise both paths)
- A few `FollowRelationship` rows in both `PENDING` and `ACTIVE` states
- Several `Post` rows per demo user, with some `Comment` and `Like` rows
- **One dedicated demo/guest account** — this is the actual backing data
  for GUEST-01 (Phase 1). The guest experience is: the frontend logs
  into this pre-seeded account automatically; permissions are restricted
  at the guard layer (Phase 7, Security), not by anything schema-level.

The seed script is idempotent (safe to re-run — upserts by known IDs or
emails) so it can also serve as a reset tool during development.

## 3. Environment Separation

- `DATABASE_URL` supplied via environment variable (Phase 3,
  `cross-cutting-concerns.md` §5 — validated at boot).
- Local dev, CI, and production point at separate databases; no shared
  state between them. Exact hosting/provisioning is a Phase 12
  (Deployment) concern — this phase only establishes that the schema and
  migration tooling are environment-agnostic.

## 4. What's Deferred to Later Phases

- Connection pooling configuration → Phase 12 (Deployment)
- Backup/retention policy → Phase 12 (Deployment)
- Any data-retention purge job for old soft-deleted posts (mentioned as a
  hypothetical in `deletion-and-cascades.md`) → not part of the MVP scope
  at all; noted only as a reason `ON DELETE CASCADE` is kept in the schema
