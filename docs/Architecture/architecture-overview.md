# Odin-Book — Architecture Overview

**Phase:** 3 — Architecture
**Status:** Approved
**Depends on:** Phase 2 (`domain-model.md`, `entities.md`, `relationships.md`, `invariants.md`, `state-transitions.md`)

---

## 1. Purpose

This document defines *how* the domain model becomes a running system: the
architectural style, the module map, and how modules communicate. Prisma
schema (Phase 5) and concrete API endpoints (Phase 6) are downstream of
these decisions, not part of them.

---

## 2. Architectural Style

**Modular monolith**, built with NestJS.

```
NestJS Application (single deployable)
├── AuthModule
├── UsersModule
├── ProfilesModule
├── SocialModule
├── ContentModule        (Post, Comment, Like, PostImage)
├── FeedModule
├── StorageModule         (Supabase Storage adapter)
└── SharedModule           (cross-cutting: policies, guards, filters, events)
```

Microservices were rejected — see `architecture-decisions.md` (AD-01) for
the reasoning. Every module ships in one process, one deploy, one database
connection pool. Module boundaries are enforced by NestJS's own module
encapsulation (explicit `imports`/`exports`), not by network calls.

---

## 3. Per-Module Internal Architecture

Every module — without exception — follows **Clean Architecture** with four
layers and a strict dependency rule: inner layers never import from outer
layers.

```
   presentation/         (NestJS controllers, DTOs)
        ↓ depends on
   infrastructure/        (Prisma repositories, external adapters)
        ↓ implements
   application/            (use cases, repository PORTS/interfaces)
        ↓ depends on
   domain/                  (entities, business rules — zero framework imports)
```

Full structural detail, folder layout, and a worked example are in
`clean-architecture-guide.md`. This is the single biggest architectural
commitment of this phase — it affects every module equally and is *not*
optional per-module; consistency here is what makes the codebase navigable.

---

## 4. Module Communication

Modules communicate two ways, chosen deliberately per situation:

### a) Direct synchronous calls (request/response path)
Used when Module A needs data from Module B **within the same request** to
fulfill its own use case — e.g., `FeedModule` reading active follows from
`SocialModule` while building a feed response.

```
FeedModule.application.GetFeedUseCase
        │
        ├──► calls SocialModule's exported port (active follows)
        └──► calls ContentModule's exported port (posts by author list)
```

Only a module's `application`-layer use cases and `domain` services are
ever exported for other modules to consume — never repositories or
controllers directly.

### b) Domain events (side-effect / fan-out path)
Used when an action in one module must trigger a **reaction** in another,
but the triggering use case shouldn't need to know or care who's listening.

```
ContentModule.CreatePostUseCase completes
        │
        ↓ emits
   PostCreatedEvent
        │
        ↓ (NestJS EventEmitter, in-process)
FeedModule's event handler
        │
        ↓
   fans out FeedItem rows to active followers
```

Full event list and rationale in `cross-cutting-concerns.md`.

---

## 5. High-Level Diagram

```
                        ┌─────────────────┐
                        │   AuthModule      │
                        └────────┬─────────┘
                                  │ uses
                        ┌────────▼─────────┐
                        │   UsersModule      │
                        └────────┬─────────┘
                                  │ 1:1
                        ┌────────▼─────────┐
                        │  ProfilesModule    │◄──────────┐
                        └────────┬─────────┘            │
                                  │                        │ visibility check
                        ┌────────▼─────────┐            │
                        │  SocialModule      │────────────┤
                        └────────┬─────────┘            │
                                  │ events                  │
                        ┌────────▼─────────┐            │
                        │  ContentModule     │────────────┤
                        │ (Post/Comment/     │            │
                        │  Like/PostImage)   │            │
                        └────────┬─────────┘            │
                                  │ events                  │
                        ┌────────▼─────────┐            │
                        │   FeedModule        │────────────┘
                        └──────────────────┘

                        ┌──────────────────┐
                        │  StorageModule      │  ← used by ContentModule,
                        │ (Supabase adapter)  │     ProfilesModule
                        └──────────────────┘

                        ┌──────────────────┐
                        │  SharedModule        │  ← VisibilityPolicy,
                        │                       │     guards, filters,
                        │                       │     event definitions
                        └──────────────────┘
```

---

## 6. What This Phase Deliberately Does Not Decide

- Exact Prisma schema / table design → Phase 5 (Database)
- Exact endpoint paths, DTOs, status codes → Phase 6 (API Contract)
- JWT vs session mechanics, hashing algorithm choice → Phase 7 (Security)
- Literal repo folder layout for config, `main.ts`, env files → Phase 8
  (Project Structure) — though the per-module internal layout *is* decided
  here (§3, and `clean-architecture-guide.md`)

---

## 7. Documents in This Package

| File | Purpose |
|---|---|
| `architecture-overview.md` | This document |
| `module-boundaries.md` | Responsibility, exports, and dependencies of each module |
| `clean-architecture-guide.md` | The four-layer pattern, folder structure, worked example, DI wiring |
| `cross-cutting-concerns.md` | Guards, interceptors, filters, pipes, domain events, VisibilityPolicy |
| `architecture-decisions.md` | ADR log of decisions made this phase |

---

## 8. Next Phase

**Phase 4 — Database**, translating this architecture and the Phase 2
domain model into the Prisma schema: tables, constraints, cascade rules,
indexes, and the `FeedItem` table needed for the cached feed strategy.
