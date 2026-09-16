# Odin-Book — Acceptance Criteria

**Phase:** 1 — Requirements Engineering  
**Status:** Approved  
**Date:** 2026-09-01

## 1. Authentication

### AC-AUTH-01 — Successful Registration
**Given** a visitor is unauthenticated and the email is unused  
**When** valid registration data is submitted  
**Then** an account is created and the password is stored securely.

### AC-AUTH-02 — Duplicate Email
**Given** an account already uses an email  
**When** another registration uses that email  
**Then** registration is rejected and no duplicate account is created.

### AC-AUTH-03 — Email Login
**Given** valid credentials exist  
**When** the user submits them  
**Then** authentication succeeds and protected functionality becomes accessible.

### AC-AUTH-04 — Invalid Login
**Given** invalid credentials  
**When** login is attempted  
**Then** authentication fails and protected functionality remains inaccessible.

### AC-AUTH-05 — Google Login
**Given** a visitor chooses Google authentication  
**When** Google successfully authenticates the identity  
**Then** Odin-Book establishes the corresponding application identity and authenticated state.

### AC-AUTH-06 — Logout
**Given** a user is authenticated  
**When** logout is performed  
**Then** authenticated state is terminated.

### AC-AUTH-07 — Protected Resource
**Given** a visitor is unauthenticated  
**When** they request protected data  
**Then** the request is rejected/redirected and protected data is not exposed.

## 2. Profiles

### AC-USER-01 — Public Profile
**Given** User A has a public profile  
**When** User B requests it  
**Then** authorized public profile information is returned.

### AC-USER-02 — Private Profile
**Given** User A has a private profile and User B is not an accepted follower  
**When** User B requests protected content  
**Then** protected content is not returned.

### AC-USER-03 — Accepted Follower
**Given** User A is private and User B is an accepted follower  
**When** User B requests User A's protected posts  
**Then** the posts are accessible.

### AC-USER-04 — Edit Own Profile
**Given** User A owns the profile  
**When** User A updates it with valid data  
**Then** the changes are saved.

### AC-USER-05 — Edit Another Profile
**Given** User B owns a profile  
**When** User A attempts to modify it  
**Then** the operation is rejected.

### AC-USER-06 — Unique Username
**Given** a username is already taken  
**When** another user attempts to use it  
**Then** the operation is rejected.

### AC-USER-07 — Change Privacy
**Given** a user owns their profile  
**When** they change privacy from public to private  
**Then** protected post visibility follows private-profile rules.

## 3. Following

### AC-FOLLOW-01 — Follow Public User
**Given** User B is public and User A is not already following  
**When** User A follows B  
**Then** an active follow is created.

### AC-FOLLOW-02 — Request Private User
**Given** User B is private  
**When** User A follows B  
**Then** a pending request is created  
**And** User A does not gain protected access.

### AC-FOLLOW-03 — Accept Request
**Given** User A has a pending request to B  
**When** B accepts  
**Then** A becomes an accepted follower  
**And** A can access B's protected posts.

### AC-FOLLOW-04 — Reject Request
**Given** A has a pending request to B  
**When** B rejects it  
**Then** A does not become a follower.

### AC-FOLLOW-05 — Duplicate Request
**Given** A already has a pending request to B  
**When** A sends another request  
**Then** no second active pending request is created.

### AC-FOLLOW-06 — Self Follow
**Given** A is authenticated  
**When** A attempts to follow A  
**Then** the operation is rejected.

### AC-FOLLOW-07 — Unfollow
**Given** A follows B  
**When** A unfollows B  
**Then** the active relationship is removed/deactivated  
**And** protected access is recalculated.

## 4. Posts

### AC-POST-01 — Create
**Given** A is authenticated  
**When** A submits valid content  
**Then** a post owned by A is created.

### AC-POST-02 — Empty Post
**Given** A is authenticated  
**When** invalid/empty content is submitted  
**Then** the post is rejected.

### AC-POST-03 — View Authorized Post
**Given** A can view a post  
**When** A requests it  
**Then** content, author, timestamp, likes, and comments are returned.

### AC-POST-04 — View Unauthorized Private Post
**Given** B is private and A is not an accepted follower  
**When** A requests B's protected post  
**Then** the post is not returned.

### AC-POST-05 — Edit Own Post
**Given** A owns Post X  
**When** A edits X with valid content  
**Then** X is updated.

### AC-POST-06 — Edit Another Post
**Given** A owns Post X  
**When** B attempts to edit X  
**Then** the operation is rejected.

### AC-POST-07 — Delete Own Post
**Given** A owns Post X  
**When** A deletes X  
**Then** X no longer appears in normal feeds.

### AC-POST-08 — Delete Another Post
**Given** A owns Post X  
**When** B attempts to delete X  
**Then** the operation is rejected.

## 5. Comments

### AC-COMMENT-01 — Create
**Given** A can view Post X  
**When** A submits valid comment content  
**Then** a comment is created.

### AC-COMMENT-02 — Unauthorized Comment
**Given** A cannot view Post X  
**When** A attempts to comment  
**Then** the operation is rejected.

### AC-COMMENT-03 — Empty Comment
**Given** A is authenticated  
**When** A submits an empty comment  
**Then** the operation is rejected.

### AC-COMMENT-04 — Visibility
**Given** A can view Post X  
**When** A views X  
**Then** A can view its comments.

### AC-COMMENT-05 — Delete Own Comment
**Given** A owns Comment X  
**When** A deletes it  
**Then** it is no longer normally displayed.

### AC-COMMENT-06 — Delete Another Comment
**Given** A owns Comment X  
**When** B attempts to delete X  
**Then** the operation is rejected.

## 6. Likes

### AC-LIKE-01 — Like
**Given** A can view Post X and has not liked it  
**When** A likes X  
**Then** a like is created.

### AC-LIKE-02 — Duplicate Like
**Given** A already likes X  
**When** A likes X again  
**Then** no second like is created.

### AC-LIKE-03 — Unlike
**Given** A likes X  
**When** A unlikes X  
**Then** A no longer has an active like on X.

### AC-LIKE-04 — Unauthorized Like
**Given** A cannot view X  
**When** A attempts to like X  
**Then** the operation is rejected.

## 7. Feed

### AC-FEED-01 — Own Posts
**Given** A has a visible post  
**When** A requests the feed  
**Then** the post can appear.

### AC-FEED-02 — Followed User
**Given** A follows B and B has a visible post  
**When** A requests the feed  
**Then** B's post can appear.

### AC-FEED-03 — Private User Excluded
**Given** B is private and A is not an accepted follower  
**When** A requests the feed  
**Then** B's protected post does not appear.

### AC-FEED-04 — Ordering
**Given** multiple visible posts exist  
**When** the feed is requested  
**Then** posts are ordered newest first.

### AC-FEED-05 — Pagination
**Given** more visible posts exist than fit on the current page  
**When** the next cursor is requested  
**Then** the next authorized set is returned without unnecessary repetition.

Priority: SHOULD.

## 8. Guest

### AC-GUEST-01 — Demo Access
**Given** a visitor has not registered  
**When** Guest/Demo is selected  
**Then** controlled demo access is established.

### AC-GUEST-02 — Guest Restrictions
**Given** a visitor is using demo access  
**When** they attempt an operation outside guest permissions  
**Then** the operation is rejected.

Priority: SHOULD.

## 9. Authorization

### AC-AUTHZ-01 — Ownership Enforcement
**Given** A owns a resource  
**When** B sends a crafted request to modify it  
**Then** the backend rejects the operation.

### AC-AUTHZ-02 — Visibility Enforcement
**Given** a post is protected  
**When** an unauthorized user requests it directly  
**Then** the backend does not expose it.

### AC-AUTHZ-03 — Follow Request Authorization
**Given** A sent a request to B  
**When** C attempts to accept or reject it  
**Then** the operation is rejected.

## 10. Data Integrity

### AC-DATA-01 — Duplicate Likes
**Given** concurrent/repeated like requests target the same user/post pair  
**When** they are processed  
**Then** the database contains no duplicate active likes.

### AC-DATA-02 — Duplicate Pending Requests
**Given** concurrent/repeated follow requests target the same requester/target pair  
**When** they are processed  
**Then** the database contains no multiple active pending requests for that pair.

## 11. Phase 1 Exit Criteria

Each MVP capability has observable success/failure criteria, including authorization and privacy behavior.

**Status: Completed / Approved**
