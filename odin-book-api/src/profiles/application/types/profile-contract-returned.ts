export type ProfileContractReturned = {
  followerCount: number;
  followingCount: number;
  followStatus: 'NONE' | 'PENDING' | 'ACTIVE';
  posts: [];
  username: string;
  displayName: string;
  bio: string | null;
  profilePicture: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
};
