import * as z from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .url()
    .regex(
      /^postgres(?:ql)?:\/\//i,
      'DATABASE_URL must use the postgres:// or postgresql:// protocol',
    ),
  JWT_SECRET: z.string().trim().min(32, 'JWT_SECRET must contain at least 32 characters'),
  JWT_ACCESS_TOKEN_TTL: z
    .string()
    .trim()
    .nonempty()
    .regex(
      /^[1-9]\d*(?:ms|s|m|h|d)$/,
      'JWT_ACCESS_TOKEN_TTL must be a positive duration (e.g., 15m, 1h, or 1d)',
    )
    .default('15m'),
  JWT_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(30),

  GOOGLE_CLIENT_ID: z.string().trim().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().trim().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  GOOGLE_CALLBACK_URL: z.url(),
  SUPABASE_URL: z.url(),
  SUPABASE_KEY: z.string().trim().min(1, 'SUPABASE_KEY is required'),
  FRONTEND_URL: z.url().refine(
    (value) => {
      try {
        const url = new URL(value);

        return (
          ['http:', 'https:'].includes(url.protocol) &&
          url.pathname === '/' &&
          url.search === '' &&
          url.hash === ''
        );
      } catch {
        return false;
      }
    },
    {
      message: 'FRONTEND_URL must be an origin only (protocol, hostname, and optional port)',
    },
  ),
  THROTTLE_AUTH_LIMIT: z.coerce.number().int().min(1).default(5),
  THROTTLE_DEFAULT_LIMIT: z.coerce.number().int().min(1).default(100),
});

export function validateEnv(env: Record<string, string | undefined>) {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const message = z.prettifyError(result.error);
    throw new Error(`Environment validation error:\n${message}`);
  }

  return result.data;
}
