class InvalidTargetError extends Error {
  constructor() {
    super(`Invalid target user`);
    this.name = 'InvalidTargetError';
  }
}

export { InvalidTargetError };
