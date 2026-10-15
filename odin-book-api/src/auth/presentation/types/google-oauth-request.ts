import type { Request } from 'express';
import type { GoogleProfile } from '@auth/application/types/google-profile.js';

export interface GoogleOAuthRequest extends Request {
  user: GoogleProfile;
}
