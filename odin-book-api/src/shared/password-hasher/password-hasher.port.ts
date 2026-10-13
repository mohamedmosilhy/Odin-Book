export interface PasswordHasherPort {
  hash(password: string): Promise<string>;
  verify(plainText: string, hash: string): Promise<boolean>;
}
