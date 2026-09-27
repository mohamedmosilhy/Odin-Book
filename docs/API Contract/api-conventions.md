# Odin-Book — API Conventions

**Phase:** 5 — API Contract
**Status:** Approved
**Depends on:** Phase 3 (architecture), Phase 4 (schema)

---

## 1. Base Path & Versioning

All routes are prefixed `/api/v1`. Versioned from the start — costs nothing
now, avoids a breaking migration later if the contract ever needs a
non-backward-compatible change.

## 2. Casing & Data Types

- JSON bodies use **camelCase**, matching Prisma field names directly —
  no translation layer between DTO and domain entity naming.
- Dates are **ISO 8601** strings (`"2026-09-26T14:00:00.000Z"`).
- IDs are opaque strings (`cuid()` values) — clients must never assume
  format or ordering from an `id` itself; use `createdAt` for ordering.

## 3. Response Shape

**Single resource** — returned bare, no envelope:
```json
{ "id": "clx...", "content": "Hello Odin-Book", "createdAt": "..." }
```

**List (paginated)** — wrapped with pagination metadata:
```json
{
  "items": [ /* resources */ ],
  "pageInfo": { "nextCursor": "eyJjcmVhdGVkQXQiOi4uLn0=", "hasMore": true }
}
```

**Error** — uniform shape on every failure, at every status code:
```json
{
  "error": {
    "code": "POST_NOT_FOUND",
    "message": "Post not found.",
    "details": null
  }
}
```
`code` is a stable, machine-readable string. It maps 1:1 from the domain
errors defined in Phase 3's Clean Architecture layer
(`NotPostOwnerError` → `NOT_POST_OWNER`, etc.) via the global exception
filter — the one place domain language becomes transport language.
`details` is populated only for validation failures (400), holding
field-level messages; `null` otherwise.

## 4. Pagination

Cursor-based throughout (feed, comments, followers/following, discovery),
per FEED-04. The cursor is an opaque, base64-encoded representation of
`{ createdAt, id }` — clients pass it back verbatim via `?cursor=`, never
decode or construct it themselves. `?limit=` is optional, server-clamped
to a sane max (e.g. 50) regardless of what's requested.

## 5. Status Codes

| Code | Meaning |
|---|---|
| 200 | Successful GET / PATCH |
| 201 | Successful POST creating a resource |
| 204 | Successful DELETE / logout — no body |
| 400 | Validation failure |
| 401 | Not authenticated (missing/expired/invalid access token) |
| 403 | Authenticated, but not authorized by **ownership** (editing/deleting someone else's post or comment) |
| 404 | Resource doesn't exist — **or** the viewer isn't authorized to know it exists. A private post/comment the viewer can't see returns 404, not 403, to avoid confirming its existence. (A private *profile* is still visible at 200 — see §6 — since the account's existence isn't itself sensitive, only its content.) |
| 409 | Conflict — e.g. a duplicate follow request race, surfaced cleanly instead of as a raw constraint violation |

## 6. Resource Identification

Public-facing URLs identify people by **`username`**, never internal
`id` — consistent with Phase 2's decision that username is the public
identity. A private profile is fetchable at `GET /profiles/:username`
and returns the profile shell (username, displayName, profilePicture,
bio, visibility) at 200 even for a non-follower — only `posts` is
omitted/empty for an unauthorized viewer. Internal action targets (a
specific follow request, a specific comment) are addressed by their own
`id`, since those aren't things anyone looks up by a human-readable
handle.

## 7. Authentication Transport

Every protected endpoint requires `Authorization: Bearer <accessToken>`.
Full mechanics — token issuance, refresh, OAuth redirect handling — are
in `auth-flows.md`.
