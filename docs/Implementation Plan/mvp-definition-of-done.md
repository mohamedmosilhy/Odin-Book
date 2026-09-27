# Odin-Book — MVP Definition of Done

**Phase:** 8 — Implementation Plan
**Status:** Approved

This is the final checklist for calling Odin-Book's backend
implementation complete against its MVP scope — every row is a MUST
requirement from Phase 1's requirement map, cross-referenced to the
milestone that delivers it.

| Requirement | Milestone | Done? |
|---|---|---|
| AUTH-01 Email registration | M1 | ☐ |
| AUTH-02 Email login | M1 | ☐ |
| AUTH-03 Google OAuth | M1b | ☐ |
| AUTH-04 Logout | M1 | ☐ |
| AUTH-05 Protected application (server-enforced) | M1 | ☐ |
| USER-01 View profile | M2 | ☐ |
| USER-02 Edit profile | M2 | ☐ |
| USER-03 Public/private profile | M2 | ☐ |
| USER-04 Unique username | M2 | ☐ |
| USER-05 Unique email | M2 | ☐ |
| USER-06 Browse users | M2 | ☐ |
| FOLLOW-01 Follow public user | M3 | ☐ |
| FOLLOW-02 Request private user | M3 | ☐ |
| FOLLOW-03 Accept request | M3 | ☐ |
| FOLLOW-04 Reject request | M3 | ☐ |
| FOLLOW-05 Unfollow | M3 | ☐ |
| FOLLOW-06 Self-follow prevention | M3 | ☐ |
| FOLLOW-07 Duplicate request prevention | M3 | ☐ |
| POST-01 Create post | M4 | ☐ |
| POST-02 View post (visibility-enforced) | M4 | ☐ |
| POST-03 Edit own post | M4 | ☐ |
| POST-04 Delete own post | M4 | ☐ |
| POST-05 Post metadata display | M4 | ☐ |
| COMMENT-01 Create comment | M5 | ☐ |
| COMMENT-02 Comment validation | M5 | ☐ |
| COMMENT-03 View comments | M5 | ☐ |
| COMMENT-04 Delete own comment | M5 | ☐ |
| LIKE-01 Like post | M5 | ☐ |
| LIKE-02 Unlike post | M5 | ☐ |
| LIKE-03 Duplicate like prevention | M5 | ☐ |
| FEED-01 Personalized feed | M6 | ☐ |
| FEED-02 Privacy-aware feed | M6 | ☐ |
| FEED-03 Feed ordering | M6 | ☐ |

## SHOULD-Have (not blocking MVP, tracked separately)

| Requirement | Milestone | Done? |
|---|---|---|
| USER-07 Search users | M2 | ☐ |
| POST — Images | M7 | ☐ |
| FEED-04 Pagination | M6 (built alongside FEED-01, not separable in practice) | ☐ |
| GUEST-01/02 Demo access | M8 | ☐ |
| IMAGE-01 Profile picture | M7 | ☐ |
| IMAGE-02 Post images | M7 | ☐ |

## Final Sign-Off Checklist

Beyond the requirement table, confirm before calling this "done":

- [ ] Every milestone's Definition of Done was reviewed and passed under
      the strict-gate process (`mentorship-mode.md`).
- [ ] M9's hardening pass is complete and demonstrated.
- [ ] `.env.example` is current and matches every variable actually used.
- [ ] The seed script produces a demo state good enough to showcase the
      whole app (a portfolio project is judged partly on how good the
      demo data looks).

Once this checklist is complete, the backend is ready for **Phase 10 —
Testing** (formalizing test coverage beyond the ad hoc verification
done per-milestone) and **Phase 11 — Deployment**.
