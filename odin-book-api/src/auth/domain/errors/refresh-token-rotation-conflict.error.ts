class RefreshTokenRotationConflictError extends Error {
  constructor() {
    super('Refresh token rotation conflict: the provided refresh token has already been rotated.');
    this.name = 'RefreshTokenRotationConflictError';
  }
}

export { RefreshTokenRotationConflictError };
