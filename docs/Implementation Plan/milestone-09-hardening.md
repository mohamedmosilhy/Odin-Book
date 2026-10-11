# Milestone 9 — Hardening Pass

**Size:** M
**Depends on:** every prior milestone

---

## Objective

Every cross-cutting security decision from Phase 6 is actually wired
into the running application, not just designed on paper.

## Docs to Have Open

- Phase 6: `cors-and-transport.md`, `rate-limiting.md` (all of it)
- Phase 5: `api-conventions.md` §3 (error shape)
- Phase 3: `cross-cutting-concerns.md` §2–3 (guards/filters/interceptors)

## What Must Exist When You're Done

- `@nestjs/throttler` configured with the exact per-route-class limits
  from `rate-limiting.md` §2 — stricter on auth routes, looser globally.
- CORS configured to the single allowlisted `FRONTEND_URL`, `credentials:
  true`, no wildcard.
- Refresh cookie carrying every attribute from `cors-and-transport.md`
  §2 — `HttpOnly`, `Secure`, `SameSite=Lax`, scoped `Path`.
- Helmet applied globally.
- The global exception filter mapping **every** domain error type raised
  anywhere in the app (`NotPostOwnerError`, `PostNotFoundError`,
  `NotCommentOwnerError`, and whatever else you've accumulated across
  M1–M8) to the exact JSON error shape from `api-conventions.md` §3 — go
  through your own codebase and check you haven't missed one.

## Suggested Order of Attack

1. Rate limiting first — it's the most isolated change, easiest to test
   independently (just hammer an endpoint and watch for 429).
2. CORS + cookie attributes next — test from an actual browser, not just
   a REST client, since cookie behavior is easy to get subtly wrong in a
   way that only shows up with real browser enforcement.
3. Sweep the whole codebase for every domain error class you've written
   and confirm each one is actually mapped by the filter — this is
   detective work more than new code.

## Questions You Should Be Able to Answer

- Show me a 429 response and explain which limit you hit and why it's
  set where it is.
- Open your browser's dev tools, show me the refresh cookie, and point
  to each attribute, explaining what it defends against.
- Pick one domain error you wrote back in M4 or M5 and trace it, end to
  end, from where it's thrown to the JSON the client actually receives.

## Known Pitfalls

- Applying rate limits only globally and forgetting the stricter
  per-route overrides on auth endpoints — the general limit alone
  doesn't meaningfully slow down credential stuffing.
- Missing a domain error that falls through to NestJS's default,
  unstyled error response instead of your uniform shape — this is the
  most common thing to overlook because it only shows up when you
  deliberately go looking for it.

## Definition of Done

- A demonstrated 429 on login after exceeding its limit.
- Verified cookie attributes in a real browser.
- Every domain error in the codebase confirmed mapped to the uniform
  error shape — walked through explicitly, not asserted.
