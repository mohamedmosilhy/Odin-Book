# Odin-Book — Naming Conventions & Tooling

**Phase:** 7 — Project Structure
**Status:** Approved

---

## 1. File Naming

`kebab-case.ts`, with a type suffix identifying the file's role — this
was established in Phase 3's `clean-architecture-guide.md` §5 and holds
across the whole repo, not just inside `content/`:

| Layer/role | Suffix | Example |
|---|---|---|
| Entity | `.entity.ts` | `post.entity.ts` |
| Use case | `.use-case.ts` | `create-post.use-case.ts` |
| Port (interface) | `.port.ts` | `post-repository.port.ts` |
| Repository impl. | `.repository.ts` | `prisma-post.repository.ts` |
| Mapper | `.mapper.ts` | `post.mapper.ts` |
| DTO | `.dto.ts` | `create-post.dto.ts` |
| Domain error | `.error.ts` | `not-post-owner.error.ts` |
| Guard | `.guard.ts` | `post-owner.guard.ts` |
| Event | `.event.ts` | `post-created.event.ts` |
| Controller | `.controller.ts` | `posts.controller.ts` |
| Module | `.module.ts` | `content.module.ts` |
| Config | `.config.ts` | `jwt.config.ts` |
| Unit test | `.spec.ts` | `create-post.use-case.spec.ts` |
| E2E test | `.e2e-spec.ts` | `content.e2e-spec.ts` |

## 2. Class & Symbol Naming

| Item | Convention | Example |
|---|---|---|
| Class | `PascalCase`, named after its role | `CreatePostUseCase`, `PrismaPostRepository` |
| Interface (port) | `PascalCase` + `Port` suffix | `PostRepositoryPort` |
| DI token for a port | `SCREAMING_SNAKE_CASE` symbol | `POST_REPOSITORY` |
| Domain error class | `PascalCase` + `Error` suffix | `NotPostOwnerError` |
| Event class | `PascalCase` + `Event` suffix | `PostCreatedEvent` |

## 3. Environment Variables

`SCREAMING_SNAKE_CASE`, grouped by the `config/*.config.ts` file that
owns them (see `repository-layout.md` §4). Every variable referenced
anywhere in the codebase must appear in `.env.example` with a placeholder
— an env var used in code but absent from `.env.example` is treated as a
bug, not an oversight to catch later.

## 4. Git Branches & Commits

- Branches: `feature/<module>-<short-description>` (e.g.
  `feature/content-post-crud`), `fix/<short-description>`.
- Commit messages: conventional, imperative mood ("Add post repository
  port", not "Added" or "Adding").

## 5. Path Aliases

`tsconfig.json` `paths`, one alias per top-level `src/` module, so
cross-module imports (permitted only via a module's exported use cases,
per Phase 3's module-boundary rules) read cleanly rather than as long
relative chains:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@auth/*": ["src/auth/*"],
      "@users/*": ["src/users/*"],
      "@profiles/*": ["src/profiles/*"],
      "@social/*": ["src/social/*"],
      "@content/*": ["src/content/*"],
      "@feed/*": ["src/feed/*"],
      "@storage/*": ["src/storage/*"]
    }
  }
}
```

## 6. Tooling Baseline

- **Package manager:** npm. No workspace/monorepo features are needed at
  this project's scale (one contributor, backend-only repo per PSD-01),
  so there's no reason to reach for pnpm or yarn workspaces.
- **Linting/formatting:** ESLint (NestJS's default recommended config) +
  Prettier, run as a pre-commit check.
- **`nest-cli.json`:** default single-project mode, not Nest's built-in
  monorepo mode — consistent with the backend-only-repo decision.
- **TypeScript:** `strict: true` — given the emphasis on domain entities
  and ports as plain, well-typed contracts (Phase 3), loose typing would
  undercut the whole point of that architecture.
