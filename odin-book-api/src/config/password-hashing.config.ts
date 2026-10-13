import { registerAs } from '@nestjs/config';

export const passwordHashingConfig = registerAs('passwordHashing', () => ({
  memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 19456),
  timeCost: Number(process.env.ARGON2_TIME_COST ?? 2),
  parallelism: Number(process.env.ARGON2_PARALLELISM ?? 1),
}));
