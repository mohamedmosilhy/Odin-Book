# Odin-Book — API Decisions

**Phase:** 5 — API Contract
**Status:** Resolved / Approved

ADR-style log of the decisions made this phase.

---

## APD-01 — Authentication transport

**Options considered**
- **A. httpOnly cookie session.** Simplest client-side; automatic
  attachment; complicated by SameSite/CORS if frontend and API are on
  different domains (common for a deployed SPA + separate API host).
- **B. JWT Bearer token (body-only).** Clean cross-origin behavior; but
  the client must store a long-lived token somewhere, and `localStorage`
  is readable by any injected script (XSS risk).
- **C. Hybrid — short-lived JWT access token in body, httpOnly refresh
  cookie.** Best of both: access token never touches persistent storage
  (small XSS window, and nothing useful to steal via
  `localStorage`-reading scripts), refresh token is inaccessible to JS
  entirely. Costs more moving parts — refresh endpoint, rotation logic,
  and an OAuth redirect that has to smuggle the access token through a
  URL fragment rather than a response body.

**Decision: Option C.**

**Rationale:** Deliberately the most involved option, chosen for the
stronger security posture and because it's the realistic pattern for a
SPA frontend talking to a separately-hosted API — which is the likely
deployment shape for this project. Full mechanics in `auth-flows.md`.

**Consequence:** Phase 7 (Security) inherits an open dependency — refresh
token rotation needs a persistence/revocation mechanism not yet in the
Phase 4 schema (flagged explicitly in `auth-flows.md` §4).

---

## APD-02 — Privacy-preserving 404s vs. 403s

**Decision:** a resource the viewer isn't authorized to see (a private
post, its comments) returns `404`, not `403`. `403` is reserved for
**ownership** failures on a resource whose existence isn't in question
(editing someone else's post — you can see it, you just can't change it).

**Rationale:** A `403` on a private post confirms the post exists and
belongs to someone whose content you can't access — a small but real
information leak. Returning `404` for "can't view" and `403` only for
"can view but can't modify" keeps that distinction clean and matches
common practice for privacy-sensitive APIs.

**Consequence:** a private *profile* itself is the deliberate exception
— it returns `200` with a limited shell rather than `404`, since account
discoverability (a username exists) is treated as public in this domain,
only its *content* is not. This mirrors how most mainstream social apps
handle private-account lookups.

---

## APD-03 — Resource identification: username vs. id in URLs

**Decision:** public-facing paths (`/profiles/:username`,
`/profiles/:username/posts`, follow actions) use `username`; internal
action targets (`/social/requests/:requestId`, `/comments/:commentId`,
`/posts/:postId`) use the resource's own `id`.

**Rationale:** Direct continuation of Phase 2's decision that username
is the public identity and internal `id`s are not human-facing — a
frontend never needs to know a user's internal `id` just to link to
their profile.

---

## APD-04 — No dedicated "list who liked a post" endpoint

**Decision:** the API exposes only `likeCount` on a post, not a paginated
list of likers, in this phase.

**Rationale:** Not called for by any MUST requirement (POST-05 asks for
posts to display "likes," satisfied by a count). Adding a full
`GET /posts/:postId/likes` list endpoint is low-cost to add later if a
real need shows up, so it's deferred rather than speculatively built.

---

## Summary Table

| ID | Decision | Chosen Option |
|---|---|---|
| APD-01 | Auth transport | Hybrid: JWT access token (body) + httpOnly refresh cookie |
| APD-02 | Privacy-preserving status codes | 404 for "can't view," 403 for "can't modify" |
| APD-03 | URL identification | username for public paths, id for internal actions |
| APD-04 | Likers list endpoint | Deferred — count only, for now |
