export class ExternalIdentity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly provider: 'GOOGLE',
    public readonly providerUserId: string,
    public readonly createdAt: Date,
  ) {}
}
