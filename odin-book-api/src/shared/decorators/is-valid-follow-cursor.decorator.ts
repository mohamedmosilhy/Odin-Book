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
            const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

            return (
              typeof decoded === 'object' &&
              decoded !== null &&
              !Array.isArray(decoded) &&
              typeof decoded.id === 'string' &&
              decoded.id.trim().length > 0 &&
              typeof decoded.createdAt === 'string' &&
              !Number.isNaN(Date.parse(decoded.createdAt))
            );
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
