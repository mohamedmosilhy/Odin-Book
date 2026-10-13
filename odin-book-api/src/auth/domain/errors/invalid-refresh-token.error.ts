class InvalidRefreshTokenError extends Error {
  constructor() {
    super('Please login again.');
    this.name = 'InvalidRefreshTokenError';
  }
}

export { InvalidRefreshTokenError };
