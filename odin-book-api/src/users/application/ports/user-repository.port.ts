import { User } from '../../domain/entities/user.entity.js';

export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
