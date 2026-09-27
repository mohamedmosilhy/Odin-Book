# Odin-Book — Project Structure Decisions

**Phase:** 7 — Project Structure
**Status:** Resolved / Approved

ADR-style log of the decisions made this phase.

---

## PSD-01 — Repo scope: backend-only vs. monorepo

**Options considered**
- **A. Backend-only repo.** This phase documents the NestJS API repo's
  structure only, matching every prior phase's exclusive backend focus.
- **B. Monorepo.** A single repo containing both the API and a frontend
  app (e.g. `apps/api`, `apps/web`), sharing tooling/config at the root.

**Decision: Option A.**

**Rationale:** Phases 3 through 6 — architecture, database, API
contract, security — never once specified a frontend framework, its
state management, or its own structural needs. Phase 1 mentions a
frontend only as a consumer of the API ("the frontend may also redirect
unauthenticated users, but frontend protection is not sufficient") —
never as something these phases are designing. Writing a monorepo layout
now would mean inventing frontend structure decisions that haven't
actually been made anywhere in this project. If a frontend does get
built, it's either its own independently-structured repo, or a
retroactive monorepo decision made explicitly when that work starts —
not assumed here.

---

## PSD-02 — Organization inside `src/`: feature-based vs. layer-based

**Decision:** feature-based — one top-level folder per module from
Phase 3's `module-boundaries.md`, no whole-app `controllers/`/
`services/`/`models/` folders.

**Rationale:** Not a new decision — this is simply confirming on disk
what Phase 3 (AD-01, feature-based modules) and Phase 3's Clean
Architecture commitment (AD-04) already established. Restated here
because Project Structure is where "confirmed in principle" becomes
"actually the folder tree."

---

## PSD-03 — Test file placement

**Options considered**
- **A. Co-located `*.spec.ts`** next to the file under test (NestJS
  default), with e2e specs separate in `test/`.
- **B. Fully separate `tests/` tree** mirroring `src/`, for both unit and
  e2e.

**Decision: Option A.**

**Rationale:** NestJS convention, and directly exercises the payoff of
Phase 3's Clean Architecture investment — a use case's unit test sits
right next to it and needs no database or HTTP bootstrap, since it mocks
the use case's port interface directly. A fully separate mirrored tree
adds navigation overhead without benefit at this project's scale.

---

## PSD-04 — Package manager

**Decision:** npm.

**Rationale:** No monorepo workspace features are needed (per PSD-01),
and this is a single-contributor project — pnpm's disk-efficiency and
yarn workspaces' benefits don't apply here. npm is the lowest-friction
default.

---

## PSD-05 — Environment validation strategy

**Decision:** a single composed Zod schema (`env.validation.ts`) passed
to `ConfigModule.forRoot({ validate })`; the app refuses to boot on any
missing/malformed variable, with per-domain `*.config.ts` files exposing
narrow, typed slices via `registerAs`.

**Rationale:** Directly resolves the note Phase 3's
`cross-cutting-concerns.md` §5 explicitly left open for this phase.
Fail-fast at boot was already the stated intent there; this phase just
specifies the concrete mechanism and file layout. Full variable list in
`configuration-and-env.md`.

---

## Summary Table

| ID | Decision | Chosen Option |
|---|---|---|
| PSD-01 | Repo scope | Backend-only (`odin-book-api`) |
| PSD-02 | `src/` organization | Feature-based, per Phase 3 module map |
| PSD-03 | Test file placement | Co-located `.spec.ts`, separate `test/` for e2e |
| PSD-04 | Package manager | npm |
| PSD-05 | Env validation | Single composed Zod schema, fail-fast at boot |
