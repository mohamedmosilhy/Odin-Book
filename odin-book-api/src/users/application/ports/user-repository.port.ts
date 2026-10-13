import { User } from '../../domain/entities/user.entity.js';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: CreateUserData): Promise<User>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
