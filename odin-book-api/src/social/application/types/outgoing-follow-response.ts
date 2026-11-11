export type OutgoingFollowResponse = {
  items: {
    id: string;
    username: string;
    displayName: string;
    profilePicture: string | null;
  }[];
  pageInfo: {
    nextCursor: string | null;
    hasMore: boolean;
  };
};
