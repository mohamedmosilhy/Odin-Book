export class User {
  constructor(
    readonly id: string,
    readonly email: string,
    private passwordHash: string | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
