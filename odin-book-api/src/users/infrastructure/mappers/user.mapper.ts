import { User } from '@users/domain/entities/user.entity.js';

export class UserMapper {
  static toDomain(user: {
    id: string;
    email: string;
    passwordHash: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(user.id, user.email, user.passwordHash, user.createdAt, user.updatedAt);
  }
}
