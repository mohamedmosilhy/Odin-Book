import { registerAs } from '@nestjs/config';

export const corsConfig = registerAs('cors', () => ({
  frontendUrl: process.env.FRONTEND_URL!,
}));
