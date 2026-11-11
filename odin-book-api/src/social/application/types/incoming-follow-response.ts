export type IncomingFollowResponse = {
  items: {
    requestId: string;
    requester: {
      username: string;
      displayName: string;
      profilePicture: string | null;
    };
    createdAt: Date;
  }[];
  pageInfo: {
    nextCursor: string | null;
    hasMore: boolean;
  };
};
