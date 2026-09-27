# Odin-Book — Repository Layout

**Phase:** 7 — Project Structure
**Status:** Approved
**Scope:** the NestJS backend repository (`odin-book-api`) only — see
`project-structure-decisions.md` PSD-01 for why a frontend repo is out
of scope for this phase.

---

## 1. Root Layout

```
odin-book-api/
├── src/
│   ├── main.ts                 bootstrap: Nest app, global pipes/filters/guards, Helmet, CORS
│   ├── app.module.ts             root module, imports every feature module
│   ├── config/                    env schemas + typed config providers
│   ├── shared/                     cross-cutting: policy, guards, filters, events, password hashing
│   ├── auth/                        AuthModule
│   ├── users/                        UsersModule
│   ├── profiles/                      ProfilesModule
│   ├── social/                         SocialModule
│   ├── content/                          ContentModule (Post/Comment/Like/PostImage)
│   ├── feed/                              FeedModule
│   └── storage/                             StorageModule
├── prisma/
│   ├── schema.prisma             source of truth (Phase 4 + Phase 6 RefreshToken amendment)
│   ├── migrations/
│   └── seed.ts                     demo data + guest account (Phase 4)
├── test/
│   └── *.e2e-spec.ts               one file per module, cross-boundary flows
├── .env.example                     every config key, placeholder values, committed
├── .eslintrc.js
├── .prettierrc
├── nest-cli.json
├── tsconfig.json
├── package.json
└── README.md
```

Every folder directly under `src/` (besides `config/` and `shared/`) is
one of the eight modules defined in Phase 3's `module-boundaries.md` —
there is no `controllers/`, `services/`, or `models/` folder spanning the
whole app. This is feature-based organization, not layer-based, matching
NestJS's idiomatic module system.

---

## 2. Inside a Feature Module

Every module — without exception — follows the four-layer Clean
Architecture shape from Phase 3's `clean-architecture-guide.md`. Using
`content/` (the richest module) as the reference:

```
src/content/
├── domain/
│   ├── entities/
│   │   ├── post.entity.ts
│   │   ├── comment.entity.ts
│   │   ├── like.entity.ts
│   │   └── post-image.entity.ts
│   └── errors/
│       ├── not-post-owner.error.ts
│       ├── not-comment-owner.error.ts
│       └── post-not-found.error.ts
│
├── application/
│   ├── use-cases/
│   │   ├── posts/
│   │   │   ├── create-post.use-case.ts
│   │   │   ├── create-post.use-case.spec.ts
│   │   │   ├── edit-post.use-case.ts
│   │   │   ├── edit-post.use-case.spec.ts
│   │   │   ├── delete-post.use-case.ts
│   │   │   ├── delete-post.use-case.spec.ts
│   │   │   └── get-posts-by-author.use-case.ts
│   │   ├── comments/
│   │   │   ├── create-comment.use-case.ts
│   │   │   └── delete-comment.use-case.ts
│   │   └── likes/
│   │       ├── like-post.use-case.ts
│   │       └── unlike-post.use-case.ts
│   └── ports/
│       ├── post-repository.port.ts
│       ├── comment-repository.port.ts
│       └── like-repository.port.ts
│
├── infrastructure/
│   ├── persistence/
│   │   ├── prisma-post.repository.ts
│   │   ├── prisma-comment.repository.ts
│   │   └── prisma-like.repository.ts
│   └── mappers/
│       ├── post.mapper.ts
│       ├── comment.mapper.ts
│       └── like.mapper.ts
│
├── presentation/
│   ├── controllers/
│   │   ├── posts.controller.ts
│   │   ├── comments.controller.ts
│   │   └── likes.controller.ts
│   └── dto/
│       ├── create-post.dto.ts
│       ├── edit-post.dto.ts
│       ├── create-comment.dto.ts
│       └── post-response.dto.ts
│
└── content.module.ts
```

Thinner modules simply have fewer files per folder — `storage/` has no
`presentation/` layer at all (nothing outside the module ever calls it
over HTTP), `users/` has no `comments`/`likes`-style subfolders since it
has one entity.

---

## 3. `shared/` — Cross-Cutting Concerns

Directly implements Phase 3's `cross-cutting-concerns.md`:

```
src/shared/
├── domain/
│   └── services/
│       ├── visibility-policy.service.ts
│       └── visibility-policy.service.spec.ts
├── guards/
│   ├── auth.guard.ts
│   ├── post-owner.guard.ts
│   └── comment-owner.guard.ts
├── filters/
│   └── domain-exception.filter.ts
├── interceptors/
│   └── logging.interceptor.ts
├── events/
│   ├── post-created.event.ts
│   ├── post-deleted.event.ts
│   ├── follow-accepted.event.ts
│   ├── unfollowed.event.ts
│   └── profile-visibility-changed.event.ts
├── password-hasher/
│   ├── password-hasher.service.ts        (Phase 6 — argon2id)
│   └── password-hasher.service.spec.ts
└── shared.module.ts
```

---

## 4. `config/`

One file per config domain, each exporting a typed, validated config
object consumed via `@nestjs/config`'s `registerAs`:

```
src/config/
├── env.validation.ts        top-level Zod schema, composes all of the below;
│                             app refuses to boot if any key is missing/malformed
├── database.config.ts        DATABASE_URL
├── jwt.config.ts               JWT_SECRET, access/refresh token lifetimes (Phase 6)
├── google-oauth.config.ts       GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, callback URL
├── storage.config.ts             SUPABASE_URL, SUPABASE_KEY (Phase 3, AD-05)
├── cors.config.ts                  FRONTEND_URL (Phase 6)
└── throttler.config.ts              rate-limit windows per route class (Phase 6)
```

This is where Phase 3's deferred "exact `.env` structure is a Project
Structure concern" note gets resolved. `.env.example` mirrors every key
across these files with a placeholder value and is committed; the real
`.env` is gitignored.

---

## 5. `prisma/`

Unchanged in shape from Phase 4, at repo root per Prisma convention (not
nested under `src/`). `schema.prisma` already includes the `RefreshToken`
model added in Phase 6.

---

## 6. Tests

- **Unit tests:** co-located as `*.spec.ts` next to the file under test
  (see `application/use-cases/posts/` above). This is where Phase 3's
  Clean Architecture investment pays off directly — a use case's test
  mocks its port interface and needs no database, no HTTP layer, no
  NestJS TestingModule bootstrap for the core logic.
- **E2E tests:** root-level `test/` folder, one spec per module
  (`content.e2e-spec.ts`, `auth.e2e-spec.ts`, etc.), since these exercise
  real cross-module, cross-layer behavior against a real (test) database.

Full test *strategy* — coverage expectations, fixtures, what gets mocked
vs. exercised for real — is Phase 10 (Testing); this phase only fixes
where the files live.
