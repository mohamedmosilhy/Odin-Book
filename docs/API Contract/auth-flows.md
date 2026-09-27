# Odin-Book — Authentication Flows

**Phase:** 5 — API Contract
**Status:** Approved
**Decision:** Hybrid — short-lived JWT access token (response body) +
httpOnly refresh token (cookie). See `api-decisions.md` AD-01 for the
comparison against the alternatives.

---

## 1. Token Roles

| Token | Lifetime | Where it lives | Sent how |
|---|---|---|---|
| Access token | Short (e.g. 15 min — exact value finalized in Phase 7) | Client memory only, never persisted to storage | `Authorization: Bearer <token>` header on every protected request |
| Refresh token | Long (e.g. 30 days) | httpOnly, Secure, SameSite cookie, scoped to `/api/v1/auth` | Sent automatically by the browser, only to refresh/logout endpoints |

The access token is never written to `localStorage` or `sessionStorage`
— kept in a JS variable/in-memory store on the frontend, which is why it
doesn't survive a hard page reload and must be re-obtained via refresh on
app load. This is a deliberate XSS-surface reduction: a script that can
read `localStorage` can steal a long-lived credential; a short-lived
in-memory token is a much smaller window.

---

## 2. Register / Login

```
POST /auth/register
Body: { "email": "...", "password": "..." }

201 Created
Body: { "accessToken": "eyJ...", "user": { "id": "...", "email": "..." } }
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth
```

```
POST /auth/login
Body: { "email": "...", "password": "..." }

200 OK
Body: { "accessToken": "eyJ...", "user": { "id": "...", "email": "..." } }
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth
```

Invalid credentials on login return `401` with a generic message
(`"Invalid email or password."`) — never revealing whether the email
exists, per AUTH-02.

---

## 3. Google OAuth (AUTH-03)

This is the part that needs care with a token-in-body model, since the
final redirect back to the frontend can't include a response body — the
access token has to travel through the URL instead.

```
1. Frontend navigates the browser to:
     GET /api/v1/auth/google

2. API redirects to Google's consent screen.

3. User approves. Google redirects back to:
     GET /api/v1/auth/google/callback?code=...

4. API:
     - exchanges the code with Google
     - validates the identity
     - finds-or-creates the User (+ Profile if new) and ExternalIdentity,
       linking by email match if a local account already exists
       (Phase 2, DD-04)
     - issues an access token + refresh token

5. API responds with:
     Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax
     302 redirect → {FRONTEND_URL}/oauth/callback#accessToken=eyJ...

6. Frontend's /oauth/callback route reads accessToken from the URL
   fragment (never sent to any server — fragments aren't transmitted in
   HTTP requests), stores it in memory, then calls
   history.replaceState to strip it from the visible/bookmarkable URL.
```

Using the URL **fragment** (`#accessToken=...`) rather than a query
parameter (`?accessToken=...`) is deliberate: fragments are never sent
to the server on subsequent requests and don't appear in server access
logs, reducing the token's exposure window.

---

## 4. Refresh

```
POST /auth/refresh
(no body — refresh_token cookie sent automatically by the browser)

200 OK
Body: { "accessToken": "eyJ..." }
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax   (rotated)
```

The refresh token is **rotated** on every use — a new one is issued and
the old one invalidated — rather than being reused until expiry. This
limits the damage of a leaked refresh token to a single use.

The frontend calls this proactively (e.g. shortly before expected access
token expiry) or reactively (on receiving a `401` from any protected
endpoint, refresh once, then retry the original request).

**Forward dependency flagged for Phase 7:** rotation requires
server-side tracking of issued refresh tokens (to detect reuse of an
already-rotated token, which signals theft) — this needs a persistence
mechanism not yet in the Phase 4 schema. Phase 7 (Security) must decide
between a `RefreshToken` table or a stateless signed-family approach
before this is implementable as described.

---

## 5. Logout

```
POST /auth/logout
(refresh_token cookie sent automatically)

204 No Content
Set-Cookie: refresh_token=; Max-Age=0   (cleared)
```

Also invalidates the refresh token server-side (once the Phase 7
persistence mechanism exists), so a logged-out session's refresh token
can't be replayed even if it was captured beforehand.

---

## 6. Protected Route Behavior

Any request to a protected endpoint without a valid `Authorization:
Bearer` header returns `401` with `code: "UNAUTHENTICATED"`. The
frontend's API client is expected to attempt one silent `/auth/refresh`
on a `401` before surfacing an auth error to the user — this keeps a
merely-expired access token invisible to normal usage.
