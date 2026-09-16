# Odin-Book — Architecture Decisions

**Phase:** 3 — Architecture
**Status:** Resolved / Approved

ADR-style log of the decisions made this phase, with options considered
and rationale — so later phases (and future you) don't have to
reverse-engineer *why*.

---

## AD-01 — Architectural style: monolith vs. microservices

**Options considered**
- **A. Modular monolith.** Single deployable, module boundaries enforced
  in-process by NestJS.
- **B. Microservices.** Separate deployables per bounded context, network
  calls between them.

**Decision: Option A.**

**Rationale:** Solo developer, single database, no independent-scaling or
independent-deployment requirement, and no separate teams. Microservices
would add distributed-transaction complexity, network latency, and
deployment overhead with no corresponding benefit at this scale. Treated
as a non-fork rather than a genuine trade-off given the project's actual
constraints.

---

## AD-02 — Content module granularity

**Options considered**
- **A. One `ContentModule`** for Post, Comment, Like, PostImage.
- **B. Three separate modules** — `PostsModule`, `CommentsModule`,
  `LikesModule`.

**Decision: Option A.**

**Rationale:** Post is the aggregate root; Comment and Like both require
checking the *same* visibility policy against the *same* post on nearly
every operation, and Like in particular has negligible standalone business
logic (a uniqueness-constrained toggle). Splitting into three modules would
introduce cross-module DI wiring and dependency management for
tightly-coupled operations that are conceptually one feature area (viewing
and interacting with a post). Internally, the module still separates
Post/Comment/Like into distinct use-case groups and repositories — "one
module" is an organizational boundary, not a lack of internal structure.
See `clean-architecture-guide.md` §2 for the internal layout.

---

## AD-03 — Feed generation strategy

**Options considered**
- **A. Query-time (computed on every request).** Simple; no extra table;
  always consistent with live data; slower as follow-graphs grow.
- **B. Cached/precomputed** (a `FeedItem` table, fanned out on write).
  Fast reads; requires fan-out logic, invalidation on unfollow/privacy
  change, and a background-consistency story.

**Decision: Option B.**

**Rationale:** Chosen deliberately over the simpler default, accepting the
added complexity in exchange for read performance and the opportunity to
demonstrate a fan-out/event-driven pattern. Implemented via domain events
(`PostCreatedEvent`, `FollowAcceptedEvent`, etc. — see
`cross-cutting-concerns.md` §4) rather than synchronous cross-module calls,
to keep `ContentModule` and `SocialModule` from needing direct knowledge of
`FeedModule`.

**Consequence:** `FeedModule` owns a `FeedItem` table (designed in Phase
5), and every mutation that affects feed membership (new post, delete
post, follow accepted, unfollow, visibility change) must correctly emit
its event — a missed event is a correctness bug, not just a performance
one. Mitigated by keeping `VisibilityPolicy` as a mandatory read-time
filter (see `cross-cutting-concerns.md` §4) so cache bugs fail closed
(hide) rather than open (leak).

---

## AD-04 — Architecture depth per module: pragmatic layered vs. Clean Architecture

**Options considered**
- **A. Pragmatic layered** (`Controller → Service → Prisma`). Fast to
  write, fewer files, services coupled to Prisma types directly.
- **B. Full Clean Architecture** (domain/application/infrastructure/
  presentation, ports & adapters, dependency inversion). More files and
  indirection; framework-independent domain layer; use cases testable
  without a database; provider swaps (e.g., storage) isolated to one
  layer.

**Decision: Option B — applied uniformly to every module.**

**Rationale:** Chosen deliberately over the faster/simpler default. The
overhead is accepted project-wide (not mixed per-module) specifically to
keep the codebase consistent and navigable, and because demonstrating
dependency inversion and a framework-independent domain layer has real
portfolio value beyond this project's own runtime needs. Full structural
pattern, worked example, and naming conventions are in
`clean-architecture-guide.md`.

**Consequence:** every module — including small ones like `UsersModule`
— gets the full four-layer treatment, even where the payoff is modest, for
the sake of one consistent mental model across the whole codebase rather
than developers needing to remember which modules are "simple" and which
are "clean."

---

## AD-05 — Image storage provider

**Options considered:** Cloudinary, AWS S3, Supabase Storage, local disk
(deferred).

**Decision: Supabase Storage.**

**Rationale:** Free tier suitable for a personal/portfolio project,
S3-compatible API, straightforward SDK integration. Isolated entirely
behind `StorageModule`'s `IImageStorage` port (per AD-04's Clean
Architecture commitment), so this choice is swappable later without
touching `ProfilesModule` or `ContentModule` business logic.

---

## Summary Table

| ID | Decision | Chosen Option |
|---|---|---|
| AD-01 | Architectural style | Modular monolith |
| AD-02 | Content module granularity | One `ContentModule` |
| AD-03 | Feed generation strategy | Cached/precomputed, event-driven fan-out |
| AD-04 | Per-module architecture depth | Full Clean Architecture, applied uniformly |
| AD-05 | Image storage provider | Supabase Storage |

All five decisions are reflected consistently across
`architecture-overview.md`, `module-boundaries.md`,
`clean-architecture-guide.md`, and `cross-cutting-concerns.md`.
