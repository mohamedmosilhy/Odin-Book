class InvalidRequesterError extends Error {
  constructor() {
    super(`Invalid requester user`);
    this.name = 'InvalidRequesterError';
  }
}

export { InvalidRequesterError };
