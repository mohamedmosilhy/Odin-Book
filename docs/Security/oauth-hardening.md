# Odin-Book — OAuth Hardening

**Phase:** 6 — Security
**Status:** Approved

---

## 1. Flow Classification

Odin-Book's Google OAuth integration is a **confidential client,
server-side Authorization Code flow**: the NestJS backend holds the
Google client secret and performs the code-for-token exchange itself
(Phase 5, `auth-flows.md` §3). This classification is what the rest of
this document's decisions hang on.

## 2. CSRF Protection: the `state` Parameter

The OAuth `state` parameter is generated (a high-entropy random value),
stored server-side tied to the pending auth attempt (session or a
short-lived signed cookie), sent to Google on the initial redirect, and
verified to match on the callback before the code exchange proceeds.
This prevents an attacker from tricking a victim's browser into
completing an OAuth flow initiated by the attacker (login CSRF).

In practice, this is handled by `passport-google-oauth20` (the standard
NestJS/Passport strategy for Google), which generates and verifies
`state` automatically — no custom implementation needed, just ensuring
it isn't disabled.

## 3. Why PKCE Is Not Used

PKCE (Proof Key for Code Exchange) exists to protect **public clients**
— mobile apps or SPAs that perform the code exchange themselves and
therefore *cannot* hold a client secret, since anything shipped to the
client is extractable. Odin-Book's frontend never talks to Google
directly — it only ever hits `/api/v1/auth/google`, and the backend
(a confidential client, holding a real secret) does the actual exchange.
The attack PKCE defends against (a stolen authorization code being
redeemed by someone other than the party that requested it, in the
absence of a client secret) doesn't apply when a client secret is
already in play. Adding PKCE here would be defense with no
corresponding threat.

## 4. Redirect URI Allowlist

Google Cloud Console's OAuth client configuration restricts valid
redirect URIs to the exact, fully-qualified callback URL per environment
(`https://api.odinbook.example/api/v1/auth/google/callback` in
production, a distinct one for dev/staging). Google itself refuses the
redirect if it doesn't match exactly — this is Google's own enforcement,
not something Odin-Book implements, but it's listed here as a required
configuration step, not an optional hardening measure.

## 5. Identity Trust Boundary

Per Phase 1's Actor C definition: Google verifies *identity*, but Google
never becomes the source of Odin-Book user data. The callback handler
only reads the verified email + Google's stable `providerUserId` from
the token Google returns — it does not trust any other claim
(display name, picture, etc.) as authoritative for anything beyond
optionally pre-filling profile creation on first login; the user's own
`Profile` remains the actual source of truth for anything user-facing,
consistent with Phase 2's domain model.
