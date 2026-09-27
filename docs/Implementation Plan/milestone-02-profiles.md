# Milestone 2 — Profiles

**Size:** M
**Depends on:** M1

---

## Objective

Every registered user has exactly one `Profile`, created atomically at
registration, independently readable/editable, with a working
public/private visibility flag.

## Docs to Have Open

- Phase 1: `requirements.md` §1.5–1.6 (USER-01 through 07)
- Phase 2: `domain-decisions.md` DD-01 (Profile as its own aggregate —
  re-read this; it's the reason this milestone is not trivial),
  `entities.md` (Profile)
- Phase 3: `module-boundaries.md` (ProfilesModule)
- Phase 4: `schema.prisma` (Profile)
- Phase 5: `endpoints-reference.md` (Users/Profiles section) — pay
  attention to the exact response shape, including `followStatus` and
  `posts` (you'll stub both until M3/M4 exist)

## What Must Exist When You're Done

- `ProfilesModule` fully shaped per Clean Architecture: `Profile` entity,
  repository port + Prisma adapter, `GetProfileUseCase`,
  `EditProfileUseCase`.
- `Profile` created **in the same transaction** as `User` at
  registration — this is a cross-module concern; figure out which module
  actually owns triggering that, given Phase 3's rule that modules only
  call each other's exported use cases.
- `GET /profiles/:username`, `PATCH /profiles/me` matching Phase 5's
  contract exactly, including field names and optionality.
- `followStatus` stubbed to `"NONE"` and `posts` stubbed to `[]` for now
  — both get filled in by later milestones, but the response shape
  should already match the final contract.

## Suggested Order of Attack

1. Before writing anything: figure out and write down, in your own
   words, *where* the "create Profile alongside User" orchestration
   should live. Does it belong in `AuthModule`'s `RegisterUseCase`
   calling into `ProfilesModule`? Does `ProfilesModule` listen for
   something? Check `module-boundaries.md` for what each module is
   actually allowed to depend on before deciding.
2. Build `GetProfileUseCase` and `EditProfileUseCase` against the port,
   same fake-repository-first testing approach as M1.
3. Wire the atomic creation last, once you're confident the rest of
   Profile's own CRUD works in isolation.

## Questions You Should Be Able to Answer

- Why is `Profile` a separate aggregate from `User` in this design, and
  what would break (or just become awkward) if you'd merged them?
- What happens if `Profile` creation fails after `User` creation already
  succeeded? Is that possible in your implementation? Should it be?
- Why does `username` uniqueness live on `Profile`, not `User`?

## Known Pitfalls

- Letting `AuthModule` reach directly into `ProfilesModule`'s repository
  instead of its exported use case — re-check Phase 3's rule that
  cross-module calls only ever go through exported application-layer
  use cases, never repositories.
- Forgetting the atomicity requirement and ending up with orphaned
  `User` rows that have no `Profile` if something fails partway.

## Definition of Done

- USER-01 through USER-05 acceptance criteria pass.
- Registering a new user always produces exactly one `Profile`row —
  demonstrate this isn't a race by registering several accounts in a row.
- `PATCH /profiles/me` rejects attempts to edit fields not owned by the
  caller implicitly (there's no `:username` in the edit route — confirm
  you understand why that's not accidental).
