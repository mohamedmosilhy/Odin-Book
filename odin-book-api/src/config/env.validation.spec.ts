import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { validateEnv } from './env.validation.js';

const validEnvironment = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/odinbook',
  JWT_SECRET: 'test-jwt-secret-with-at-least-32-characters',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/google/callback',
  OAUTH_STATE_SECRET: 'test-oauth-state-secret-with-32-characters',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_KEY: 'test-supabase-key',
  FRONTEND_URL: 'http://localhost:5173',
};

describe('environment validation', () => {
  it('accepts an OAuth state secret containing at least 32 characters', () => {
    const result = validateEnv(validEnvironment);

    expect(result.OAUTH_STATE_SECRET).toBe(validEnvironment.OAUTH_STATE_SECRET);
  });

  it('rejects a missing OAuth state secret', () => {
    const { OAUTH_STATE_SECRET: _, ...environmentWithoutSecret } = validEnvironment;

    expect(() => validateEnv(environmentWithoutSecret)).toThrow(/OAUTH_STATE_SECRET/);
  });

  it('rejects an OAuth state secret shorter than 32 characters', () => {
    expect(() =>
      validateEnv({
        ...validEnvironment,
        OAUTH_STATE_SECRET: 'a'.repeat(31),
      }),
    ).toThrow(/OAUTH_STATE_SECRET must be at least 32 characters long/);
  });

  it('accepts an OAuth state secret containing exactly 32 characters', () => {
    const result = validateEnv({
      ...validEnvironment,
      OAUTH_STATE_SECRET: 'a'.repeat(32),
    });

    expect(result.OAUTH_STATE_SECRET).toHaveLength(32);
  });

  it('keeps the committed environment example valid', () => {
    const exampleEnvironment = dotenv.parse(
      readFileSync(new URL('../../.env.example', import.meta.url)),
    );

    expect(() => validateEnv(exampleEnvironment)).not.toThrow();
  });
});
