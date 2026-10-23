export class Profile {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly displayName: string,
    public readonly bio: string | null,
    public readonly profilePicture: string | null,
    public readonly visibility: 'PUBLIC' | 'PRIVATE',
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
