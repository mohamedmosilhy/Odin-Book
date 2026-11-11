export class InvalidSameUserError extends Error {
  constructor() {
    super(`Users cannot follow themselves`);
    this.name = 'InvalidSameUserError';
  }
}
