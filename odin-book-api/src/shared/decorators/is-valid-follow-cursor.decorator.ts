import { decodeFollowCursor } from '../pagination/follow-cursor.js';
import { registerDecorator, type ValidationOptions } from 'class-validator';

export function IsValidFollowCursor(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidFollowCursor',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;

          try {
            decodeFollowCursor(value);
            return true;
          } catch {
            return false;
          }
        },

        defaultMessage(): string {
          return 'Cursor must contain a valid encoded id and createdAt timestamp';
        },
      },
    });
  };
}
