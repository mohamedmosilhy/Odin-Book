# Milestone 3 — Implementation Review

Date: 2026-11-11. Implementation and automated verification complete; user review pending.

## What changed

- Profile responses now contain real ACTIVE follower/following counts and the viewer-to-target relationship status (`NONE`, `PENDING`, `ACTIVE`). Anonymous viewers receive `NONE`; private profile shells remain accessible without exposing graph membership.
- Profile reads use optional authentication. Missing credentials allow anonymous reads; supplied malformed or invalid credentials produce 401.
- `GetProfileSocialSummaryUseCase` exposes social reads to Profiles without exposing Prisma or requiring Profiles to import Shared.
- Social graph lists and incoming requests use ascending `(createdAt, id)` boundaries. Pagination continues if the previous page's relationship row is removed. Equal timestamps use the ID as a tie breaker.
- Cursor validation and repository decoding share one decoder. It accepts canonical ISO timestamps produced by the server and rejects malformed encoding, JSON, fields, and dates with 400.
- Pagination defaults to 20, clamps valid positive integers to 50, and rejects invalid or repeated limit values.
- Ownership checks run before state checks. Unauthorized request management returns 403; invalid transitions by the owner return 409. Accept and reject both return 204 without a body.

## Module responsibilities

The implementation refines the original module graph to avoid cycles when Social itself needs visibility authorization:

```text
InfrastructureModule → no feature modules
UsersModule → InfrastructureModule
AuthModule → UsersModule + InfrastructureModule
SocialGraphModule → InfrastructureModule
ProfilesModule → AuthModule + InfrastructureModule + SocialGraphModule
SharedModule → ProfilesModule + SocialGraphModule
SocialModule → AuthModule + ProfilesModule + SharedModule + SocialGraphModule + InfrastructureModule
```

`SocialGraphModule` owns the repository and exported graph lookup/summary use cases. `SocialModule` owns HTTP controllers and authorization-aware request use cases. `SharedModule` owns the composed `VisibilityPolicy`. Modules import exported capabilities; Profiles never imports Shared or SocialModule.

## Acceptance evidence

| Requirement | Verification |
|---|---|
| Public follow becomes ACTIVE | PostgreSQL HTTP lifecycle test, use-case tests |
| Private follow becomes PENDING | PostgreSQL HTTP lifecycle test; pending excluded from counts and graph access |
| Accept request | Only target may accept; status/counts/access update; invalid repeat returns 409 |
| Reject request | Row deleted; requester can request again; former request ID returns 404 |
| Cancel / unfollow | Rows removed; unfollow revokes private graph access |
| Self-follow | HTTP 400 and domain/use-case tests |
| Duplicate prevention | Sequential and concurrent HTTP requests produce one row and a clean 409 |
| Incoming requests | Authenticated target sees only their requests; ownership violations return 403 |
| Followers / following | Anonymous public access, owner access, private non-follower/pending denial, active-follower access |
| Pagination | Defaults, clamping, malformed inputs; three real-database list tests with equal timestamps and deleted cursor rows |
| Profile summary | Real directional counts and viewer-relative status; pending excluded; anonymous NONE |
| VisibilityPolicy | All five original branches plus anonymous public/private branches tested |

Verification results:

- `npm test`: 297 tests passed; 3 existing skipped test files.
- `npm run test:e2e`: 6 tests passed (existing Auth/Profile HTTP suite with persistence doubles).
- `npm run test:integration`: 10 tests passed against a temporary PostgreSQL database using real repositories, guards, JWT verification, controllers, and use cases.
- `npm run build`, `npm run lint`, and `npx tsc --noEmit --incremental false`: passed.

## Reproduce database verification

From `odin-book-api`, create a dedicated disposable PostgreSQL database named `odin_book_test*`. This suite deletes users and cascaded data in that database before each test and after the suite; it rejects missing URLs and other database names. Do not reuse your application database.

```sh
DATABASE_URL='postgresql://USER@localhost:5432/odin_book_test_m3' npx prisma migrate deploy --config prisma7.config.ts
E2E_DATABASE_URL='postgresql://USER@localhost:5432/odin_book_test_m3' npm run test:integration
```

The verification run used an isolated PostgreSQL cluster on port 55439 under `/tmp/odin-book-m3-postgres`, not the configured application database. The cluster was stopped afterward.

## Review order

1. `GetProfileSocialSummaryUseCase`, `GetProfileByUsernameUseCase`, and `ProfileController` for profile response changes.
2. `SocialGraphModule` and `ProfilesModule` for dependency injection.
3. `follow-cursor.ts` and the repository's list methods for validation and pagination.
4. Entity ownership checks and exception mappings for HTTP errors.
5. `test/social.integration-spec.ts` for observable lifecycle and authorization behavior.

Profile posts remain empty until the Content milestone. Feed event consumers/backfill belong to the Feed milestone. Passing this implementation review does not substitute for implementing those later milestones.
