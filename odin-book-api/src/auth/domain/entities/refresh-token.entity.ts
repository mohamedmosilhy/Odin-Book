export class RefreshToken {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly tokenHash: string,
    readonly familyId: string,
    readonly expiresAt: Date,
    readonly createdAt: Date,
    readonly revokedAt: Date | null,
    readonly replacedByTokenHash: string | null,
  ) {}
}
