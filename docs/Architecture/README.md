# Odin-Book — Phase 3: Architecture

**Status:** Completed / Approved

This package defines how the Phase 2 domain model becomes a running
system: architectural style, module map, internal layering, and
cross-cutting concerns.

## Contents

```
architecture/
├── architecture-overview.md      Style, module map, communication patterns
├── module-boundaries.md           Responsibility/exports/dependencies per module
├── clean-architecture-guide.md    Four-layer pattern, folder layout, worked example
├── cross-cutting-concerns.md      VisibilityPolicy, guards, filters, domain events
└── architecture-decisions.md      ADR log of the 5 decisions made this phase
```

## Key decisions made this phase

1. **Modular monolith** — one NestJS deployable, feature modules:
   Auth, Users, Profiles, Social, Content, Feed, Storage, Shared.
2. **One `ContentModule`** for Post + Comment + Like + PostImage, rather
   than three separate modules.
3. **Cached/precomputed feed** — a `FeedItem` table, fanned out via domain
   events, with `VisibilityPolicy` still enforced as a mandatory read-time
   safety filter.
4. **Full Clean Architecture** in every module — domain / application /
   infrastructure / presentation layers with dependency inversion via
   ports and adapters, applied uniformly project-wide.
5. **Supabase Storage** for images, isolated behind a swappable port.

Full rationale for each is in `architecture/architecture-decisions.md`.

## Next

**Phase 4 — Database**: translate this architecture and the Phase 2 domain
model into the Prisma schema — tables, constraints, cascade rules,
indexes, and the `FeedItem` table the cached feed strategy depends on.
