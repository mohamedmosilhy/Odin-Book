import { ACCESS_TOKEN, type AccessTokenPort } from '@auth/application/ports/access-token.port.js';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ProfilesModule } from '@profiles/profiles.module.js';
import { HttpExceptionFilter } from '@shared/filters/global-exception.filter.js';
import { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import { SocialModule } from '@social/social.module.js';
import request from 'supertest';

// This suite owns its database. Never point it at development or production data.
const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.startsWith('/odin_book_test')) {
  throw new Error('E2E_DATABASE_URL must identify a dedicated database named odin_book_test*');
}

describe('Social HTTP flows with PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokens: AccessTokenPort;
  type Actor = { id: string; username: string; token: string };
  let alice: Actor;
  let bob: Actor;
  let charlie: Actor;

  async function actor(
    username: string,
    visibility: 'PUBLIC' | 'PRIVATE' = 'PUBLIC',
  ): Promise<Actor> {
    const user = await prisma.user.create({
      data: {
        email: `${username}@example.com`,
        profile: { create: { username, displayName: username, visibility } },
      },
    });
    return { id: user.id, username, token: await tokens.generate(user.id) };
  }

  function follow(viewer: Actor, target: Actor) {
    return request(app.getHttpServer())
      .post(`/api/v1/profiles/${target.username}/follow`)
      .set('Authorization', `Bearer ${viewer.token}`);
  }
  function unfollow(viewer: Actor, target: Actor) {
    return request(app.getHttpServer())
      .delete(`/api/v1/profiles/${target.username}/follow`)
      .set('Authorization', `Bearer ${viewer.token}`);
  }
  function graph(target: Actor, kind: 'followers' | 'following', viewer?: Actor) {
    const req = request(app.getHttpServer()).get(`/api/v1/profiles/${target.username}/${kind}`);
    return viewer ? req.set('Authorization', `Bearer ${viewer.token}`) : req;
  }
  function profile(target: Actor, viewer?: Actor) {
    const req = request(app.getHttpServer()).get(`/api/v1/profiles/${target.username}`);
    return viewer ? req.set('Authorization', `Bearer ${viewer.token}`) : req;
  }
  async function pendingId(viewer: Actor, target: Actor): Promise<string> {
    const row = await prisma.followRelationship.findUniqueOrThrow({
      where: { requesterId_targetId: { requesterId: viewer.id, targetId: target.id } },
    });
    return row.id;
  }
  function manage(viewer: Actor, id: string, action: 'accept' | 'reject') {
    return request(app.getHttpServer())
      .post(`/api/v1/social/requests/${id}/${action}`)
      .set('Authorization', `Bearer ${viewer.token}`);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              database: { url: databaseUrl },
              jwt: {
                secret: 'integration-secret-with-at-least-thirty-two-characters',
                accessTokenTtl: '15m',
                refreshTokenTtlDays: 30,
              },
              googleOauth: {
                clientId: 'integration-client',
                clientSecret: 'integration-secret',
                callbackUrl: 'http://localhost/auth/google/callback',
              },
            }),
          ],
        }),
        ProfilesModule,
        SocialModule,
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(ACCESS_TOKEN);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    alice = await actor('alice');
    bob = await actor('bob', 'PRIVATE');
    charlie = await actor('charlie');
  });

  afterAll(async () => {
    if (prisma) await prisma.user.deleteMany();
    await app?.close();
  });

  it('follows a public profile, lists both directions, updates counts/status, and unfollows', async () => {
    await follow(alice, charlie).expect(201, { status: 'ACTIVE' });
    expect((await profile(charlie, alice).expect(200)).body).toMatchObject({
      followerCount: 1,
      followingCount: 0,
      followStatus: 'ACTIVE',
    });
    expect((await profile(alice).expect(200)).body).toMatchObject({
      followingCount: 1,
      followStatus: 'NONE',
    });
    expect((await graph(charlie, 'followers').expect(200)).body.items).toEqual([
      expect.objectContaining({ username: 'alice' }),
    ]);
    expect((await graph(alice, 'following').expect(200)).body.items).toEqual([
      expect.objectContaining({ username: 'charlie' }),
    ]);
    await follow(alice, charlie).expect(409);
    await unfollow(alice, charlie).expect(204);
    expect((await profile(charlie, alice).expect(200)).body).toMatchObject({
      followerCount: 0,
      followStatus: 'NONE',
    });
  });

  it('keeps pending requests out of counts and private graphs, enforces ownership, then grants and revokes access', async () => {
    await follow(alice, bob).expect(201, { status: 'PENDING' });
    await follow(alice, bob).expect(409);
    const id = await pendingId(alice, bob);
    expect((await profile(bob, alice).expect(200)).body).toMatchObject({
      followerCount: 0,
      followStatus: 'PENDING',
    });
    for (const kind of ['followers', 'following'] as const) {
      await graph(bob, kind).expect(404);
      await graph(bob, kind, alice).expect(404);
      await graph(bob, kind, charlie).expect(404);
      await graph(bob, kind, bob).expect(200);
    }
    for (const action of ['accept', 'reject'] as const) {
      await manage(charlie, id, action).expect(403);
      await manage(alice, id, action).expect(403);
    }
    const incoming = await request(app.getHttpServer())
      .get('/api/v1/social/requests/incoming')
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(200);
    expect(incoming.body.items).toEqual([
      expect.objectContaining({
        requestId: id,
        requester: expect.objectContaining({ username: 'alice' }),
      }),
    ]);
    const othersIncoming = await request(app.getHttpServer())
      .get('/api/v1/social/requests/incoming')
      .set('Authorization', `Bearer ${charlie.token}`)
      .expect(200);
    expect(othersIncoming.body.items).toEqual([]);
    await manage(bob, id, 'accept').expect(204);
    for (const kind of ['followers', 'following'] as const)
      await graph(bob, kind, alice).expect(200);
    expect((await profile(bob, alice).expect(200)).body).toMatchObject({
      followerCount: 1,
      followStatus: 'ACTIVE',
    });
    await manage(charlie, id, 'accept').expect(403);
    await manage(charlie, id, 'reject').expect(403);
    await manage(bob, id, 'accept').expect(409);
    await manage(bob, id, 'reject').expect(409);
    await unfollow(alice, bob).expect(204);
    await graph(bob, 'followers', alice).expect(404);
  });

  it('deletes rejected and cancelled requests and permits requesting again', async () => {
    await follow(alice, bob).expect(201);
    const first = await pendingId(alice, bob);
    await manage(bob, first, 'reject').expect(204);
    await manage(bob, first, 'accept').expect(404);
    await follow(alice, bob).expect(201);
    await unfollow(alice, bob).expect(204);
    expect(await prisma.followRelationship.count()).toBe(0);
    await follow(alice, bob).expect(201, { status: 'PENDING' });
  });

  it('rejects self-follow, missing targets, and unauthenticated mutations', async () => {
    await follow(alice, alice).expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/profiles/missing/follow')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(404);
    await unfollow(alice, bob).expect(404);
    await request(app.getHttpServer()).post('/api/v1/profiles/bob/follow').expect(401);
    await request(app.getHttpServer()).delete('/api/v1/profiles/bob/follow').expect(401);
    await request(app.getHttpServer()).get('/api/v1/social/requests/incoming').expect(401);
    for (const action of ['accept', 'reject'])
      await request(app.getHttpServer())
        .post(`/api/v1/social/requests/missing/${action}`)
        .expect(401);
  });

  it('returns one success and one clean conflict for concurrent duplicate follows', async () => {
    const results = await Promise.all([follow(alice, bob), follow(alice, bob)]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await prisma.followRelationship.count()).toBe(1);
  });

  it('never treats a supplied invalid token as an anonymous visitor', async () => {
    for (const path of ['charlie', 'charlie/followers', 'charlie/following']) {
      for (const authorization of ['', 'Basic credentials', 'Bearer invalid-token']) {
        await request(app.getHttpServer())
          .get(`/api/v1/profiles/${path}`)
          .set('Authorization', authorization)
          .expect(401);
      }
    }
  });

  it.each(['followers', 'following', 'incoming'] as const)(
    'paginates %s through equal timestamps even after the cursor row is removed',
    async (kind) => {
      const users = await Promise.all(['dave', 'eve', 'frank'].map((name) => actor(name)));
      const target = kind === 'incoming' ? bob : charlie;
      const rows = users.map((user, index) => ({
        id: `relationship-${index}`,
        requesterId: kind === 'following' ? target.id : user.id,
        targetId: kind === 'following' ? user.id : target.id,
        status: kind === 'incoming' ? ('PENDING' as const) : ('ACTIVE' as const),
        createdAt: new Date('2026-11-11T10:00:00.000Z'),
      }));
      await prisma.followRelationship.createMany({ data: rows });
      const path =
        kind === 'incoming'
          ? '/api/v1/social/requests/incoming'
          : `/api/v1/profiles/${target.username}/${kind}`;
      const getPage = (cursor?: string) =>
        request(app.getHttpServer())
          .get(path)
          .set('Authorization', `Bearer ${target.token}`)
          .query({ limit: 1, ...(cursor ? { cursor } : {}) });
      const first = await getPage().expect(200);
      expect(first.body.pageInfo.hasMore).toBe(true);
      await prisma.followRelationship.delete({ where: { id: rows[0].id } });
      const second = await getPage(first.body.pageInfo.nextCursor).expect(200);
      const third = await getPage(second.body.pageInfo.nextCursor).expect(200);
      expect(
        [first, second, third].map(
          (page) => page.body.items[0][kind === 'incoming' ? 'requestId' : 'username'],
        ),
      ).toEqual(kind === 'incoming' ? rows.map((row) => row.id) : ['dave', 'eve', 'frank']);
      expect(third.body.pageInfo).toEqual({ hasMore: false, nextCursor: null });
    },
  );

  it('defaults and clamps limits, rejecting malformed queries before persistence', async () => {
    // Many real followers make the default and maximum observable through HTTP.
    for (let index = 0; index < 55; index++) {
      const user = await actor(`bulk${index}`);
      await prisma.followRelationship.create({
        data: { requesterId: user.id, targetId: charlie.id, status: 'ACTIVE' },
      });
    }
    expect((await graph(charlie, 'followers').expect(200)).body.items).toHaveLength(20);
    expect(
      (await graph(charlie, 'followers').query({ limit: 1000 }).expect(200)).body.items,
    ).toHaveLength(50);
    for (const query of [
      { limit: 0 },
      { limit: 'abc' },
      { limit: 50.5 },
      { cursor: 'abc' },
      { cursor: Buffer.from('{}').toString('base64url') },
      { unexpected: 'field' },
    ]) {
      await graph(charlie, 'followers').query(query).expect(400);
    }
  });
});
