# Milestone 4 — Content: Posts

**Size:** M
**Depends on:** M3

---

## Objective

Authenticated users can create, view, edit, and (soft-)delete posts,
with visibility and ownership both correctly enforced server-side.

## Docs to Have Open

- Phase 1: `requirements.md` §1.8 (POST-01 through 05)
- Phase 2: `entities.md` (Post), `invariants.md` (Post section)
- Phase 3: `module-boundaries.md` (ContentModule), `clean-architecture-
  guide.md` (re-read the worked `CreatePostUseCase` example structurally
  — not to copy the code shown, but to confirm you understand *why* each
  layer exists before building the real thing)
- Phase 4: `schema.prisma` (Post, PostImage — images come in M7, ignore
  that table for now), **`deletion-and-cascades.md` — read this
  entirely, twice, before writing `DeletePostUseCase`**
- Phase 5: `endpoints-reference.md` (Content: Posts section),
  `api-conventions.md` §5 (404 vs 403 rule)

## What Must Exist When You're Done

- `ContentModule` scaffolded (you'll add Comments/Likes to it in M5).
- `Post` entity with `canBeEditedBy`/`canBeDeletedBy`-style ownership
  logic living on the entity itself, not scattered in the use case.
- Create/Edit/Delete/Get-by-id/Get-by-author use cases.
- `PostOwnerGuard` (Phase 3 `cross-cutting-concerns.md` §2) applied to
  edit/delete routes.
- Delete is a **soft delete**, and — this is the part that was
  explicitly flagged as a mistake-in-waiting back in Phase 4 — deleting a
  post must also **hard-delete** its comments/likes/images in the same
  transaction. There are no comments/likes yet (that's M5), so for now
  this means: get the transaction structure right, confirm the soft-
  delete filter works, and leave a clear spot for M5's cleanup to slot
  into the same use case.

## Suggested Order of Attack

1. `Post` entity first, zero framework code — what belongs on it besides
   plain fields?
2. Create/Get use cases + fake-repo unit tests, same pattern as every
   prior milestone.
3. Edit/Delete next, with the guard.
4. Before you write `DeletePostUseCase`'s transaction: reread
   `deletion-and-cascades.md` §2–3 and explain out loud (to yourself, a
   rubber duck, whoever) why `onDelete: Cascade` in the schema does
   *not* handle this. If you can't explain it, you're not ready to write
   this method yet.
5. Wire `GetPostUseCase` through `VisibilityPolicy` last, so you can
   prove the 404-not-403 behavior (`api-conventions.md` §5) on a private
   post you're not authorized to see.

## Questions You Should Be Able to Answer

- Why does a request for a private post you can't see return 404, not
  403? Where does that distinction actually get decided in your code?
- What SQL operation does your delete flow actually run — is it an
  `UPDATE` or a `DELETE`, and for which table(s)?
- If you set `deletedAt` but forgot to also clean up (future) comments
  and likes, what would a user querying that post's comments still see?

## Known Pitfalls

- The exact mistake flagged in Phase 4: assuming `onDelete: Cascade` in
  the schema will clean things up on a soft delete. It will not — trace
  through why in `deletion-and-cascades.md` before you write a single
  line of `DeletePostUseCase`.
- Checking ownership in the controller instead of the guard *and* the
  entity's own method — Phase 3's design wants both: the guard as a
  first line of defense, the entity method as the real enforcement that
  can't be bypassed by a misconfigured route.
- Forgetting to filter `deletedAt IS NULL` on every single read path
  (direct fetch, by-author list) — it has to be in the repository layer,
  applied by default, not something each use case remembers to add.

## Definition of Done

- POST-01 through POST-05 acceptance criteria pass.
- A soft-deleted post is unreachable via `GET /posts/:id`, and via the
  author's post list.
- A private post you're not authorized to view returns 404, demonstrated
  against a real request, not just described.
- Editing/deleting someone else's post returns 403, demonstrated.
