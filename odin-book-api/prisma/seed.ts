import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { FollowStatus, PrismaClient, ProfileVisibility } from '../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const SEED_DATE = new Date('2026-01-01T09:00:00.000Z');
const GUEST_EMAIL = 'guest@odin-book.local';

const users = [
  {
    key: 'guest',
    id: 'seed-user-guest',
    email: GUEST_EMAIL,
    profile: {
      id: 'seed-profile-guest',
      username: 'odin_guest',
      displayName: 'Odin Book Guest',
      bio: 'A shared account for exploring the Odin Book demo.',
      visibility: ProfileVisibility.PUBLIC,
    },
  },
  {
    key: 'alice',
    id: 'seed-user-alice',
    email: 'alice@odin-book.local',
    profile: {
      id: 'seed-profile-alice',
      username: 'alice_codes',
      displayName: 'Alice Carter',
      bio: 'Frontend developer, coffee enthusiast, and lifelong learner.',
      visibility: ProfileVisibility.PUBLIC,
    },
  },
  {
    key: 'bob',
    id: 'seed-user-bob',
    email: 'bob@odin-book.local',
    profile: {
      id: 'seed-profile-bob',
      username: 'bob_builds',
      displayName: 'Bob Hassan',
      bio: 'Building APIs and sharing progress with friends.',
      visibility: ProfileVisibility.PRIVATE,
    },
  },
  {
    key: 'carol',
    id: 'seed-user-carol',
    email: 'carol@odin-book.local',
    profile: {
      id: 'seed-profile-carol',
      username: 'carol_creates',
      displayName: 'Carol Mensah',
      bio: 'Designer, illustrator, and weekend photographer.',
      visibility: ProfileVisibility.PUBLIC,
    },
  },
] as const;

type UserKey = (typeof users)[number]['key'];

const followRelationships: ReadonlyArray<{
  id: string;
  requester: UserKey;
  target: UserKey;
  status: FollowStatus;
  createdAt: Date;
}> = [
  {
    id: 'seed-follow-guest-alice',
    requester: 'guest',
    target: 'alice',
    status: FollowStatus.ACTIVE,
    createdAt: new Date('2026-01-02T10:00:00.000Z'),
  },
  {
    id: 'seed-follow-guest-bob',
    requester: 'guest',
    target: 'bob',
    status: FollowStatus.ACTIVE,
    createdAt: new Date('2026-01-03T10:00:00.000Z'),
  },
  {
    id: 'seed-follow-guest-carol',
    requester: 'guest',
    target: 'carol',
    status: FollowStatus.PENDING,
    createdAt: new Date('2026-01-04T10:00:00.000Z'),
  },
  {
    id: 'seed-follow-carol-guest',
    requester: 'carol',
    target: 'guest',
    status: FollowStatus.ACTIVE,
    createdAt: new Date('2026-01-05T10:00:00.000Z'),
  },
  {
    id: 'seed-follow-alice-bob',
    requester: 'alice',
    target: 'bob',
    status: FollowStatus.PENDING,
    createdAt: new Date('2026-01-06T10:00:00.000Z'),
  },
  {
    id: 'seed-follow-bob-alice',
    requester: 'bob',
    target: 'alice',
    status: FollowStatus.ACTIVE,
    createdAt: new Date('2026-01-07T10:00:00.000Z'),
  },
];

const posts: ReadonlyArray<{
  id: string;
  author: UserKey;
  content: string;
  createdAt: Date;
}> = [
  {
    id: 'seed-post-guest-01',
    author: 'guest',
    content: 'Welcome to the Odin Book demo! This account is ready to explore.',
    createdAt: new Date('2026-02-01T08:00:00.000Z'),
  },
  {
    id: 'seed-post-guest-02',
    author: 'guest',
    content: 'Today I explored profiles, follows, posts, comments, and likes.',
    createdAt: new Date('2026-02-05T13:30:00.000Z'),
  },
  {
    id: 'seed-post-guest-03',
    author: 'guest',
    content: 'A small social network is a great full-stack learning project.',
    createdAt: new Date('2026-02-09T17:15:00.000Z'),
  },
  {
    id: 'seed-post-alice-01',
    author: 'alice',
    content: 'Finished a responsive layout today. Grid and flexbox make a strong team.',
    createdAt: new Date('2026-02-02T09:20:00.000Z'),
  },
  {
    id: 'seed-post-alice-02',
    author: 'alice',
    content: 'The best debugging tool is still a clear mental model of the data flow.',
    createdAt: new Date('2026-02-06T11:45:00.000Z'),
  },
  {
    id: 'seed-post-alice-03',
    author: 'alice',
    content: 'Accessibility improvements often make an interface better for everyone.',
    createdAt: new Date('2026-02-10T16:00:00.000Z'),
  },
  {
    id: 'seed-post-bob-01',
    author: 'bob',
    content: 'Added database indexes and watched a slow query become delightfully boring.',
    createdAt: new Date('2026-02-03T10:10:00.000Z'),
  },
  {
    id: 'seed-post-bob-02',
    author: 'bob',
    content: 'Idempotent jobs make retries much less stressful.',
    createdAt: new Date('2026-02-07T14:05:00.000Z'),
  },
  {
    id: 'seed-post-bob-03',
    author: 'bob',
    content: 'A private profile should be private at every read boundary, not just in the UI.',
    createdAt: new Date('2026-02-11T18:25:00.000Z'),
  },
  {
    id: 'seed-post-carol-01',
    author: 'carol',
    content: 'Sketched three directions before choosing one. Exploration paid off.',
    createdAt: new Date('2026-02-04T07:40:00.000Z'),
  },
  {
    id: 'seed-post-carol-02',
    author: 'carol',
    content: 'Good empty states should explain what happens next.',
    createdAt: new Date('2026-02-08T12:50:00.000Z'),
  },
  {
    id: 'seed-post-carol-03',
    author: 'carol',
    content: 'Took a long walk at golden hour and came back with a full camera roll.',
    createdAt: new Date('2026-02-12T15:35:00.000Z'),
  },
];

const comments: ReadonlyArray<{
  id: string;
  author: UserKey;
  postId: string;
  content: string;
  createdAt: Date;
}> = [
  {
    id: 'seed-comment-01',
    author: 'alice',
    postId: 'seed-post-guest-01',
    content: 'Welcome! There is plenty to look around at.',
    createdAt: new Date('2026-02-01T09:00:00.000Z'),
  },
  {
    id: 'seed-comment-02',
    author: 'guest',
    postId: 'seed-post-alice-01',
    content: 'The layout looks great on mobile too.',
    createdAt: new Date('2026-02-02T10:00:00.000Z'),
  },
  {
    id: 'seed-comment-03',
    author: 'guest',
    postId: 'seed-post-bob-01',
    content: 'Fast and boring is exactly what an index should be.',
    createdAt: new Date('2026-02-03T11:00:00.000Z'),
  },
  {
    id: 'seed-comment-04',
    author: 'carol',
    postId: 'seed-post-guest-02',
    content: 'That sounds like a productive tour.',
    createdAt: new Date('2026-02-05T14:00:00.000Z'),
  },
  {
    id: 'seed-comment-05',
    author: 'bob',
    postId: 'seed-post-alice-02',
    content: 'Especially when the data crosses module boundaries.',
    createdAt: new Date('2026-02-06T12:15:00.000Z'),
  },
  {
    id: 'seed-comment-06',
    author: 'alice',
    postId: 'seed-post-carol-02',
    content: 'A useful empty state can prevent so much confusion.',
    createdAt: new Date('2026-02-08T13:20:00.000Z'),
  },
  {
    id: 'seed-comment-07',
    author: 'guest',
    postId: 'seed-post-alice-03',
    content: 'Keyboard navigation made an immediate difference here.',
    createdAt: new Date('2026-02-10T17:00:00.000Z'),
  },
  {
    id: 'seed-comment-08',
    author: 'bob',
    postId: 'seed-post-guest-03',
    content: 'It covers a surprising number of real-world patterns.',
    createdAt: new Date('2026-02-09T18:00:00.000Z'),
  },
];

const likes: ReadonlyArray<{
  user: UserKey;
  postId: string;
  createdAt: Date;
}> = [
  { user: 'alice', postId: 'seed-post-guest-01', createdAt: new Date('2026-02-01T09:05:00.000Z') },
  { user: 'carol', postId: 'seed-post-guest-01', createdAt: new Date('2026-02-01T09:10:00.000Z') },
  { user: 'guest', postId: 'seed-post-alice-01', createdAt: new Date('2026-02-02T10:05:00.000Z') },
  { user: 'guest', postId: 'seed-post-bob-01', createdAt: new Date('2026-02-03T11:05:00.000Z') },
  { user: 'alice', postId: 'seed-post-carol-01', createdAt: new Date('2026-02-04T08:00:00.000Z') },
  { user: 'bob', postId: 'seed-post-alice-02', createdAt: new Date('2026-02-06T12:20:00.000Z') },
  { user: 'carol', postId: 'seed-post-guest-02', createdAt: new Date('2026-02-05T14:05:00.000Z') },
  { user: 'guest', postId: 'seed-post-alice-03', createdAt: new Date('2026-02-10T17:05:00.000Z') },
  { user: 'alice', postId: 'seed-post-bob-02', createdAt: new Date('2026-02-07T15:00:00.000Z') },
  { user: 'bob', postId: 'seed-post-guest-03', createdAt: new Date('2026-02-09T18:05:00.000Z') },
];

async function seed() {
  await prisma.$transaction(
    async (tx) => {
      const userIds = {} as Record<UserKey, string>;

      for (const user of users) {
        const seededUser = await tx.user.upsert({
          where: { email: user.email },
          update: { passwordHash: null, createdAt: SEED_DATE, updatedAt: SEED_DATE },
          create: {
            id: user.id,
            email: user.email,
            passwordHash: null,
            createdAt: SEED_DATE,
            updatedAt: SEED_DATE,
          },
        });

        userIds[user.key] = seededUser.id;

        await tx.profile.upsert({
          where: { userId: seededUser.id },
          update: {
            username: user.profile.username,
            displayName: user.profile.displayName,
            bio: user.profile.bio,
            profilePicture: null,
            visibility: user.profile.visibility,
            createdAt: SEED_DATE,
            updatedAt: SEED_DATE,
          },
          create: {
            id: user.profile.id,
            userId: seededUser.id,
            username: user.profile.username,
            displayName: user.profile.displayName,
            bio: user.profile.bio,
            visibility: user.profile.visibility,
            createdAt: SEED_DATE,
            updatedAt: SEED_DATE,
          },
        });
      }

      for (const relationship of followRelationships) {
        const requesterId = userIds[relationship.requester];
        const targetId = userIds[relationship.target];

        await tx.followRelationship.upsert({
          where: { requesterId_targetId: { requesterId, targetId } },
          update: {
            status: relationship.status,
            createdAt: relationship.createdAt,
            updatedAt: relationship.createdAt,
          },
          create: {
            id: relationship.id,
            requesterId,
            targetId,
            status: relationship.status,
            createdAt: relationship.createdAt,
            updatedAt: relationship.createdAt,
          },
        });
      }

      for (const post of posts) {
        await tx.post.upsert({
          where: { id: post.id },
          update: {
            authorId: userIds[post.author],
            content: post.content,
            createdAt: post.createdAt,
            updatedAt: post.createdAt,
            deletedAt: null,
          },
          create: {
            id: post.id,
            authorId: userIds[post.author],
            content: post.content,
            createdAt: post.createdAt,
            updatedAt: post.createdAt,
          },
        });
      }

      for (const comment of comments) {
        await tx.comment.upsert({
          where: { id: comment.id },
          update: {
            authorId: userIds[comment.author],
            postId: comment.postId,
            content: comment.content,
            createdAt: comment.createdAt,
            updatedAt: comment.createdAt,
          },
          create: {
            id: comment.id,
            authorId: userIds[comment.author],
            postId: comment.postId,
            content: comment.content,
            createdAt: comment.createdAt,
            updatedAt: comment.createdAt,
          },
        });
      }

      for (const like of likes) {
        const userId = userIds[like.user];

        await tx.like.upsert({
          where: { userId_postId: { userId, postId: like.postId } },
          update: { createdAt: like.createdAt },
          create: { userId, postId: like.postId, createdAt: like.createdAt },
        });
      }

      // Mirror the approved fan-out rules: every author sees their own posts,
      // and active followers receive the followed author's posts.
      for (const post of posts) {
        const feedOwners = new Set<UserKey>([post.author]);

        for (const relationship of followRelationships) {
          if (relationship.status === FollowStatus.ACTIVE && relationship.target === post.author) {
            feedOwners.add(relationship.requester);
          }
        }

        for (const owner of feedOwners) {
          const ownerId = userIds[owner];

          await tx.feedItem.upsert({
            where: { ownerId_postId: { ownerId, postId: post.id } },
            update: { authorId: userIds[post.author], createdAt: post.createdAt },
            create: {
              id: `seed-feed-${owner}-${post.id}`,
              ownerId,
              postId: post.id,
              authorId: userIds[post.author],
              createdAt: post.createdAt,
            },
          });
        }
      }
    },
    {
      maxWait: 30_000,
      timeout: 120_000,
    },
  );

  console.info(
    `Seeded ${users.length} users, ${followRelationships.length} follows, ${posts.length} posts, ${comments.length} comments, and ${likes.length} likes.`,
  );
  console.info(`Guest account: ${GUEST_EMAIL}`);
}

try {
  await seed();
} catch (error) {
  console.error('Database seed failed:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
