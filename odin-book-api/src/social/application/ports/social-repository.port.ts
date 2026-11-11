import { FollowRelationship } from '@social/domain/entities/follow-relationship.entity.js';
import { IncomingFollowResponse } from '../types/incoming-follow-response.js';
import { OutgoingFollowResponse } from '../types/outgoing-follow-response.js';

export type SocialProfileSummary = {
  id: string;
  username: string;
  displayName: string;
  profilePicture: string | null;
};

export type ViewerFollowStatus = 'PENDING' | 'ACTIVE' | 'NONE';
export type FollowStatus = 'PENDING' | 'ACTIVE';

export interface SocialRepositoryPort {
  findByIds(requesterId: string, targetId: string): Promise<FollowRelationship | null>;

  findByRelationshipId(relationshipId: string): Promise<FollowRelationship | null>;

  createFollowRelationship(data: {
    requesterId: string;
    targetId: string;
    status: FollowStatus;
  }): Promise<FollowStatus>;

  saveRelationship(relationship: FollowRelationship): Promise<void>;

  deleteFollowRelationship(relationshipId: string): Promise<void>;

  getPendingFollowRequestsForUser(
    targetId: string,
    query: { cursor: string | null; limit: number },
  ): Promise<IncomingFollowResponse>;

  getFollowedUsersByUserId(
    userId: string,
    query: { cursor: string | null; limit: number },
  ): Promise<OutgoingFollowResponse>;

  getActiveFollowersByUserId(
    userId: string,
    query: { cursor: string | null; limit: number },
  ): Promise<OutgoingFollowResponse>;

  isFollowing(requesterId: string, targetId: string): Promise<boolean>;

  getFollowingCount(userId: string): Promise<number>;

  getFollowerCount(userId: string): Promise<number>;

  getViewerFollowStatus(viewerId: string, targetId: string): Promise<ViewerFollowStatus>;
}

export const SOCIAL_REPOSITORY = Symbol('SOCIAL_REPOSITORY');
