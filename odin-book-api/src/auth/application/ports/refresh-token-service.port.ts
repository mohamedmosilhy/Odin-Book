export interface RefreshTokenServicePort {
  generate(): Promise<string>;
  hash(token: string): Promise<string>;
  generateFamilyId(): Promise<string>;
  getExpirationDate(): Promise<Date>;
}

const REFRESH_TOKEN_SERVICE = Symbol('REFRESH_TOKEN_SERVICE');

export { REFRESH_TOKEN_SERVICE };
