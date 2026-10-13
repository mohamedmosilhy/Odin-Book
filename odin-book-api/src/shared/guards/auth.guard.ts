import { ACCESS_TOKEN, type AccessTokenPort } from '@auth/application/ports/access-token.port.js';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(ACCESS_TOKEN)
    private readonly accessTokenPort: AccessTokenPort,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authorization = request.headers.authorization;

    if (typeof authorization !== 'string' || !/^Bearer [^\s]+$/.test(authorization)) {
      throw new UnauthorizedException('Authorization header must use Bearer <token> format');
    }

    const accessToken = authorization.split(' ')[1];

    try {
      const userId = await this.accessTokenPort.verify(accessToken);

      request.user = { id: userId };
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    return true;
  }
}
