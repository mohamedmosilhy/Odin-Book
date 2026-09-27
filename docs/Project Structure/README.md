# Odin-Book — Phase 7: Project Structure

**Status:** Completed / Approved

This package translates every prior phase's decisions into the actual
repo layout — where things live on disk, naming conventions, and the
config/env validation mechanism.

## Contents

```
project-structure/
├── repository-layout.md              Full folder tree: root, per-module, shared/, config/, prisma/, tests
├── naming-and-tooling.md              File/class/env naming conventions, path aliases, tooling baseline
├── configuration-and-env.md            Full env variable list, .env.example, fail-fast validation
└── project-structure-decisions.md       ADR log of the 5 decisions made this phase
```

## Key decisions made this phase

1. **Backend-only repo** (`odin-book-api`) — this phase covers the
   NestJS API's structure only. No frontend framework or monorepo layout
   has been specified anywhere in this project, so none is invented
   here.
2. **Feature-based `src/` organization** — one folder per Phase 3 module,
   each internally following the Clean Architecture four-layer shape.
3. **Co-located unit tests** (`*.spec.ts` next to source), separate
   `test/` folder for e2e specs.
4. **npm** as package manager — no workspace features needed at this
   scale.
5. **Fail-fast environment validation** — a single composed Zod schema;
   the app refuses to boot on any missing or malformed config, resolving
   the note Phase 3 left open for this phase.

Full rationale for each is in `project-structure/project-structure-decisions.md`.

## Next

**Phase 8 — Implementation Plan**: ordered build milestones with
dependencies (Auth+Users → Profiles+Social → Content → Feed → Images →
Guest mode), each with a concrete definition of done, so development in
Phase 9 has a sequence to follow rather than building everything at once.
