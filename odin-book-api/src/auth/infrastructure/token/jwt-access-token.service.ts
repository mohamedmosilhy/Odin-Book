import { AccessTokenPort } from '@auth/application/ports/access-token.port.js';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAccessTokenService implements AccessTokenPort {
  constructor(private readonly jwtService: JwtService) {}

  async generate(userId: string): Promise<string> {
    // Implementation for generating JWT access token
    return await this.jwtService.signAsync({ sub: userId });
  }

  async verify(token: string): Promise<string> {
    // Implementation for verifying JWT access token
    return this.jwtService.verify(token).sub;
  }
}
