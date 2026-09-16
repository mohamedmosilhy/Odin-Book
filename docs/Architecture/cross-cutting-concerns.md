# Odin-Book — Cross-Cutting Concerns

**Phase:** 3 — Architecture

Concerns that don't belong to any single module: authorization, request
pipeline mechanics, and inter-module domain events.

---

## 1. VisibilityPolicy — the one authorization source of truth

Lives in `SharedModule/domain/services/visibility-policy.service.ts`. Pure
business logic, no I/O of its own — it composes exported use cases from
`ProfilesModule` and `SocialModule`.

```
class VisibilityPolicy {
  constructor(
    private getProfileVisibility: GetProfileVisibilityUseCase,
    private isActiveFollower: IsActiveFollowerUseCase,
  ) {}

  async canView(viewerId: string, authorId: string): Promise<boolean> {
    if (viewerId === authorId) return true;

    const visibility = await this.getProfileVisibility.execute(authorId);
    if (visibility === 'PUBLIC') return true;

    return this.isActiveFollower.execute(viewerId, authorId);
  }
}
```

**Every module that needs an authorization decision calls this — nobody
reimplements the PUBLIC/PRIVATE/ACTIVE-follower check locally.** This is
the direct implementation of the visibility-dependency chain documented in
Phase 2's `relationships.md` §5.

Consumers: `ContentModule` (post/comment/like access), `FeedModule` (final
read-time safety filter — see §4 below).

---

## 2. Guards

| Guard | Applied to | Purpose |
|---|---|---|
| `AuthGuard` | Every route except registration/login/OAuth | Enforces AUTH-05 — no protected route reachable unauthenticated |
| `PostOwnerGuard` | Edit/delete post | Enforces POST-03/04 ownership invariant at the routing layer, before the use case even runs |
| `CommentOwnerGuard` | Delete comment | Same pattern for COMMENT-04 |

Guards are a **first line of defense**, not the only one — use cases and
domain entities (`Post.canBeEditedBy()`) re-check ownership themselves, so
a guard misconfiguration can't silently become a security hole.

---

## 3. Interceptors, Filters, Pipes

- **Validation pipe** — global `ValidationPipe` with `class-validator`
  DTOs; nothing malformed reaches a controller method body, let alone a
  use case.
- **Exception filter** — global filter maps domain errors
  (`NotPostOwnerError`, `PostNotFoundError`, etc.) to consistent HTTP
  status codes and a uniform error response shape. Domain errors carry no
  HTTP knowledge themselves — the filter is what translates domain
  language into transport language, keeping that translation in exactly
  one place.
- **Logging interceptor** — request/response logging, kept generic and
  applied globally.

---

## 4. Domain Events

In-process, via NestJS's built-in `EventEmitter2` — no external message
queue at this scale.

| Event | Emitted by | Consumed by | Effect |
|---|---|---|---|
| `PostCreatedEvent` | ContentModule | FeedModule | Fan-out: create `FeedItem` rows for each active follower |
| `PostDeletedEvent` | ContentModule | FeedModule | Remove corresponding `FeedItem` rows |
| `FollowAcceptedEvent` | SocialModule | FeedModule | Backfill: add the newly-followed user's existing posts into the follower's feed |
| `UnfollowedEvent` | SocialModule | FeedModule | Remove that author's `FeedItem` rows from the unfollower's feed |
| `ProfileVisibilityChangedEvent` | ProfilesModule | FeedModule | PRIVATE→PUBLIC: no feed change needed (non-followers still don't follow). PUBLIC→PRIVATE: remove that author's posts from feeds of non-active-followers |

Event classes themselves are defined once in `SharedModule` and imported
by both the emitting and listening side — this avoids either module
depending on the other's internal types.

### Why FeedModule still calls VisibilityPolicy on read, despite being cached

The `FeedItem` cache is a **performance optimization**, not the
authorization boundary. `FeedModule`'s `GetFeedUseCase` still runs each
result through `VisibilityPolicy.canView()` before returning it. This
guards against any fan-out/invalidation bug (a missed event, a race
condition) ever *leaking* private content — worst case, a caching bug
causes a post to be incorrectly *hidden* (stale cache), never incorrectly
*shown*. This asymmetry — fail closed, not open — is a deliberate
security choice given AUTH's requirement that authorization is always
server-enforced.

---

## 5. Configuration & Environment (high-level, detail deferred to Phase 8)

Config values (database URL, Supabase keys, JWT secret, Google OAuth
credentials) are validated at boot via a schema (`class-validator` or
`zod`) — the application should fail to start rather than run with missing
or malformed config. Exact `.env` structure is a Project Structure (Phase
8) concern.
