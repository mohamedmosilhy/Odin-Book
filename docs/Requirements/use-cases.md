# Odin-Book — Use Cases

**Phase:** 1 — Requirements Engineering  
**Status:** Approved  
**Date:** 2026-09-01

## 1. Purpose

Use cases describe interactions between Odin-Book actors and the system. They will guide domain modeling, application services, API operations, authorization, and tests.

## 2. Actors

- Visitor
- Authenticated User
- Google
- Image Storage Provider
- System

## 3. Authentication

### UC-AUTH-01 — Register
**Actor:** Visitor

**Goal:** Create an account.

**Main flow**
1. Visitor opens registration.
2. Enters email and password.
3. System validates input.
4. System verifies email availability.
5. System securely stores the password representation.
6. System creates the user.
7. System establishes authenticated state or redirects according to UX.

**Alternatives:** duplicate email, invalid input, persistence failure.

### UC-AUTH-02 — Login with Email
**Actor:** Visitor

1. Visitor submits email/password.
2. System validates credentials.
3. System establishes authenticated state.
4. User gains protected access.

**Alternatives:** invalid credentials or invalid request.

### UC-AUTH-03 — Login with Google
**Actors:** Visitor, Google

1. Visitor selects Google login.
2. System starts OAuth.
3. Visitor authenticates with Google.
4. Google returns the OAuth result.
5. System validates identity.
6. System locates or creates the application identity/user.
7. System establishes authenticated state.

**Alternatives:** cancellation, OAuth failure, invalid result, account-link conflict.

### UC-AUTH-04 — Logout
**Actor:** Authenticated User

1. User selects logout.
2. System terminates authenticated state.
3. User becomes unauthenticated.

## 4. Profiles

### UC-USER-01 — View Profile
1. User navigates to a profile.
2. System identifies target.
3. System evaluates visibility.
4. System returns authorized profile information and visible posts.

### UC-USER-02 — Edit Own Profile
1. User opens profile settings.
2. Changes allowed fields.
3. System validates changes.
4. System verifies ownership.
5. System persists changes.

### UC-USER-03 — Change Profile Privacy
1. User opens privacy settings.
2. Selects PUBLIC or PRIVATE.
3. System verifies authorization.
4. System saves the new state.
5. New visibility rules apply.

### UC-USER-04 — Update Profile Picture
1. User selects an image.
2. System validates it.
3. System uploads it to image storage.
4. Storage returns a reference/URL.
5. System updates the profile picture reference.

Priority: SHOULD.

## 5. User Discovery

### UC-DISCOVERY-01 — Browse Users
1. User opens discovery.
2. System retrieves users.
3. System includes relevant relationship state.
4. System displays results.

### UC-DISCOVERY-02 — Search Users
1. User enters search text.
2. System validates query.
3. System searches supported identity fields.
4. System returns matches.

Priority: SHOULD.

## 6. Following

### UC-FOLLOW-01 — Follow Public User
**Preconditions:** target is public, not self, and no active follow exists.

1. User selects Follow.
2. System validates target and relationship.
3. System creates ACTIVE FOLLOW.

### UC-FOLLOW-02 — Request Private User
**Preconditions:** target is private and no active/conflicting relationship exists.

1. User selects Follow.
2. System identifies private target.
3. System validates request.
4. System creates PENDING REQUEST.

Pending request does not grant protected-content access.

### UC-FOLLOW-03 — Accept Request
**Preconditions:** current user is request target and request is pending.

1. User selects Accept.
2. System verifies ownership.
3. System transitions the relationship to ACTIVE FOLLOW.

### UC-FOLLOW-04 — Reject Request
**Preconditions:** current user is request target and request is pending.

1. User selects Reject.
2. System verifies authorization.
3. System rejects the request.
4. No active follow is created.

### UC-FOLLOW-05 — Unfollow
**Preconditions:** active follow exists.

1. User selects Unfollow.
2. System verifies relationship ownership.
3. System removes/deactivates the follow.
4. Protected access is recalculated.

## 7. Posts

### UC-POST-01 — Create Post
1. User opens composer.
2. Enters content.
3. System validates content.
4. System creates the post owned by the authenticated user.

### UC-POST-02 — View Post
1. User requests a post.
2. System identifies post and author.
3. System evaluates visibility.
4. If authorized, system returns content, author, likes, and comments.

### UC-POST-03 — Edit Own Post
1. User selects Edit.
2. Changes content.
3. System validates content.
4. System verifies ownership.
5. System updates post.

### UC-POST-04 — Delete Own Post
1. User selects Delete.
2. System verifies ownership.
3. System deletes or marks post deleted according to persistence strategy.
4. Deleted post leaves normal feeds.

### UC-POST-05 — Attach Image
1. User selects image.
2. System validates it.
3. System uploads it.
4. System receives image reference.
5. System associates image with post.

Priority: SHOULD.

## 8. Comments

### UC-COMMENT-01 — Create Comment
1. User enters comment.
2. System validates content.
3. System verifies post visibility.
4. System creates comment.

### UC-COMMENT-02 — View Comments
1. User opens a visible post.
2. System returns its comments.
3. User sees comments.

### UC-COMMENT-03 — Delete Own Comment
1. User selects Delete.
2. System verifies ownership.
3. System deletes/deactivates the comment.

## 9. Likes

### UC-LIKE-01 — Like Post
1. User selects Like.
2. System verifies visibility.
3. System verifies no existing like.
4. System creates like.

### UC-LIKE-02 — Unlike Post
1. User selects Unlike.
2. System removes/deactivates the user's like.
3. Updated state is returned.

## 10. Feed

### UC-FEED-01 — View Personalized Feed
1. User opens feed.
2. System identifies authenticated user.
3. System identifies active follows.
4. System retrieves own and followed users' posts.
5. System applies visibility rules.
6. System orders posts newest first.
7. System returns feed.

### UC-FEED-02 — Paginate Feed
1. Client sends pagination cursor.
2. System retrieves next authorized set.
3. System returns posts and next cursor.

Priority: SHOULD.

## 11. Guest

### UC-GUEST-01 — Enter Demo
1. Visitor selects Guest/Demo.
2. System establishes controlled demo access.
3. Visitor enters restricted demo.

### UC-GUEST-02 — Enforce Guest Restrictions
1. Guest attempts an operation.
2. System checks guest permissions.
3. Unauthorized guest operations are rejected.

Priority: SHOULD.

## 12. Authorization

### UC-AUTHZ-01 — Verify Ownership
System verifies ownership before profile/post/comment modifications.

### UC-AUTHZ-02 — Verify Post Visibility
System determines whether the requester can view the post.

### UC-AUTHZ-03 — Verify Follow Request Target
Only the target of an incoming follow request can accept or reject it.

## 13. Phase 1 Exit Criteria

- Major actors represented
- Core journeys represented
- Authentication, social graph, content, engagement, feed, privacy, and authorization flows represented
- Optional functionality identified

**Status: Completed / Approved**

Next: **Phase 2 — Domain Modeling**
