# Milestone 7 — Images

**Size:** S/M
**Depends on:** M4 (posts), M2 (profile)

---

## Objective

Users can upload a profile picture and attach images to a post, with
files actually stored in Supabase and only a URL persisted in Postgres.

## Docs to Have Open

- Phase 1: `requirements.md` §1.13 (IMAGE-01, IMAGE-02)
- Phase 2: `entities.md` (PostImage)
- Phase 3: `module-boundaries.md` (StorageModule), `architecture-
  decisions.md` AD-05
- Phase 4: `schema.prisma` (PostImage)
- Phase 5: `dto-reference.md` (image upload validation rules —
  type/size limits)

## What Must Exist When You're Done

- `StorageModule` with an `IImageStorage` port and a Supabase adapter
  implementing it — nothing outside this module ever imports the
  Supabase SDK directly.
- `POST /profiles/me/picture` — validates file type/size before ever
  reaching the storage adapter, uploads, updates `Profile.profilePicture`.
- `POST /posts/:postId/images` — same validation, creates `PostImage`
  row(s), enforces the caller is the post's author.
- Now that `PostImage` exists for real, go back and finish
  `DeletePostUseCase`'s cleanup from M4/M5 to also remove `PostImage`
  rows (and, ideally, the actual files in Supabase — decide whether
  that's in scope for you now or a deliberate gap you're noting for
  later; either is defensible, but make the choice consciously).

## Suggested Order of Attack

1. Get the `IImageStorage` port and a working Supabase adapter proven in
   isolation first — write a tiny throwaway script or test that uploads
   a file and gets a URL back, before wiring any HTTP route to it.
2. Profile picture upload next — it's the simpler of the two consumers
   (one file, one field to update).
3. Post images last, including the multi-image `position` ordering.

## Questions You Should Be Able to Answer

- If you wanted to swap Supabase for S3 later, which files would you
  need to touch? (The answer should be a short, specific list — if it's
  "most of the app," the port/adapter boundary isn't doing its job.)
- Why is file-type/size validation checked before the file ever reaches
  `StorageModule`, rather than letting Supabase reject it?

## Known Pitfalls

- Letting `ContentModule` or `ProfilesModule` import the Supabase SDK
  directly "just this once" instead of going through the port — this is
  the exact coupling Clean Architecture's dependency inversion exists to
  prevent.
- Storing the raw file anywhere in Postgres — only the URL belongs there
  (Phase 2, §2.10).

## Definition of Done

- IMAGE-01 and IMAGE-02 acceptance criteria pass.
- An oversized or wrong-type file is rejected before any network call to
  Supabase (demonstrate this — e.g. with logging or a breakpoint, not
  just by trusting the validator exists).
- You can articulate the swap-provider answer above convincingly.
