export type ProfilePartialUpdate = {
  displayName?: string;
  bio?: string | null;
  visibility?: 'PUBLIC' | 'PRIVATE';
};
