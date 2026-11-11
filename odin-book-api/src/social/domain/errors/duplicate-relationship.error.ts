class DuplicateRelationshipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateRelationshipError';
  }
}

export { DuplicateRelationshipError };
