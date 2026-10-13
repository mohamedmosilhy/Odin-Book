import { JwtService } from '@nestjs/jwt';
import { JwtAccessTokenService } from './jwt-access-token.service.js';

const TEST_SECRET = 'test-secret-with-at-least-thirty-two-characters';
const OTHER_SECRET = 'other-secret-with-at-least-thirty-two-characters';
const USER_ID = 'user-id';

function createSubject() {
  const jwtService = new JwtService({
    secret: TEST_SECRET,
    signOptions: {
      algorithm: 'HS256',
      expiresIn: '15m',
    },
  });

  return {
    jwtService,
    subject: new JwtAccessTokenService(jwtService),
  };
}

describe('JwtAccessTokenService', () => {
  it('generates a token that verifies to the original user ID', async () => {
    const { subject } = createSubject();

    const token = await subject.generate(USER_ID);

    await expect(subject.verify(token)).resolves.toBe(USER_ID);
  });

  it('generates an HS256 token containing only sub, iat, and exp for a 15-minute lifetime', async () => {
    const { jwtService, subject } = createSubject();

    const token = await subject.generate(USER_ID);
    const decoded = jwtService.decode<{
      sub: string;
      iat: number;
      exp: number;
    }>(token, { complete: true });

    expect(decoded.header.alg).toBe('HS256');
    expect(Object.keys(decoded.payload).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(decoded.payload.sub).toBe(USER_ID);
    expect(decoded.payload.exp - decoded.payload.iat).toBe(15 * 60);
  });

  it('rejects a token signed with a different secret', async () => {
    const { subject } = createSubject();
    const otherJwtService = new JwtService({
      secret: OTHER_SECRET,
      signOptions: {
        algorithm: 'HS256',
        expiresIn: '15m',
      },
    });
    const otherSubject = new JwtAccessTokenService(otherJwtService);
    const token = await subject.generate(USER_ID);

    await expect(otherSubject.verify(token)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const { jwtService, subject } = createSubject();
    const expiredToken = await jwtService.signAsync(
      { sub: USER_ID },
      {
        algorithm: 'HS256',
        expiresIn: -1,
      },
    );

    await expect(subject.verify(expiredToken)).rejects.toThrow();
  });
});
