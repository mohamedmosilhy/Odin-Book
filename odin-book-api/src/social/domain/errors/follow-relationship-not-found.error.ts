class FollowRelationshipNotFoundError extends Error {
  constructor(message?: string) {
    super(message || 'Follow relationship not found.');
    this.name = 'FollowRelationshipNotFoundError';
  }
}

export { FollowRelationshipNotFoundError };
