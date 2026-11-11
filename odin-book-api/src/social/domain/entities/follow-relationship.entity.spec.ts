import { InvalidRequesterError } from '../errors/invalid-requester.error.js';
import { InvalidStatusError } from '../errors/invalid-status.error.js';
import { InvalidTargetError } from '../errors/invalid-target.error.js';
import { InvalidSameUserError } from '../errors/same-user.error.js';
import { FollowRelationship } from './follow-relationship.entity.js';

describe('FollowRelationship', () => {
  const createdAt = new Date('2026-10-20T10:00:00.000Z');
  const updatedAt = new Date('2026-10-20T10:00:00.000Z');

  afterEach(() => {
    vi.useRealTimers();
  });

  function createRelationship(status: 'PENDING' | 'ACTIVE' = 'PENDING') {
    return new FollowRelationship(
      'relationship-1',
      'requester-1',
      'target-1',
      status,
      createdAt,
      updatedAt,
    );
  }

  describe('construction', () => {
    it.each(['PENDING', 'ACTIVE'] as const)('creates a relationship with %s status', (status) => {
      const relationship = createRelationship(status);

      expect(relationship.getStatus()).toBe(status);
      expect(relationship.getUpdatedAt()).toEqual(updatedAt);
    });

    it('rejects a relationship between the same user', () => {
      expect(
        () =>
          new FollowRelationship(
            'relationship-1',
            'user-1',
            'user-1',
            'PENDING',
            createdAt,
            updatedAt,
          ),
      ).toThrow(InvalidSameUserError);
    });

    it('rejects an unsupported persisted status at runtime', () => {
      expect(
        () =>
          new FollowRelationship(
            'relationship-1',
            'requester-1',
            'target-1',
            'REJECTED' as 'PENDING',
            createdAt,
            updatedAt,
          ),
      ).toThrow(InvalidStatusError);
    });
  });

  describe('accept', () => {
    it('allows the target to activate a pending relationship', () => {
      vi.useFakeTimers();
      const acceptedAt = new Date('2026-10-25T12:00:00.000Z');
      vi.setSystemTime(acceptedAt);
      const relationship = createRelationship('PENDING');

      relationship.accept('target-1');

      expect(relationship.getStatus()).toBe('ACTIVE');
      expect(relationship.getUpdatedAt()).toEqual(acceptedAt);
    });

    it('prevents a user other than the target from accepting', () => {
      const relationship = createRelationship('PENDING');

      expect(() => relationship.accept('unrelated-user')).toThrow(InvalidTargetError);
      expect(relationship.getStatus()).toBe('PENDING');
    });

    it('prevents accepting an already active relationship', () => {
      const relationship = createRelationship('ACTIVE');

      expect(() => relationship.accept('target-1')).toThrow(InvalidStatusError);
      expect(relationship.getStatus()).toBe('ACTIVE');
    });
  });

  describe('reject', () => {
    it('allows the target to authorize deletion of a pending request', () => {
      const relationship = createRelationship('PENDING');

      expect(() => relationship.reject('target-1')).not.toThrow();
      expect(relationship.getStatus()).toBe('PENDING');
    });

    it('prevents a user other than the target from rejecting', () => {
      const relationship = createRelationship('PENDING');

      expect(() => relationship.reject('requester-1')).toThrow(InvalidTargetError);
    });

    it('prevents rejection of an active relationship', () => {
      const relationship = createRelationship('ACTIVE');

      expect(() => relationship.reject('target-1')).toThrow(InvalidStatusError);
    });
  });

  describe('cancel', () => {
    it('allows the requester to authorize deletion of their pending request', () => {
      const relationship = createRelationship('PENDING');

      expect(() => relationship.cancel('requester-1')).not.toThrow();
      expect(relationship.getStatus()).toBe('PENDING');
    });

    it('prevents a user other than the requester from cancelling', () => {
      const relationship = createRelationship('PENDING');

      expect(() => relationship.cancel('target-1')).toThrow(InvalidRequesterError);
    });

    it('prevents cancelling an active relationship', () => {
      const relationship = createRelationship('ACTIVE');

      expect(() => relationship.cancel('requester-1')).toThrow(InvalidStatusError);
    });
  });

  describe('unfollow', () => {
    it('allows the requester to authorize deletion of an active relationship', () => {
      const relationship = createRelationship('ACTIVE');

      expect(() => relationship.unfollow('requester-1')).not.toThrow();
      expect(relationship.getStatus()).toBe('ACTIVE');
    });

    it('prevents a user other than the requester from unfollowing', () => {
      const relationship = createRelationship('ACTIVE');

      expect(() => relationship.unfollow('target-1')).toThrow(InvalidRequesterError);
    });

    it('prevents unfollowing a pending relationship', () => {
      const relationship = createRelationship('PENDING');

      expect(() => relationship.unfollow('requester-1')).toThrow(InvalidStatusError);
    });
  });
});
