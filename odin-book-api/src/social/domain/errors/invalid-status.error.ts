export class InvalidStatusError extends Error {
  constructor(message: string) {
    super(`Invalid status: ${message}`);
    this.name = 'InvalidStatusError';
  }
}
