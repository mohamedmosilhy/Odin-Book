import { InvalidRequesterError } from '../errors/invalid-requester.error.js';
import { InvalidStatusError } from '../errors/invalid-status.error.js';
import { InvalidTargetError } from '../errors/invalid-target.error.js';
import { InvalidSameUserError } from '../errors/same-user.error.js';

export class FollowRelationship {
  constructor(
    public readonly id: string,
    public readonly requesterId: string,
    public readonly targetId: string,
    private status: 'PENDING' | 'ACTIVE',
    public readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    if (requesterId === targetId) {
      throw new InvalidSameUserError();
    }

    if (!['PENDING', 'ACTIVE'].includes(status)) {
      throw new InvalidStatusError(status);
    }
  }

  getStatus(): 'PENDING' | 'ACTIVE' {
    return this.status;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  accept(actorId: string): void {
    if (this.status === 'ACTIVE') {
      throw new InvalidStatusError('Follow relationship is already active');
    }
    this.ensureValidTargetId(actorId);

    this.status = 'ACTIVE';
    this.updatedAt = new Date();
  }

  reject(actorId: string): void {
    if (this.status !== 'PENDING') {
      throw new InvalidStatusError('Only pending follow requests can be rejected');
    }
    this.ensureValidTargetId(actorId);
  }

  cancel(actorId: string): void {
    if (this.status !== 'PENDING') {
      throw new InvalidStatusError('Only pending follow requests can be canceled');
    }
    this.ensureValidRequesterId(actorId);
  }

  unfollow(actorId: string): void {
    if (this.status !== 'ACTIVE') {
      throw new InvalidStatusError('Only active follow relationships can be unfollowed');
    }
    this.ensureValidRequesterId(actorId);
  }

  private ensureValidTargetId(actorId: string): void {
    if (actorId !== this.targetId) {
      throw new InvalidTargetError();
    }
  }

  private ensureValidRequesterId(actorId: string): void {
    if (actorId !== this.requesterId) {
      throw new InvalidRequesterError();
    }
  }
}
