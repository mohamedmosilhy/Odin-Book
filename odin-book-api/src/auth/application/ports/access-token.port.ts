export interface AccessTokenPort {
  generate(userId: string): Promise<string>;
  verify(token: string): Promise<string>;
}

export const ACCESS_TOKEN = Symbol('ACCESS_TOKEN');
