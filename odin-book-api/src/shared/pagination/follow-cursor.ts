export type FollowCursor = { createdAt: string; id: string };

export class InvalidFollowCursorError extends Error {
  constructor() {
    super('Invalid pagination cursor');
    this.name = 'InvalidFollowCursorError';
  }
}

export function decodeFollowCursor(value: unknown): FollowCursor {
  try {
    if (typeof value !== 'string' || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(value)) {
      throw new InvalidFollowCursorError();
    }
    const buffer = Buffer.from(value, 'base64url');
    const normalized = value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (buffer.toString('base64url') !== normalized) throw new InvalidFollowCursorError();
    const decoded: unknown = JSON.parse(buffer.toString('utf8'));
    if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
      throw new InvalidFollowCursorError();
    }
    const { id, createdAt } = decoded as Record<string, unknown>;
    if (
      typeof id !== 'string' ||
      id.trim().length === 0 ||
      typeof createdAt !== 'string' ||
      !Number.isFinite(Date.parse(createdAt)) ||
      new Date(createdAt).toISOString() !== createdAt
    ) {
      throw new InvalidFollowCursorError();
    }
    return { id, createdAt };
  } catch {
    throw new InvalidFollowCursorError();
  }
}
