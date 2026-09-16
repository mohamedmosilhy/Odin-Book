# Odin-Book — Clean Architecture Guide

**Phase:** 3 — Architecture

This is the pattern every module follows, without exception. It exists so
that any module in the codebase is navigable the same way, and so business
logic (`domain` + `application`) can be unit-tested with zero database,
zero HTTP, zero NestJS bootstrapping required.

---

## 1. The Four Layers

```
domain/            zero framework imports. Plain TypeScript. Entities +
                    business rules + domain errors. Could theoretically be
                    copy-pasted into a non-NestJS project unchanged.

application/        use cases (one class per user-facing operation) +
                    repository PORTS (interfaces). Depends on domain only.
                    Does not know Prisma exists.

infrastructure/      PORT implementations (Prisma repositories), external
                    service adapters (Supabase, etc.), and mappers between
                    Prisma models and domain entities.

presentation/         NestJS controllers + DTOs. Calls use cases. Never
                    calls a repository directly.
```

**The Dependency Rule:** arrows only point inward.
`presentation → application → domain`, and `infrastructure → application`
(implementing its ports) `→ domain`. `domain` depends on nothing.
`infrastructure` is the only layer allowed to import Prisma, Supabase SDKs,
or any external library that talks to the outside world.

---

## 2. Folder Structure (per module)

Using `ContentModule` as the worked example — every other module mirrors
this shape exactly, just with fewer entities.

```
content/
├── domain/
│   ├── entities/
│   │   ├── post.entity.ts
│   │   ├── comment.entity.ts
│   │   ├── like.entity.ts
│   │   └── post-image.entity.ts
│   └── errors/
│       ├── not-post-owner.error.ts
│       └── post-not-found.error.ts
│
├── application/
│   ├── use-cases/
│   │   ├── posts/
│   │   │   ├── create-post.use-case.ts
│   │   │   ├── edit-post.use-case.ts
│   │   │   ├── delete-post.use-case.ts
│   │   │   └── get-posts-by-author.use-case.ts
│   │   ├── comments/
│   │   │   ├── create-comment.use-case.ts
│   │   │   └── delete-comment.use-case.ts
│   │   └── likes/
│   │       ├── like-post.use-case.ts
│   │       └── unlike-post.use-case.ts
│   └── ports/
│       ├── post-repository.port.ts
│       ├── comment-repository.port.ts
│       ├── like-repository.port.ts
│       └── image-storage.port.ts        (re-exported from StorageModule)
│
├── infrastructure/
│   ├── persistence/
│   │   ├── prisma-post.repository.ts
│   │   ├── prisma-comment.repository.ts
│   │   └── prisma-like.repository.ts
│   └── mappers/
│       ├── post.mapper.ts
│       ├── comment.mapper.ts
│       └── like.mapper.ts
│
├── presentation/
│   ├── controllers/
│   │   ├── posts.controller.ts
│   │   ├── comments.controller.ts
│   │   └── likes.controller.ts
│   └── dto/
│       ├── create-post.dto.ts
│       ├── create-comment.dto.ts
│       └── post-response.dto.ts
│
└── content.module.ts
```

---

## 3. Worked Example — Create Post, Top to Bottom

**Domain entity** (`domain/entities/post.entity.ts`) — a plain class with
behavior, not a Prisma model:

```
class Post {
  constructor(
    readonly id: string,
    readonly authorId: string,
    private content: string,
    readonly createdAt: Date,
    private deletedAt: Date | null,
  ) {}

  canBeEditedBy(userId: string): boolean {
    return this.authorId === userId && !this.deletedAt;
  }

  edit(userId: string, newContent: string): void {
    if (!this.canBeEditedBy(userId)) throw new NotPostOwnerError();
    this.content = newContent;
  }
}
```

**Port** (`application/ports/post-repository.port.ts`) — interface only:

```
interface PostRepositoryPort {
  save(post: Post): Promise<void>;
  findById(id: string): Promise<Post | null>;
  findByAuthor(authorId: string): Promise<Post[]>;
}

const POST_REPOSITORY = Symbol('POST_REPOSITORY');   // DI token
```

**Use case** (`application/use-cases/posts/create-post.use-case.ts`) —
depends only on the port, never on Prisma:

```
class CreatePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepositoryPort,
  ) {}

  async execute(authorId: string, content: string): Promise<Post> {
    const post = Post.create(authorId, content);   // domain factory
    await this.postRepo.save(post);
    // emits PostCreatedEvent — see cross-cutting-concerns.md
    return post;
  }
}
```

**Adapter** (`infrastructure/persistence/prisma-post.repository.ts`) —
the only place Prisma is imported:

```
@Injectable()
class PrismaPostRepository implements PostRepositoryPort {
  constructor(private prisma: PrismaService) {}

  async save(post: Post): Promise<void> {
    await this.prisma.post.create({ data: PostMapper.toPersistence(post) });
  }

  async findById(id: string): Promise<Post | null> {
    const row = await this.prisma.post.findUnique({ where: { id } });
    return row ? PostMapper.toDomain(row) : null;
  }
  // ...
}
```

**Wiring** (`content.module.ts`):

```
@Module({
  providers: [
    CreatePostUseCase,
    { provide: POST_REPOSITORY, useClass: PrismaPostRepository },
  ],
  controllers: [PostsController],
  exports: [GetPostsByAuthorUseCase],
})
class ContentModule {}
```

**Controller** (`presentation/controllers/posts.controller.ts`) — thin,
no business logic:

```
@Controller('posts')
class PostsController {
  constructor(private readonly createPost: CreatePostUseCase) {}

  @Post()
  async create(@Body() dto: CreatePostDto, @CurrentUser() userId: string) {
    return this.createPost.execute(userId, dto.content);
  }
}
```

---

## 4. Why This Is Worth the Overhead Here

- `CreatePostUseCase` is unit-testable with an in-memory fake implementing
  `PostRepositoryPort` — no database, no NestJS TestingModule bootstrap
  needed for the core logic.
- Swapping Supabase for S3 later touches only `StorageModule`'s
  `infrastructure/` folder — zero changes to any `application` or `domain`
  code anywhere in the codebase.
- Domain entities encode their own rules (`canBeEditedBy`) instead of that
  logic being scattered across services — directly traceable back to
  `invariants.md` from Phase 2.

## 5. Naming Conventions (apply everywhere)

| Layer | Suffix |
|---|---|
| Entity | `.entity.ts` |
| Use case | `.use-case.ts`, class name ends in `UseCase` |
| Port | `.port.ts`, interface name ends in `Port` |
| Repository implementation | `.repository.ts`, class name starts with `Prisma` |
| Mapper | `.mapper.ts`, static class with `toDomain`/`toPersistence` |
| DTO | `.dto.ts` |
| Domain error | `.error.ts`, extends a base `DomainError` |
