import { registerAs } from '@nestjs/config';

export const throttlerConfig = registerAs('throttler', () => ({
  authLimit: Number(process.env.THROTTLE_AUTH_LIMIT),
  defaultLimit: Number(process.env.THROTTLE_DEFAULT_LIMIT),
}));
