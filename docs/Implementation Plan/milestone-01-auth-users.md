# Milestone 1 — Auth + Users (Local)

**Size:** L
**Depends on:** M0

---

## Objective

A visitor can register and log in with email/password, receives a
working access + refresh token pair, and a protected route correctly
rejects requests without a valid token.

## Docs to Have Open

- Phase 1: `requirements.md` §1.4 (AUTH-01, 02, 04, 05)
- Phase 2: `entities.md` (User)
- Phase 3: `clean-architecture-guide.md` (the four-layer pattern — this
  is your first real use of it), `module-boundaries.md` (UsersModule,
  AuthModule)
- Phase 4: `schema.prisma` (User, RefreshToken)
- Phase 5: `auth-flows.md` §2 & §4–6, `endpoints-reference.md` (Auth
  section), `dto-reference.md` (RegisterDto, LoginDto)
- Phase 6: `password-hashing.md`, `jwt-and-tokens.md`,
  `refresh-token-persistence.md` (all of it — this is the trickiest
  logic in the whole milestone)

## What Must Exist When You're Done

- `UsersModule`: `User` domain entity, a repository port + Prisma
  adapter, at minimum a "find by email" and "find by id" use case.
- `AuthModule`: register, login, refresh, logout use cases; a
  `PasswordHasher` service in `SharedModule` using argon2id; JWT
  issuance matching Phase 6's claims/lifetimes exactly; the
  `RefreshToken` rotation-and-reuse-detection flow from
  `refresh-token-persistence.md` §3–4, actually implemented, not
  approximated.
- `AuthGuard` in `SharedModule`, applied to at least one dummy protected
  route so you can prove it rejects unauthenticated requests.
- Global `ValidationPipe` wired up and validating `RegisterDto`/
  `LoginDto` per `dto-reference.md`.
- Global exception filter mapping at minimum: invalid credentials,
  duplicate email, and validation failures to the exact error shape in
  `api-conventions.md` §3.

## Suggested Order of Attack

1. Write the `User` domain entity first, with zero framework imports —
   what methods or invariants belong on it, if any, per `entities.md`?
2. Write the repository port (interface) before writing any Prisma code.
3. Write `RegisterUseCase` against the port, and a unit test for it using
   an in-memory fake repository — get that test green *before* writing
   the real Prisma adapter. This is the entire point of Clean
   Architecture's dependency inversion; skipping this step skips the
   lesson.
4. Only then write `PrismaUserRepository` and wire the DI token.
5. Do the same use-case-first, fake-then-real sequence for login.
6. Refresh-token rotation is the hardest part here — before writing any
   code, trace the state machine in `refresh-token-persistence.md` §3–4
   on paper: what row exists after register? After one refresh? After a
   *second* refresh using the now-stale first token? Don't start coding
   this until you can answer that from memory.
7. Wire the `AuthGuard` last, once there's a real token to check it
   against.

## Questions You Should Be Able to Answer

- Why is the access token never persisted anywhere server-side, while
  the refresh token is?
- Walk through, step by step, what happens in your database if someone
  steals a refresh token and uses it *after* the legitimate user has
  already rotated it once. What table rows change, and why does that
  response make sense?
- Where, precisely, does password verification happen — which layer? Why
  not in the controller?
- What does `RegisterUseCase`'s unit test mock, and why does it not need
  a database to run?

## Known Pitfalls

- Storing the raw refresh token instead of its hash — re-read
  `refresh-token-persistence.md` §2 on *why* before you write the
  column.
- Putting bcrypt/argon2 calls directly in a controller or in
  `AuthModule`'s use case instead of the shared `PasswordHasher` service
  — this breaks the "one source of truth" principle from Phase 3.
- Forgetting that login must fail identically (same status, same
  generic message) whether the email doesn't exist or the password is
  wrong (AUTH-02) — test both cases explicitly, not just one.
- Building the JWT payload with more claims than Phase 6 specifies
  (`sub`, `iat`, `exp` only) "just in case." Don't — re-read
  `jwt-and-tokens.md` §2 for why that's deliberate.

## Definition of Done

- AUTH-01, AUTH-02, AUTH-04, AUTH-05 acceptance criteria (Phase 1,
  `acceptance-criteria.md`) all demonstrably pass.
- A request to a protected dummy route with no token returns 401; with a
  valid token, succeeds.
- Refresh rotation demonstrated live: show me the `RefreshToken` table
  before and after a refresh call, and explain the reuse-detection case
  (you don't have to have manually triggered theft, but you must be able
  to explain exactly what would happen if you did — and I may ask you to
  actually try it).
