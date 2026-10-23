export class ProfileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileNotFoundError';
  }
}
