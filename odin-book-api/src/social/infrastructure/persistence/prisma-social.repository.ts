import { decodeFollowCursor } from '@shared/pagination/follow-cursor.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import {
  FollowStatus,
  SocialRepositoryPort,
  ViewerFollowStatus,
} from '@social/application/ports/social-repository.port.js';
import { FollowRelationship } from '@social/domain/entities/follow-relationship.entity.js';
import { SocialMapper } from '../mappers/social.mapper.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { DuplicateRelationshipError } from '@social/domain/errors/duplicate-relationship.error.js';
import { IncomingFollowResponse } from '@social/application/types/incoming-follow-response.js';
import { OutgoingFollowResponse } from '@social/application/types/outgoing-follow-response.js';

@Injectable()
export class PrismaSocialRepository implements SocialRepositoryPort {
  constructor(public readonly prismaService: PrismaService) {}

  async findByIds(requesterId: string, targetId: string): Promise<FollowRelationship | null> {
    const followRelationship = await this.prismaService.followRelationship.findUnique({
      where: {
        requesterId_targetId: {
          requesterId,
          targetId,
        },
      },
    });
    if (!followRelationship) {
      return null;
    }
    return SocialMapper.toDomain(followRelationship);
  }

  async findByRelationshipId(relationshipId: string): Promise<FollowRelationship | null> {
    const followRelationship = await this.prismaService.followRelationship.findUnique({
      where: {
        id: relationshipId,
      },
    });
    if (!followRelationship) {
      return null;
    }
    return SocialMapper.toDomain(followRelationship);
  }

  async createFollowRelationship(data: {
    requesterId: string;
    targetId: string;
    status: FollowStatus;
  }): Promise<FollowStatus> {
    try {
      const followRelationship = await this.prismaService.followRelationship.create({
        data: {
          requesterId: data.requesterId,
          targetId: data.targetId,
          status: data.status,
        },
      });
      return followRelationship.status;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DuplicateRelationshipError('Duplicate relationship');
      }
      throw error;
    }
  }

  async saveRelationship(relationship: FollowRelationship): Promise<void> {
    await this.prismaService.followRelationship.update({
      where: {
        id: relationship.id,
      },
      data: {
        status: relationship.getStatus(),
        updatedAt: relationship.getUpdatedAt(),
      },
    });
  }

  async deleteFollowRelationship(relationshipId: string): Promise<void> {
    await this.prismaService.followRelationship.delete({
      where: {
        id: relationshipId,
      },
    });
  }

  async getPendingFollowRequestsForUser(
    targetId: string,
    query: { cursor: string | null; limit: number },
  ): Promise<IncomingFollowResponse> {
    const decodedCursor = query.cursor == null ? null : decodeFollowCursor(query.cursor);

    const pendingRequests = await this.prismaService.followRelationship.findMany({
      where: {
        targetId,
        status: 'PENDING',
        ...(decodedCursor
          ? {
              OR: [
                { createdAt: { gt: new Date(decodedCursor.createdAt) } },
                { createdAt: new Date(decodedCursor.createdAt), id: { gt: decodedCursor.id } },
              ],
            }
          : {}),
      },
      take: query.limit + 1,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        requester: {
          include: {
            profile: true,
          },
        },
      },
    });

    const hasMore = pendingRequests.length > query.limit;
    const items = pendingRequests.slice(0, query.limit);

    const lastItem = items[items.length - 1];

    const nextCursor =
      hasMore && lastItem
        ? Buffer.from(
            JSON.stringify({
              createdAt: lastItem.createdAt.toISOString(),
              id: lastItem.id,
            }),
          ).toString('base64url')
        : null;

    return {
      items: items.map((request) => ({
        requestId: request.id,
        requester: {
          username: request.requester.profile!.username,
          displayName: request.requester.profile!.displayName,
          profilePicture: request.requester.profile!.profilePicture,
        },
        createdAt: request.createdAt,
      })),
      pageInfo: {
        nextCursor,
        hasMore,
      },
    };
  }

  async getFollowedUsersByUserId(
    userId: string,
    query: { cursor: string | null; limit: number },
  ): Promise<OutgoingFollowResponse> {
    const decodedCursor = query.cursor == null ? null : decodeFollowCursor(query.cursor);

    const followedUsers = await this.prismaService.followRelationship.findMany({
      where: {
        requesterId: userId,
        status: 'ACTIVE',
        ...(decodedCursor
          ? {
              OR: [
                { createdAt: { gt: new Date(decodedCursor.createdAt) } },
                { createdAt: new Date(decodedCursor.createdAt), id: { gt: decodedCursor.id } },
              ],
            }
          : {}),
      },
      include: {
        target: {
          include: {
            profile: true,
          },
        },
      },
      take: query.limit + 1,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const hasMore = followedUsers.length > query.limit;
    const items = followedUsers.slice(0, query.limit);

    const lastItem = items[items.length - 1];

    const nextCursor =
      hasMore && lastItem
        ? Buffer.from(
            JSON.stringify({
              createdAt: lastItem.createdAt.toISOString(),
              id: lastItem.id,
            }),
          ).toString('base64url')
        : null;

    return {
      items: items.map((request) => ({
        id: request.target.profile!.id,
        username: request.target.profile!.username,
        displayName: request.target.profile!.displayName,
        profilePicture: request.target.profile!.profilePicture,
      })),
      pageInfo: {
        nextCursor,
        hasMore,
      },
    };
  }

  async getActiveFollowersByUserId(
    userId: string,
    query: { cursor: string | null; limit: number },
  ): Promise<OutgoingFollowResponse> {
    const decodedCursor = query.cursor == null ? null : decodeFollowCursor(query.cursor);

    const activeFollowers = await this.prismaService.followRelationship.findMany({
      where: {
        targetId: userId,
        status: 'ACTIVE',
        ...(decodedCursor
          ? {
              OR: [
                { createdAt: { gt: new Date(decodedCursor.createdAt) } },
                { createdAt: new Date(decodedCursor.createdAt), id: { gt: decodedCursor.id } },
              ],
            }
          : {}),
      },

      take: query.limit + 1,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],

      include: {
        requester: {
          include: {
            profile: true,
          },
        },
      },
    });

    const hasMore = activeFollowers.length > query.limit;
    const items = activeFollowers.slice(0, query.limit);

    const lastItem = items[items.length - 1];

    const nextCursor =
      hasMore && lastItem
        ? Buffer.from(
            JSON.stringify({
              createdAt: lastItem.createdAt.toISOString(),
              id: lastItem.id,
            }),
          ).toString('base64url')
        : null;

    return {
      items: items.map((request) => ({
        id: request.requester.profile!.id,
        username: request.requester.profile!.username,
        displayName: request.requester.profile!.displayName,
        profilePicture: request.requester.profile!.profilePicture,
      })),
      pageInfo: {
        nextCursor,
        hasMore,
      },
    };
  }

  async isFollowing(requesterId: string, targetId: string): Promise<boolean> {
    const followRelationship = await this.prismaService.followRelationship.findUnique({
      where: {
        requesterId_targetId: {
          requesterId,
          targetId,
        },
      },
    });

    return followRelationship === null ? false : followRelationship.status === 'ACTIVE';
  }

  async getFollowingCount(userId: string): Promise<number> {
    return await this.prismaService.followRelationship.count({
      where: {
        requesterId: userId,
        status: 'ACTIVE',
      },
    });
  }

  async getFollowerCount(userId: string): Promise<number> {
    return await this.prismaService.followRelationship.count({
      where: {
        targetId: userId,
        status: 'ACTIVE',
      },
    });
  }

  async getViewerFollowStatus(viewerId: string, targetId: string): Promise<ViewerFollowStatus> {
    const followRelationship = await this.prismaService.followRelationship.findUnique({
      where: {
        requesterId_targetId: {
          requesterId: viewerId,
          targetId,
        },
      },
    });

    if (!followRelationship) {
      return 'NONE';
    }

    return followRelationship.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING';
  }
}
