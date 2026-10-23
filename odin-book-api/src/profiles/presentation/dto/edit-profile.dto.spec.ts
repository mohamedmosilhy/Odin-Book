import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EditProfileDto } from './edit-profile.dto.js';

function constraintsFor(
  errors: Awaited<ReturnType<typeof validate>>,
  property: string,
): Record<string, string> {
  return errors.find((error) => error.property === property)?.constraints ?? {};
}

describe('EditProfileDto', () => {
  it('accepts an empty partial update and every valid editable field', async () => {
    const emptyDto = plainToInstance(EditProfileDto, {});
    const completeDto = plainToInstance(EditProfileDto, {
      displayName: 'Jane Doe',
      bio: 'Hello there',
      visibility: 'PRIVATE',
    });

    await expect(validate(emptyDto)).resolves.toHaveLength(0);
    await expect(validate(completeDto)).resolves.toHaveLength(0);
  });

  it('accepts null as an explicit request to clear the biography', async () => {
    const dto = plainToInstance(EditProfileDto, { bio: null });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('enforces display-name and biography lengths', async () => {
    const dto = plainToInstance(EditProfileDto, {
      displayName: '',
      bio: 'x'.repeat(301),
    });

    const errors = await validate(dto);

    expect(constraintsFor(errors, 'displayName')).toHaveProperty('isLength');
    expect(constraintsFor(errors, 'bio')).toHaveProperty('maxLength');
  });

  it('rejects unsupported visibility values', async () => {
    const dto = plainToInstance(EditProfileDto, { visibility: 'FRIENDS_ONLY' });

    expect(constraintsFor(await validate(dto), 'visibility')).toHaveProperty('isIn');
  });

  it('rejects fields outside the PATCH contract under the global validation policy', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    await expect(
      pipe.transform(
        { displayName: 'Jane', username: 'hijacked-name', userId: 'other-user' },
        { type: 'body', metatype: EditProfileDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
