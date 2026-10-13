import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto.js';
import { RegisterDto } from './register.dto.js';

function constraintsFor(
  errors: Awaited<ReturnType<typeof validate>>,
  property: string,
): Record<string, string> {
  return errors.find((error) => error.property === property)?.constraints ?? {};
}

describe('RegisterDto', () => {
  it('accepts a valid email and a password containing a letter and number', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'person@example.com',
      password: 'password1',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('requires email to be a string in valid email format with at most 255 characters', async () => {
    const nonStringEmail = plainToInstance(RegisterDto, {
      email: 123,
      password: 'password1',
    });
    const longEmail = plainToInstance(RegisterDto, {
      email: `${'a'.repeat(250)}@example.com`,
      password: 'password1',
    });

    const nonStringErrors = await validate(nonStringEmail);
    const longEmailErrors = await validate(longEmail);

    expect(constraintsFor(nonStringErrors, 'email')).toHaveProperty('isString');
    expect(constraintsFor(longEmailErrors, 'email')).toHaveProperty('maxLength');
  });

  it('rejects passwords shorter than eight characters or missing a letter or number', async () => {
    const shortPassword = plainToInstance(RegisterDto, {
      email: 'person@example.com',
      password: 'pass1',
    });
    const missingNumber = plainToInstance(RegisterDto, {
      email: 'person@example.com',
      password: 'password',
    });
    const missingLetter = plainToInstance(RegisterDto, {
      email: 'person@example.com',
      password: '12345678',
    });

    expect(constraintsFor(await validate(shortPassword), 'password')).toHaveProperty(
      'minLength',
    );
    expect(constraintsFor(await validate(missingNumber), 'password')).toHaveProperty('matches');
    expect(constraintsFor(await validate(missingLetter), 'password')).toHaveProperty('matches');
  });

  it('does not impose an undocumented maximum password length', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'person@example.com',
      password: `${'a'.repeat(150)}1`,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});

describe('LoginDto', () => {
  it('accepts any non-empty string password without applying the registration policy', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'person@example.com',
      password: 'x',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects an invalid email or a missing password', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'not-an-email',
    });

    const errors = await validate(dto);

    expect(constraintsFor(errors, 'email')).toHaveProperty('isEmail');
    expect(constraintsFor(errors, 'password')).toHaveProperty('isString');
  });
});
