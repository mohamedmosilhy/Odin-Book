# Odin-Book — DTO Reference

**Phase:** 5 — API Contract
**Status:** Approved

Validation rules for the request DTOs that carry real constraints.
Enforced via a global `ValidationPipe` (Phase 3) — invalid input never
reaches a controller method body.

---

## RegisterDto
```
email:    string, required, valid email format, max 255
password: string, required, min 8 chars, at least 1 letter + 1 number
```
Password policy is intentionally modest for MVP scope (AUTH-01 requires
*a* policy, not a specific one) — revisit in Phase 7 if stricter rules
are warranted (e.g. breach-list checking, complexity scoring).

## LoginDto
```
email:    string, required, valid email format
password: string, required
```
No format validation on password beyond presence — invalid format on
login should fail the same generic way as a wrong password (AUTH-02),
not leak policy details.

## CreatePostDto
```
content: string, required, min 1 char (non-empty, trimmed), max 5000
```

## EditPostDto
```
content: string, required, min 1 char (non-empty, trimmed), max 5000
```

## CreateCommentDto
```
content: string, required, min 1 char (non-empty, trimmed), max 1000
```
Matches COMMENT-02's "valid non-empty content."

## EditProfileDto
```
displayName: string, optional, min 1, max 50
bio:         string, optional, max 300, nullable (clears bio if null)
visibility:  enum, optional, one of PUBLIC | PRIVATE
```
All fields optional — a `PATCH` may update any subset.

## SearchProfilesQueryDto
```
search: string, optional, max 100
cursor: string, optional, opaque
limit:  integer, optional, 1–50, default 20
```

## PaginationQueryDto (shared shape — comments, followers, following, feed)
```
cursor: string, optional, opaque
limit:  integer, optional, 1–50, default 20
```

## Image upload (profile picture, post image)
```
Content-Type: multipart/form-data
field "file": required
  - allowed types: image/jpeg, image/png, image/webp
  - max size: 5 MB
```
Enforced at the controller/pipe level before the file ever reaches
`StorageModule`'s Supabase adapter — rejecting an oversized or
wrong-type file shouldn't cost a round trip to external storage.
