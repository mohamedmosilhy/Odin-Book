import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { SocialPaginationQueryDto } from './social.dto.js';

describe('SocialPaginationQueryDto', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  function parse(query: Record<string, unknown>): Promise<SocialPaginationQueryDto> {
    return pipe.transform(query, {
      type: 'query',
      metatype: SocialPaginationQueryDto,
    });
  }

  it('defaults to 20 items and no cursor when query parameters are omitted', async () => {
    await expect(parse({})).resolves.toEqual({ limit: 20, cursor: null });
  });

  it.each([
    ['1', 1],
    ['20', 20],
    ['50', 50],
    ['51', 50],
    ['1000', 50],
  ])('converts limit %s into %i', async (limit, expected) => {
    await expect(parse({ limit })).resolves.toMatchObject({ limit: expected });
  });

  it.each(['0', '-1', '1.5', '50.5', 'abc', '', 'NaN', 'Infinity', '-Infinity'])(
    'rejects invalid limit %j instead of defaulting or clamping it',
    async (limit) => {
      await expect(parse({ limit })).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('preserves a cursor string for subsequent decoding', async () => {
    const cursor = Buffer.from(
      JSON.stringify({ createdAt: '2026-11-11T10:00:00.000Z', id: 'request-1' }),
    ).toString('base64url');

    await expect(parse({ cursor })).resolves.toEqual({ limit: 20, cursor });
  });

  it.each(['abc', '', '!!!', Buffer.from('{broken-json').toString('base64url')])(
    'rejects malformed encoded cursor %j with a validation error',
    async (cursor) => {
      await expect(parse({ cursor })).rejects.toMatchObject({
        status: 400,
        response: {
          message: expect.arrayContaining(['Invalid pagination cursor']),
        },
      });
    },
  );

  it.each([
    { label: 'empty object', payload: {} },
    { label: 'null', payload: null },
    { label: 'array', payload: [] },
    { label: 'string', payload: 'request-1' },
    { label: 'number', payload: 123 },
    { label: 'missing id', payload: { createdAt: '2026-11-11T10:00:00.000Z' } },
    { label: 'empty id', payload: { id: '', createdAt: '2026-11-11T10:00:00.000Z' } },
    { label: 'blank id', payload: { id: '   ', createdAt: '2026-11-11T10:00:00.000Z' } },
    { label: 'numeric id', payload: { id: 123, createdAt: '2026-11-11T10:00:00.000Z' } },
    { label: 'missing timestamp', payload: { id: 'request-1' } },
    { label: 'null timestamp', payload: { id: 'request-1', createdAt: null } },
    { label: 'numeric timestamp', payload: { id: 'request-1', createdAt: 1794391200000 } },
    { label: 'empty timestamp', payload: { id: 'request-1', createdAt: '' } },
    { label: 'invalid timestamp', payload: { id: 'request-1', createdAt: 'not-a-date' } },
    {
      label: 'invalid month',
      payload: { id: 'request-1', createdAt: '2026-13-11T10:00:00.000Z' },
    },
  ])('rejects a decoded cursor with $label', async ({ payload }) => {
    const cursor = Buffer.from(JSON.stringify(payload)).toString('base64url');

    await expect(parse({ cursor })).rejects.toMatchObject({
      status: 400,
      response: {
        message: expect.arrayContaining(['Invalid pagination cursor']),
      },
    });
  });

  it('allows an explicitly null cursor as the first page', async () => {
    await expect(parse({ cursor: null })).resolves.toEqual({ limit: 20, cursor: null });
  });

  it.each([123, ['cursor-a', 'cursor-b'], { id: 'request-1' }])(
    'rejects a cursor that is not a string: %j',
    async (cursor) => {
      await expect(parse({ cursor })).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rejects unknown query parameters', async () => {
    await expect(parse({ unexpected: 'value' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
