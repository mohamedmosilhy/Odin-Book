import type { AccessTokenPort } from '@auth/application/ports/access-token.port.js';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';

interface TestRequest {
  headers: {
    authorization?: string;
  };
  user?: {
    id: string;
  };
}

describe('AuthGuard', () => {
  const accessTokenPort = {
    generate: vi.fn<AccessTokenPort['generate']>(),
    verify: vi.fn<AccessTokenPort['verify']>(),
  };

  function createContext(request: TestRequest): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a valid bearer token and attaches the authenticated user to the request', async () => {
    const request: TestRequest = {
      headers: { authorization: 'Bearer valid-access-token' },
    };
    accessTokenPort.verify.mockResolvedValue('user-id');
    const guard = new AuthGuard(accessTokenPort);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(accessTokenPort.verify).toHaveBeenCalledWith('valid-access-token');
    expect(request.user).toEqual({ id: 'user-id' });
  });

  it('rejects a request with no authorization header', async () => {
    const guard = new AuthGuard(accessTokenPort);

    await expect(
      guard.canActivate(createContext({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(accessTokenPort.verify).not.toHaveBeenCalled();
  });

  it.each(['Basic credentials', 'Bearer', 'Bearer   '])(
    'rejects the malformed authorization header %j',
    async (authorization) => {
      const guard = new AuthGuard(accessTokenPort);

      await expect(
        guard.canActivate(createContext({ headers: { authorization } })),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(accessTokenPort.verify).not.toHaveBeenCalled();
    },
  );

  it('converts access-token verification failures into UnauthorizedException', async () => {
    accessTokenPort.verify.mockRejectedValue(new Error('jwt expired'));
    const guard = new AuthGuard(accessTokenPort);

    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: 'Bearer expired-access-token' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
