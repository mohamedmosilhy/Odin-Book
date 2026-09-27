# Milestone 1b — Google OAuth

**Size:** M
**Depends on:** M1

---

## Objective

A visitor can authenticate via Google, and — critically — logging in via
Google with an email that already has a local account links to that
existing `User` rather than creating a duplicate.

## Docs to Have Open

- Phase 1: `requirements.md` AUTH-03
- Phase 2: `domain-decisions.md` DD-04 (the linking-by-email decision),
  `entities.md` (ExternalIdentity)
- Phase 4: `schema.prisma` (ExternalIdentity)
- Phase 5: `auth-flows.md` §3 (read this one twice — the fragment-based
  redirect is the part most likely to confuse you)
- Phase 6: `oauth-hardening.md` (state parameter, why no PKCE)

## What Must Exist When You're Done

- `GET /auth/google` redirecting to Google's consent screen.
- `GET /auth/google/callback` that: verifies `state`, exchanges the code,
  finds-or-creates the `User` (linking by email match per DD-04),
  creates the `ExternalIdentity` row, issues tokens the same way M1's
  local login does, and **redirects** (not returns JSON) to the frontend
  with the access token in a URL fragment.

## Suggested Order of Attack

1. Get the redirect-to-Google half working first and confirm you land on
   Google's real consent screen — don't build the callback yet.
2. Build the callback against a **brand-new** email first (no existing
   local account) — confirm a `User` + `Profile`-stub + `ExternalIdentity`
   get created.
3. Only then test the linking case: register locally with an email, log
   out, then "Sign in with Google" using that same email. Confirm no
   duplicate `User` was created and an `ExternalIdentity` was attached to
   the existing one.
4. Get the fragment-redirect mechanics right last, once the identity
   logic is solid — it's a separate, unrelated concern (a transport
   detail, not a domain one).

## Questions You Should Be Able to Answer

- Why does the access token travel in a URL fragment instead of the
  response body here, when everywhere else in the API it's in the body?
- What would go wrong, concretely, if you skipped verifying `state` on
  the callback?
- If a user's Google email doesn't match any existing `User.email`, what
  exactly gets created, and in what order?

## Known Pitfalls

- Returning JSON from the callback instead of a redirect — this doesn't
  work for a flow where the browser, not your frontend's JS, is what
  followed the redirect from Google.
- Trusting Google's `displayName`/picture as the permanent source of
  truth for the user's `Profile` — re-read `oauth-hardening.md` §5 on
  why that data is only used to pre-fill, never to override.

## Definition of Done

- AUTH-03 acceptance criteria pass.
- Demonstrated: fresh Google login creates a new account correctly.
- Demonstrated: Google login with an email matching an existing local
  account links to it — no duplicate `User` row.
