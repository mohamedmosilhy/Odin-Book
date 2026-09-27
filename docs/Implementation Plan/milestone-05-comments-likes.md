# Milestone 5 — Content: Comments & Likes

**Size:** M
**Depends on:** M4

---

## Objective

Comments and likes both correctly gate on post visibility, likes are
provably impossible to duplicate even under a race, and deleting a post
now genuinely takes its comments/likes/images down with it.

## Docs to Have Open

- Phase 1: `requirements.md` §1.9–1.10 (COMMENT-01 through 04, LIKE-01
  through 03)
- Phase 2: `entities.md` (Comment, Like), `invariants.md` (Comment, Like
  sections)
- Phase 4: `schema.prisma` (Comment, Like — note Like's composite primary
  key), `deletion-and-cascades.md` §3 (the cleanup you left a slot for in
  M4 — now fill it in)
- Phase 5: `endpoints-reference.md` (Content: Comments/Likes section)

## What Must Exist When You're Done

- `CreateCommentUseCase`, `DeleteCommentUseCase` — both checking
  `VisibilityPolicy.canView()` against the parent post before proceeding
  (comment creation), and ownership for deletion (COMMENT-04).
- `LikePostUseCase`, `UnlikePostUseCase` — same visibility gate on like;
  unlike is idempotent (Phase 5 spec: 204 regardless of prior state).
- `DeletePostUseCase` from M4 now actually hard-deletes the post's
  comments, likes, and (once M7 exists) images in the same transaction —
  go back and complete it.

## Suggested Order of Attack

1. Comment first — it's the more "normal" CRUD shape of the two.
2. Like second — the interesting part here isn't the happy path, it's
   proving the uniqueness constraint actually holds under concurrency
   (see below).
3. Go back to `DeletePostUseCase` last and wire in the comment/like
   (and, once you reach M7, image) cleanup.

## Questions You Should Be Able to Answer

- Where does "can this user comment on this post" get checked — is it
  duplicated logic, or does it call the exact same `VisibilityPolicy`
  method `GetPostUseCase` already uses?
- What actually stops a user from liking the same post twice if two
  identical requests hit your server at nearly the same instant? Is it
  your application code, the database, or both — and if only one, which
  one actually wins the race?
- After deleting a post that had 5 comments and 10 likes, what do you
  expect to find in the `Comment` and `Like` tables? Go check.

## Known Pitfalls

- Re-implementing a visibility check for comments instead of reusing
  `VisibilityPolicy` — if you find yourself writing a second version of
  "is this profile private and am I following," stop, that logic already
  exists.
- Treating `LIKE-03`'s uniqueness as "handled" because your application
  code checks for an existing like before inserting — that check alone
  has a race condition. Prove to yourself the database constraint is the
  real backstop: try firing two like requests for the same user/post at
  effectively the same time (a small script firing both without
  awaiting the first) and confirm only one `Like` row exists afterward.
- Forgetting `DeletePostUseCase` was left unfinished in M4 — this
  milestone isn't done until that gap is closed, not just until Comment/
  Like CRUD works in isolation.

## Definition of Done

- COMMENT-01 through 04 and LIKE-01 through 03 acceptance criteria pass.
- The concurrent-like race test above has actually been run once, with
  the result shown, not just assumed.
- Deleting a post with existing comments and likes is demonstrated to
  remove them (query the tables before and after).
