# Odin-Book — Module Boundaries

**Phase:** 3 — Architecture

Defines each module's single responsibility, what it exports for other
modules to consume, and what it depends on. A module may only depend on
what another module explicitly exports — never reach into another module's
`infrastructure` or `domain` internals directly.

---

## AuthModule

**Responsibility:** registration, login (email+password), Google OAuth
flow, logout, session/token issuance.

**Depends on:** `UsersModule` (create/find user), `SharedModule` (password
hashing utility, if kept generic).

**Exports:** nothing consumed by other feature modules — Auth is an entry
point, not a service other modules call into.

**Notable use cases:** `RegisterUserUseCase`, `LoginUseCase`,
`GoogleOAuthCallbackUseCase`, `LogoutUseCase`.

---

## UsersModule

**Responsibility:** the `User` aggregate — identity, credentials,
`ExternalIdentity` linkage. Owns email uniqueness.

**Depends on:** nothing (foundational module).

**Exports:** `FindUserByIdUseCase`, `FindUserByEmailUseCase` — read-only
lookups other modules (Auth, Profiles, Social, Content) need to resolve a
`userId` to basic identity info.

---

## ProfilesModule

**Responsibility:** the `Profile` aggregate — username, display name, bio,
profile picture, visibility setting. Owns username uniqueness.

**Depends on:** `UsersModule` (to validate the user exists at profile
creation), `StorageModule` (profile picture upload).

**Exports:** `GetProfileUseCase`, `GetProfileVisibilityUseCase` — the
latter is what `SharedModule`'s `VisibilityPolicy` and `ContentModule`
call to resolve whether an author's profile is `PUBLIC`/`PRIVATE`.

---

## SocialModule

**Responsibility:** the `FollowRelationship` entity and its full state
machine — follow, request, accept, reject, unfollow.

**Depends on:** `UsersModule`, `ProfilesModule` (to check target
visibility when deciding PENDING vs ACTIVE on follow creation).

**Exports:** `GetActiveFollowersUseCase`, `IsActiveFollowerUseCase` — the
second is the other half of what `VisibilityPolicy` needs (alongside
Profile visibility) to authorize access to private content.

**Emits:** `FollowAcceptedEvent`, `UnfollowedEvent` (consumed by
`FeedModule` for cache invalidation/fan-out).

---

## ContentModule

**Responsibility:** `Post`, `Comment`, `Like`, `PostImage` — the full
content aggregate and its dependents, as one module (see AD-02 for why
this wasn't split three ways).

**Depends on:** `UsersModule` (author identity), `StorageModule` (post
image upload), `SharedModule` (`VisibilityPolicy` — used before allowing
comment/like creation, and before returning a post to a viewer).

**Exports:** `GetPostsByAuthorUseCase` (used by `FeedModule` and
`ProfilesModule`'s profile-view use case).

**Emits:** `PostCreatedEvent`, `PostDeletedEvent` (consumed by
`FeedModule`).

**Internal note:** `Comment` and `Like` are separate use-case groups and
separate Prisma repositories *within* this module — "one module" does not
mean "one undifferentiated blob." See `clean-architecture-guide.md`.

---

## FeedModule

**Responsibility:** builds and maintains each user's feed. Given the
cached/precomputed strategy (AD-03), this module owns the `FeedItem` table
and all fan-out/invalidation logic — it does not compute the feed live on
every request.

**Depends on:** `SocialModule` (exported use cases, at fan-out time),
`ContentModule` (exported use cases, at fan-out time), `SharedModule`
(`VisibilityPolicy`, as a final safety filter on read — see
`cross-cutting-concerns.md` for why we don't rely on the cache alone).

**Listens for:** `PostCreatedEvent`, `PostDeletedEvent`,
`FollowAcceptedEvent`, `UnfollowedEvent`, `ProfileVisibilityChangedEvent`.

**Exports:** `GetFeedUseCase` — consumed only by the presentation layer
(controller), not by other feature modules.

---

## StorageModule

**Responsibility:** wraps Supabase Storage behind a provider-agnostic
port. Nothing outside this module ever imports the Supabase SDK.

**Depends on:** nothing feature-related — purely infrastructure.

**Exports:** `IImageStorage` port (`upload()`, `delete()`), consumed by
`ProfilesModule` and `ContentModule`'s `infrastructure` layers.

---

## SharedModule

**Responsibility:** the one deliberate exception to "modules own their own
domain logic" — houses genuinely cross-cutting concerns that don't belong
to any single feature:

- `VisibilityPolicy` domain service (`canView(user, post)`) — composes
  `ProfilesModule` + `SocialModule` exports; see `relationships.md` §5 in
  the Phase 2 package for the derivation chain this implements.
- Global guards (`AuthGuard`, ownership guards)
- Global exception filters
- Domain event class definitions (`PostCreatedEvent`, etc.) — defined
  once, imported by both the emitting and listening modules.

**Depends on:** `ProfilesModule`, `SocialModule` (exported use cases only).

**Exports:** `VisibilityPolicy`, guards, filters, event classes.

---

## Dependency Graph (module-level, no cycles)

```
UsersModule  ←── ProfilesModule ←── SocialModule
    ↑                  ↑                 ↑
    │                  └────────┬────────┘
    │                            │
    │                    SharedModule (VisibilityPolicy)
    │                            ↑
    └──────────────────  ContentModule ──► StorageModule
                                  ↑
                            FeedModule
                                  ↑
                            AuthModule (independent entry point, → UsersModule)
```

No module ever imports "upward" against this graph — this is what keeps
the dependency graph acyclic and each module independently testable.
