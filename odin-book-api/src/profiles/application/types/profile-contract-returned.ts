export type ProfileContractReturned = {
  followerCount: 0;
  followingCount: 0;
  followStatus: 'NONE';
  posts: [];
  username: string;
  displayName: string;
  bio: string | null;
  profilePicture: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
};
