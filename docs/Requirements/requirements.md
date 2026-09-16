# Odin-Book — Requirements

**Phase:** 1 — Requirements Engineering  
**Status:** Approved  
**Date:** 2026-09-01

## 1. Purpose

This document defines the functional and non-functional requirements for Odin-Book based on Phase 0 decisions. It specifies system behavior without prescribing implementation details.

## 2. Actors

### Visitor
Unauthenticated person who can register, log in with email/password, authenticate with Google, and access the guest/demo experience when enabled.

### Authenticated User
Can manage their profile, configure privacy, discover users, follow users, manage follow requests, create/edit/delete posts, like/unlike posts, comment, delete their comments, and view authorized content and their feed.

### Google
External OAuth identity provider.

### Image Storage Provider
External storage provider for profile and post images.

### System
Responsible for authentication, authorization, validation, visibility rules, business rules, and data integrity.

## 3. Functional Requirements

### Authentication

**AUTH-01 — Registration**
- Users can register with email and password.
- Email must be unique.
- Passwords must never be stored in plaintext.

**AUTH-02 — Email Login**
- Users can authenticate using email and password.
- Invalid credentials must fail without exposing unnecessary sensitive information.

**AUTH-03 — Google Login**
- Users can authenticate through Google OAuth.
- The system validates the Google identity and associates it with an Odin-Book user.
- Successful authentication establishes authenticated state.

**AUTH-04 — Logout**
- Authenticated users can terminate their authenticated session.

**AUTH-05 — Protected Application**
- Protected functionality must not be accessible to unauthenticated users.
- Backend enforcement is authoritative.

### Users and Profiles

**USER-01 — View Profile**
- Authenticated users can view profiles when permitted.
- A profile may contain username, display name, picture, bio, follower/following information, visibility, and posts.

**USER-02 — Edit Own Profile**
- Users can edit their own profile.
- Users cannot edit another user's profile.

**USER-03 — Profile Privacy**
- Users can choose PUBLIC or PRIVATE.

**USER-04 — Public Profile**
- Public profile content can be viewed according to public visibility rules.

**USER-05 — Private Profile**
- Protected posts are visible only to accepted followers.

**USER-06 — Username**
- Username must be unique.
- Username is a public profile identifier, not the local login identifier.

**USER-07 — Email**
- Email must be unique and is the local authentication identifier.

**USER-08 — Profile Picture**
- Profile picture is part of the profile model.
- Upload/update is a SHOULD requirement.

### User Discovery

**USER-09 — Browse Users**
- Authenticated users can discover other users.
- Results should expose profile identity and relevant relationship state.

**USER-10 — Search Users**
- Users SHOULD be searchable by username and/or display name.

### Following

**FOLLOW-01 — Follow Public Profile**
- A user can directly follow a public profile.
- Result: ACTIVE FOLLOW.

**FOLLOW-02 — Follow Private Profile**
- Following a private profile creates a pending request.
- Pending requests do not grant protected-content access.

**FOLLOW-03 — Accept Request**
- The target user can accept a pending request.
- Result: ACTIVE FOLLOW.

**FOLLOW-04 — Reject Request**
- The target user can reject a pending request.
- Rejection creates no active follow.

**FOLLOW-05 — Unfollow**
- A user can stop following another user.

**FOLLOW-06 — Prevent Self-Follow**
- A user cannot follow themselves.

**FOLLOW-07 — Prevent Duplicate Requests**
- Multiple active pending requests between the same users are prohibited.
- Backend logic and database constraints should enforce this invariant.

### Posts

**POST-01 — Create Post**
- Authenticated users can create text posts.

**POST-02 — View Post**
- Users can view a post only when authorized.

**POST-03 — Edit Own Post**
- Users can edit their own posts only.

**POST-04 — Delete Own Post**
- Users can delete their own posts only.

**POST-05 — Post Content**
- Posts must contain valid content.

**POST-06 — Post Metadata**
- Visible posts display content, author, creation timestamp, comments, and likes.

**POST-07 — Post Images**
- Posts SHOULD support image attachments.

### Comments

**COMMENT-01 — Create Comment**
- Authenticated users can comment on posts they can view.

**COMMENT-02 — Comment Validation**
- Comments require an authenticated author, valid post, and non-empty valid content.

**COMMENT-03 — View Comments**
- Anyone who can view a post can view its comments.
- Comments have no independent privacy model.

**COMMENT-04 — Delete Own Comment**
- Users can delete their own comments only.

### Likes

**LIKE-01 — Like Post**
- Authenticated users can like posts they can view.

**LIKE-02 — Unlike Post**
- Users can remove their own likes.

**LIKE-03 — Prevent Duplicate Likes**
- A user cannot create multiple likes for the same post.
- Application logic and database constraints should protect the invariant.

### Feed

**FEED-01 — Personalized Feed**
- Feed contains the current user's posts and posts from users they follow.

**FEED-02 — Privacy-Aware Feed**
- Feed must not expose posts the current user cannot view.

**FEED-03 — Feed Ordering**
- Posts are initially ordered newest first.

**FEED-04 — Feed Pagination**
- Feed SHOULD support pagination.
- Cursor-based pagination is preferred.

### Guest

**GUEST-01 — Demo Access**
- Visitors SHOULD be able to enter a controlled demo without creating an account.

**GUEST-02 — Guest Restrictions**
- Guest permissions must be restricted to the intended demo experience.

## 4. Cross-Cutting Requirements

**AUTHZ-01 — Server-Side Authorization**
- Protected operations must be authorized by the backend.

**AUTHZ-02 — Resource Ownership**
- Users can modify resources they own according to the operation's rules.

**VIS-01 — Post Visibility**
- Post visibility follows the author's profile privacy and relationship rules.

**VIS-02 — Comment Visibility**
- Comment visibility inherits post visibility.

**DATA-01 — Data Integrity**
- Constraints and transactions should protect domain invariants and consistency.

## 5. Non-Functional Requirements

**NFR-01 — Security**
- Secure password hashing
- Secure authentication/session handling
- Authorization
- Input validation
- Secure cookies where applicable
- Common web-vulnerability protections
- Rate limiting where appropriate
- Secure HTTP headers
- Upload validation and limits

**NFR-02 — Performance**
- Remain responsive with realistic seed data.
- Avoid unnecessary full-table operations.

**NFR-03 — Reliability**
- Multi-record operations must preserve consistency.
- Use transactions where atomicity is required.

**NFR-04 — Maintainability**
- Keep clear boundaries between HTTP/API, business logic, and persistence.
- Avoid burying business rules inside controllers.

**NFR-05 — Testability**
- Core business rules must be independently testable.

**NFR-06 — Deployability**
- Production deployment must support PostgreSQL, environment configuration, authentication configuration, and external image storage when enabled.

**NFR-07 — Responsive UI**
- Frontend should work across desktop and mobile screen sizes.

## 6. Priority Model

- **MUST** — required for MVP
- **SHOULD** — important but can follow core MVP
- **COULD** — optional enhancement
- **OUT** — explicitly excluded

## 7. MVP Boundary

### MUST
Email registration/login, Google OAuth, logout, protected application, profiles, username, display name, bio, profile privacy, user discovery, public follows, private follow requests, accept/reject, unfollow, create/read/edit/delete posts, likes, comments, personalized privacy-aware feed, and authorization.

### SHOULD
Post images, profile image upload/update, profile editing, guest/demo account, search, pagination, counts, and UI polish.

### OUT
Real-time chat, direct messaging, WebSockets, real-time notifications, stories, reels, video posts, live streaming, recommendation engine, AI features, advertising, groups, pages, advanced moderation, and native mobile applications.

## 8. Phase 1 Exit Criteria

- Actors defined
- Functional requirements documented
- Non-functional requirements documented
- Business rules captured
- Authorization and privacy requirements defined
- MVP and out-of-scope boundaries explicit
- Stable requirement identifiers established
- Requirements precise enough to derive use cases and tests

**Status: Completed / Approved**

Next: **Phase 2 — Domain Modeling**
