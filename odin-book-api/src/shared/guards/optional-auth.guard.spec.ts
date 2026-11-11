import type { AccessTokenPort } from '@auth/application/ports/access-token.port.js';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { OptionalAuthGuard } from './optional-auth.guard.js';

describe('OptionalAuthGuard', () => {
  function setup(authorization?: unknown) {
    const request: { headers: { authorization?: unknown }; user?: { id: string } } = {
      headers: authorization === undefined ? {} : { authorization },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const tokenPort = {
      generate: vi.fn<AccessTokenPort['generate']>(),
      verify: vi.fn<AccessTokenPort['verify']>(),
    };
    return { request, context, tokenPort, guard: new OptionalAuthGuard(tokenPort) };
  }

  it('allows an anonymous visitor without verifying a token or attaching a user', async () => {
    const { guard, context, request, tokenPort } = setup();
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(tokenPort.verify).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  it('attaches the verified viewer identity', async () => {
    const { guard, context, request, tokenPort } = setup('Bearer valid-token');
    tokenPort.verify.mockResolvedValue('viewer-1');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(tokenPort.verify).toHaveBeenCalledWith('valid-token');
    expect(request.user).toEqual({ id: 'viewer-1' });
  });

  it.each([
    '',
    'Basic credentials',
    'Bearer',
    'Bearer ',
    'Bearer token extra',
    ['Bearer token'],
    null,
  ])('rejects a supplied malformed authorization header %j', async (header) => {
    const { guard, context, request, tokenPort } = setup(header);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokenPort.verify).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  it.each(['invalid signature', 'jwt expired'])(
    'rejects token verification failure: %s',
    async (reason) => {
      const { guard, context, request, tokenPort } = setup('Bearer bad-token');
      tokenPort.verify.mockRejectedValue(new Error(reason));
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(request.user).toBeUndefined();
    },
  );
});
