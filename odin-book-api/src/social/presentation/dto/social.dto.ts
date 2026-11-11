import { IsValidFollowCursor } from '@shared/decorators/is-valid-follow-cursor.decorator.js';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SocialPaginationQueryDto {
  @Transform(({ value }) => {
    if (value === undefined) return 20;

    if (typeof value !== 'string' && typeof value !== 'number') return Number.NaN;

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
      return parsed;
    }

    return Math.min(parsed, 50);
  })
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit: number = 20;

  @Transform(({ value }) => value ?? null)
  @IsOptional()
  @IsString({ message: 'Cursor must be a string' })
  @IsValidFollowCursor({
    message: 'Invalid pagination cursor',
  })
  cursor: string | null = null;
}
