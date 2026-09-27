# Odin-Book — Phase 0: Discovery

**Project:** Odin-Book  
**Phase:** 0 — Discovery  
**Status:** Completed / Working Baseline  
**Date:** 2026-08-24

---

## 1. Product Definition

Odin-Book is a private/public social networking platform inspired by products such as Facebook, X, and Threads.

The application allows authenticated users to:

- create and manage a profile
- publish posts
- follow other users
- send and receive follow requests
- interact with posts through likes and comments
- discover other users
- view a personalized feed

The project is intentionally scoped around the core social-networking domain rather than attempting to clone a complete commercial social network.

The primary engineering goal is to build the product through a complete software development lifecycle and demonstrate strong backend, database, API, security, testing, and deployment practices.

---

## 2. Product Vision

Build a small but properly engineered social platform that demonstrates the complete lifecycle of a modern web application:

Authentication
→ Identity
→ Social Graph
→ Content
→ Engagement
→ Personalized Feed

The project should be valuable both as a functional application and as a portfolio demonstration of software architecture and engineering practices.

---

## 3. Target Users

### 3.1 Registered User

The primary application user.

A registered user can:

- authenticate
- manage their profile
- configure profile visibility
- discover users
- follow public users
- send follow requests to private users
- accept or reject incoming requests
- unfollow users
- create posts
- edit posts
- delete posts
- like and unlike posts
- comment on posts
- delete their own comments
- view their personalized feed

### 3.2 Guest / Demo User

A controlled account intended for portfolio visitors.

The guest experience will allow visitors to explore the application without creating an account.

Guest permissions and restrictions will be defined during requirements and authorization design.

### 3.3 Application/System

The system is responsible for:

- authentication
- authorization
- enforcing business rules
- maintaining relationships
- maintaining data integrity
- storing content
- applying visibility rules

---

## 4. Core User Goals

### Identity

Users want to establish and manage their identity on the platform.

Required capabilities:

- registration
- login
- profile
- profile picture
- display name
- username
- bio

### Social Connection

Users want to connect with other users.

Required capabilities:

- discover users
- follow public users
- request access to private users
- accept requests
- reject requests
- unfollow users

### Expression

Users want to publish content.

Required capabilities:

- create posts
- edit posts
- delete posts
- optionally attach images

### Interaction

Users want to interact with content.

Required capabilities:

- like
- unlike
- comment
- delete their own comments

### Discovery

Users want to discover content from people they are connected to.

Required capability:

- personalized feed

---

## 5. Primary User Journey

A typical user journey is:

Visitor
→ Register
→ Authenticate
→ Complete Profile
→ Discover Users
→ Follow / Send Follow Request
→ View Feed
→ Create Post
→ Like / Comment
→ Visit Profiles

For private profiles:

User A
→ Send Follow Request
→ User B Accepts
→ User A becomes an accepted follower
→ User A can view User B's protected posts

---

## 6. Authentication

Odin-Book will support two authentication methods.

### 6.1 Email and Password

Users can register and authenticate using:

- email
- password

Email is the authentication identifier and must be unique.

Passwords must never be stored in plaintext.

### 6.2 Google Authentication

Users can authenticate through Google OAuth.

The architecture should allow a user to have authentication identities independently from their core user/profile record.

Conceptually:

User
→ Authentication Identity
→ Local or Google

The exact authentication/session implementation will be defined during architecture design.

---

## 7. Technology Stack

### Frontend

**Next.js**

Responsibilities:

- user interface
- frontend routing
- rendering
- forms
- client-side interactions
- frontend validation
- API consumption

### Backend

**Node.js + NestJS**

Responsibilities:

- REST API
- authentication
- authorization
- business logic
- request validation
- database access
- file handling
- security

### Database

**PostgreSQL**

Responsibilities:

- persistent data
- relational integrity
- constraints
- transactions

### ORM

**Prisma**

Responsibilities:

- database schema
- migrations
- type-safe database access

---

## 8. Profile Visibility

Users can configure their profile visibility.

Supported states:

- PUBLIC
- PRIVATE

### 8.1 Public Profile

If a profile is public:

- anyone can view the profile
- anyone can view the user's posts
- users do not need to be accepted followers to view public content

### 8.2 Private Profile

If a profile is private:

- non-followers cannot view protected profile content
- non-followers cannot view the user's posts
- accepted followers can view the user's posts
- users must send a follow request before gaining access

Privacy is a domain rule and must be enforced by the backend, not only by the frontend.

---

## 9. Following Model

The application will use a following relationship.

### Public User

A user can follow a public profile directly.

User A
→ Follow
→ User B

### Private User

A user must request access.

User A
→ Follow Request
→ User B
→ Accept
→ User A follows User B

The target user can:

- accept the request
- reject the request

A user can later unfollow another user.

A user cannot follow themselves.

The exact relationship/state representation will be finalized during domain modeling.

---

## 10. User Identity

Email is used for authentication.

Username remains a separate profile identifier.

Example:

- Email: `user@example.com`
- Username: `@username`
- Display name: `User Name`

Email and username should both be unique, but they serve different purposes.

Email is the login identifier.

Username is the public identity used for profile discovery and URLs.

---

## 11. Posts

Users can:

- create posts
- edit their own posts
- delete their own posts
- view posts they are authorized to see

Initial post content is text-based.

Image support is planned as an extension.

### Post Lifecycle

CREATE
→ PUBLISHED
→ EDITED
→ DELETED

Only the post owner can edit or delete the post.

The final deletion strategy, including whether soft deletion is used, will be decided during database design.

---

## 12. Post Visibility

Post visibility follows the author's profile privacy rules.

For a public profile:

Anyone can view the user's posts.

For a private profile:

Only accepted followers can view the user's posts.

The backend must evaluate whether a requesting user is authorized to view a post.

Conceptually:

`canViewPost(user, post)`

This authorization rule should be centralized in the application/domain layer rather than duplicated across controllers.

---

## 13. Comments

Comments belong to posts.

A comment:

- has an author
- belongs to a post
- cannot be empty
- can be deleted by its author

There is no independent comment privacy model.

A comment inherits the visibility of its post.

Therefore:

If a user can see the post → they can see its comments.

If a user cannot see the post → they cannot see its comments.

---

## 14. Likes

Users can:

- like a post
- unlike a post

Business rules:

- a user cannot like the same post more than once
- a user cannot like a post they cannot access
- deleted posts cannot receive new likes

Database constraints should protect against duplicate likes even if concurrent requests occur.

---

## 15. Feed

The personalized feed contains:

- the current user's posts
- posts from users they follow

The feed must respect profile/post visibility rules.

Initial ordering:

Newest → Oldest

Pagination will be considered during API and database design, with cursor pagination preferred for the production-oriented implementation.

Conceptually:

Current User
→ Own Posts

- Followed Users
  → Visibility Rules
  → Ordered Posts
  → Feed

  ***

## 16. MVP Scope

### Must Have

#### Authentication

- Email/password registration
- Email/password login
- Google OAuth
- Logout
- Session/authentication management
- Protected application
- Authentication middleware/guards

#### Users

- User profile
- Username
- Display name
- Email
- Bio
- Profile picture
- Public/private profile
- User discovery

#### Social Graph

- Follow public users
- Follow request for private users
- Accept follow request
- Reject follow request
- Unfollow
- Followers/following information

#### Posts

- Create post
- Read post
- Edit post
- Delete post
- Text content
- Author information
- Creation timestamp
- Privacy-aware visibility

#### Engagement

- Like
- Unlike
- Comment
- Delete own comment

#### Feed

- Own posts
- Posts from followed users
- Visibility-aware feed
- Newest-first ordering

---

## 17. Secondary Scope

These features are valuable but should not block the MVP.

### Should Have

- Post images
- Profile image updates
- Profile editing
- Guest/demo account
- Pagination
- Search users
- Follow counts
- Like counts
- Comment counts
- Polished responsive UI

---

## 18. Out of Scope for Initial Release

The following features are intentionally excluded from the initial product:

- real-time chat
- direct messaging
- WebSockets
- real-time notifications
- stories
- reels
- video uploads
- live streaming
- recommendation algorithms
- AI features
- advertising
- groups
- pages
- advanced moderation systems
- mobile applications

These can be evaluated later without expanding the initial scope.

---

## 19. Initial Business Rules

### Authentication

1. Unauthenticated users cannot access protected application functionality.
2. Passwords must never be stored in plaintext.
3. Email must be unique.
4. Username must be unique.
5. Users authenticate using their email or supported OAuth identity.
6. Authentication state must be securely maintained.

### Users

1. A user cannot follow themselves.
2. Users own their profile information.
3. Users cannot modify another user's profile.
4. Profile visibility determines access to protected content.

### Follow Relationships

1. Public profiles can be followed directly.
2. Private profiles require a follow request.
3. A user cannot create duplicate pending requests.
4. Only the target user can accept or reject an incoming request.
5. Rejected requests do not create a following relationship.
6. Accepted requests create an authorized following relationship.
7. A user can unfollow another user.

### Posts

1. Every post has an author.
2. A post must contain valid content.
3. Only the author can edit the post.
4. Only the author can delete the post.
5. Users cannot interact with posts they cannot access.
6. Post visibility follows the author's profile privacy rules.

### Likes

1. A user can like a visible post.
2. A user can unlike a post.
3. A user cannot create duplicate likes for the same post.

### Comments

1. A comment belongs to exactly one post.
2. A comment has exactly one author.
3. A comment cannot be empty.
4. A user can delete their own comment.
5. Comment visibility follows post visibility.

---

## 20. Privacy Model

The current privacy model is intentionally simple.

### Public

```text
Public Profile
    ↓
Anyone
    ↓
Can view profile and posts
```

### Private

```text
Private Profile
    ↓
Follow Request
    ↓
Accepted
    ↓
Follower
    ↓
Can view protected posts
```

The backend is the final authority for all visibility decisions.

---

## 21. Security Requirements

The application should address:

- secure password hashing
- secure authentication/session handling
- authorization
- input validation
- CSRF protection where applicable
- XSS prevention
- SQL injection protection through Prisma/parameterized queries
- secure cookies where applicable
- rate limiting
- secure HTTP headers
- upload validation
- file size limits
- MIME/type validation
- protection against authentication abuse
- avoiding exposure of sensitive information

Security implementation will be designed in later phases rather than prematurely choosing every mechanism now.

---

## 22. Architectural Characteristics

### Security

Sensitive operations must be protected by backend authorization and validated input.

### Reliability

Related database changes must preserve consistency.

Transactions should be used when multiple operations must succeed together.

### Performance

The application should remain responsive with realistic development/seed data.

Database queries should be designed intentionally and should avoid unnecessary full-table operations.

### Maintainability

The application should separate:

HTTP/API layer
→ Application/business logic
→ Persistence

Business rules should not be buried inside controllers.

### Testability

Core business rules should be independently testable.

### Deployability

The application must be deployable to a production environment with:

- production PostgreSQL
- environment variables
- production authentication configuration
- production frontend/backend configuration
- external image storage when image support is implemented

---

## 23. Data Ownership

Users own the resources they create.

Examples:

- User A can edit their own profile.
- User A cannot edit User B's profile.
- User A can edit their own posts.
- User A cannot edit User B's posts.
- User A can delete their own comments.
- User A cannot delete User B's comments.

Frontend restrictions are not considered sufficient. The backend must enforce ownership.

---

## 24. Success Criteria

A successful MVP should allow a recruiter or evaluator to:

1. Enter the application.
2. Register or use the demo account.
3. Authenticate.
4. View and edit a profile.
5. Configure profile privacy.
6. Discover another user.
7. Follow a public user.
8. Send a request to a private user.
9. Accept/reject a request.
10. Create a post.
11. Edit a post.
12. Delete a post.
13. See authorized posts in the feed.
14. Like and unlike posts.
15. Comment on posts.
16. Delete their own comments.
17. View another user's profile.
18. Experience the application's responsive UI.

From an engineering perspective, the project should demonstrate:

- Next.js
- NestJS
- REST API design
- PostgreSQL
- Prisma
- authentication
- OAuth
- authorization
- relational modeling
- transactions
- validation
- security
- testing
- pagination
- image storage
- deployment

---

## 25. Technology Decision Summary

| Area                         | Decision                      |
| ---------------------------- | ----------------------------- |
| Frontend                     | Next.js                       |
| Backend                      | NestJS / Node.js              |
| Database                     | PostgreSQL                    |
| ORM                          | Prisma                        |
| Authentication               | Email/password + Google OAuth |
| Login identifier             | Email                         |
| Public identity              | Username                      |
| Profile visibility           | Public / Private              |
| Social relationship          | Following                     |
| Private profile relationship | Follow request                |
| Posts                        | Create / Read / Edit / Delete |
| Comments                     | Yes                           |
| Likes                        | Yes                           |
| Feed                         | Own + followed users          |
| Images                       | Planned extension             |
| Guest access                 | Planned extension             |
| Real-time                    | Out of scope                  |
| Chat                         | Out of scope                  |
| Mobile app                   | Out of scope                  |

---

## 26. Phase 0 Exit Criteria

Phase 0 is considered complete when:

- product purpose is defined
- target users are identified
- MVP boundaries are established
- major out-of-scope features are documented
- authentication methods are selected
- privacy model is defined
- social relationship model is defined at a high level
- post/comment/like behavior is established
- technology stack is selected
- major non-functional requirements are identified
- initial business rules are documented

### Phase 0 Status

**Completed.**

The next phase is:

**Phase 1 — Requirements Engineering**

Phase 1 will transform these product decisions into detailed functional requirements, actors, use cases, acceptance criteria, and system rules before we begin domain modeling.
