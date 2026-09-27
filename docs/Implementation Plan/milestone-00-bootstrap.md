# Milestone 0 — Project Bootstrap

**Size:** S
**Depends on:** nothing

---

## Objective

A NestJS application that boots, refuses to boot with bad config, and
connects to a real database — with nothing "business" in it yet.

## Docs to Have Open

- Phase 7: `repository-layout.md`, `naming-and-tooling.md`,
  `configuration-and-env.md`
- Phase 4: `schema.prisma`, `migration-and-seed-strategy.md`

## What Must Exist When You're Done

- The folder skeleton from `repository-layout.md` §1 — every module
  folder present (even if each just has an empty `.module.ts` and
  nothing else yet).
- `env.validation.ts` actually validates every variable listed in
  `configuration-and-env.md` §3, and the app **refuses to start** —
  loudly, with a clear error — if a required one is missing or malformed.
- Prisma initialized against `schema.prisma` (including the Phase 6
  `RefreshToken` model), first migration generated and applied against a
  real local Postgres database.
- Seed script exists and runs, even if it only seeds one dummy row for
  now — full seed content comes later, once the entities it seeds
  actually exist.
- ESLint + Prettier configured and passing on an empty/near-empty
  codebase.
- `.env.example` committed with every key from
  `configuration-and-env.md`, real `.env` gitignored.

## Suggested Order of Attack

1. Scaffold the Nest project, then immediately reshape it to match
   `repository-layout.md` — don't build anything inside the modules yet,
   just get the shape right first.
2. Get Prisma pointed at a real database and the schema migrated *before*
   writing any config validation — you want to prove the schema itself
   is valid independently of anything else.
3. Write the env validation schema, then **deliberately break it** —
   delete a required var from your `.env` and confirm the app fails to
   start with a message that actually tells you which var is missing.
   Don't consider this milestone done until you've watched it fail
   correctly, not just watched it succeed.

## Questions You Should Be Able to Answer

- What exactly happens — in your own words — when a required env var is
  missing? Where in the code does that get caught?
- Why does `.env.example` matter if `.env` is gitignored anyway?

## Known Pitfalls

- Skipping the "make it fail on purpose" step. A validation schema you've
  never watched fail is a validation schema you don't actually know
  works.
- Building module folders with real logic already in them "to save time
  later." Resist it — this milestone is scaffolding only.

## Definition of Done

- `npm run start:dev` boots cleanly with a correct `.env`.
- The app throws a clear startup error with an incorrect/incomplete
  `.env` (show this, don't just claim it).
- `npx prisma migrate dev` runs clean against a fresh database.
- Lint passes with zero errors.
