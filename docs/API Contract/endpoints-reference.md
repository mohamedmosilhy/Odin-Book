# Odin-Book — Endpoints Reference

**Phase:** 5 — API Contract
**Status:** Approved

All paths relative to `/api/v1`. 🔒 = requires `Authorization: Bearer`.
Requirement IDs reference Phase 1's `requirements.md`.

---

## Auth

| Method | Path | Req | Notes |
|---|---|---|---|
| POST | `/auth/register` | AUTH-01 | See `auth-flows.md` §2 |
| POST | `/auth/login` | AUTH-02 | See `auth-flows.md` §2 |
| GET | `/auth/google` | AUTH-03 | Redirects to Google |
| GET | `/auth/google/callback` | AUTH-03 | See `auth-flows.md` §3 |
| POST | `/auth/refresh` | — | See `auth-flows.md` §4 |
| POST 🔒 | `/auth/logout` | AUTH-04 | See `auth-flows.md` §5 |

---

## Users / Profiles

### GET 🔒 `/users/me`
USER-01 (self). Own identity — the only endpoint that returns `email`.
```json
{ "id": "clx...", "email": "me@example.com", "createdAt": "..." }
```

### GET `/profiles/:username`
USER-01. Visibility-aware. Auth optional — an unauthenticated visitor
can view a public profile shell (not its posts, per AUTH-05).
```json
{
  "username": "jane",
  "displayName": "Jane Doe",
  "bio": "...",
  "profilePicture": "https://...",
  "visibility": "PRIVATE",
  "followerCount": 128,
  "followingCount": 54,
  "followStatus": "NONE",
  "posts": []
}
```
`followStatus` is `NONE | PENDING | ACTIVE`, computed relative to the
requesting viewer (omitted/`null` if unauthenticated). `posts` is empty
when the viewer isn't authorized to see them; populated (first page,
same shape as `/profiles/:username/posts`) when they are.

### GET 🔒 `/profiles?search=&cursor=&limit=`
USER-06/07. `search` is optional (SHOULD — matches username/displayName
substring).

### PATCH 🔒 `/profiles/me`
USER-02/03.
```json
// Request (all fields optional)
{ "displayName": "...", "bio": "...", "visibility": "PRIVATE" }
```

### POST 🔒 `/profiles/me/picture`
IMAGE-01. `multipart/form-data`, field name `file`. Returns the updated
profile.

---

## Social

### POST 🔒 `/profiles/:username/follow`
FOLLOW-01/02/06/07.
```json
201 Created
{ "status": "ACTIVE" }   // or "PENDING" for a private target
```
`409` if a relationship already exists in either direction context that
conflicts (duplicate request); `400` if `:username` is the caller
(self-follow, FOLLOW-06).

### DELETE 🔒 `/profiles/:username/follow`
FOLLOW-05. `204` on success (also used to cancel an outgoing `PENDING`
request — same action, same endpoint, since both just remove the row
per Phase 2 DD-02).

### GET 🔒 `/social/requests/incoming?cursor=&limit=`
FOLLOW-03/04 (listing side). Pending requests targeting the caller.
```json
{
  "items": [
    { "requestId": "clx...", "requester": { "username": "bob", "displayName": "Bob", "profilePicture": "..." }, "createdAt": "..." }
  ],
  "pageInfo": { "nextCursor": null, "hasMore": false }
}
```

### POST 🔒 `/social/requests/:requestId/accept`
FOLLOW-03. `403` if the caller isn't the request's target.

### POST 🔒 `/social/requests/:requestId/reject`
FOLLOW-04. Same ownership check; `204` on success (row deleted, DD-02).

### GET `/profiles/:username/followers?cursor=&limit=`
### GET `/profiles/:username/following?cursor=&limit=`
Public if the profile is `PUBLIC`; `404` if `PRIVATE` and the viewer
isn't an active follower (consistent with §6 in `api-conventions.md` —
list membership of a private account's social graph is treated as
protected content, not just the posts).

---

## Content

### POST 🔒 `/posts`
POST-01.
```json
{ "content": "Hello Odin-Book" }
```
`201`, returns the created post (shape below).

### GET `/posts/:postId`
POST-02/05. `404` if not visible to the viewer (deleted, or private and
not an active follower).
```json
{
  "id": "clx...",
  "content": "...",
  "author": { "username": "jane", "displayName": "Jane Doe", "profilePicture": "..." },
  "createdAt": "...",
  "updatedAt": "...",
  "commentCount": 4,
  "likeCount": 12,
  "likedByMe": true,
  "images": [ { "url": "...", "position": 0 } ]
}
```

### PATCH 🔒 `/posts/:postId`
POST-03. `403` if not the author.
```json
{ "content": "Updated text" }
```

### DELETE 🔒 `/posts/:postId`
POST-04. `403` if not the author. `204` — soft delete per Phase 4.

### GET `/profiles/:username/posts?cursor=&limit=`
Author's posts, visibility-filtered same as `/profiles/:username`.

### POST 🔒 `/posts/:postId/images`
IMAGE-02. `multipart/form-data`, field `file`. `403` if not the post's
author. Returns the updated post.

### POST 🔒 `/posts/:postId/comments`
COMMENT-01/02. `404` if the post isn't visible to the caller
(comment-visibility follows post-visibility, COMMENT-03/Phase 2).
```json
{ "content": "Nice post!" }
```

### GET `/posts/:postId/comments?cursor=&limit=`
COMMENT-03. Same visibility gate as viewing the post itself.

### DELETE 🔒 `/comments/:commentId`
COMMENT-04. `403` if not the comment's author.

### POST 🔒 `/posts/:postId/likes`
LIKE-01. `404` if post not visible; `409` if already liked (though the
`(userId, postId)` unique constraint makes this rare in practice —
LIKE-03).

### DELETE 🔒 `/posts/:postId/likes`
LIKE-02. `204` regardless of whether a like existed (idempotent unlike).

---

## Feed

### GET 🔒 `/feed?cursor=&limit=`
FEED-01/02/03/04.
```json
{
  "items": [ /* same post shape as GET /posts/:postId */ ],
  "pageInfo": { "nextCursor": "...", "hasMore": true }
}
```
Backed by `FeedItem` (Phase 4), filtered through `VisibilityPolicy` as a
mandatory read-time safety check (Phase 3, `cross-cutting-concerns.md`
§4) — never trusts the cache alone.
