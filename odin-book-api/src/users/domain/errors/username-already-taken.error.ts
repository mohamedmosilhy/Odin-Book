export class UsernameAlreadyTakenError extends Error {
  constructor() {
    super('Username is already taken');
    this.name = 'UsernameAlreadyTakenError';
  }
}
