import { registerAs } from '@nestjs/config';

export const storageConfig = registerAs('storage', () => ({
  url: process.env.SUPABASE_URL!,
  key: process.env.SUPABASE_KEY!,
}));
