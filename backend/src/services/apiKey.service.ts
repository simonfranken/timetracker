import { createHash, randomUUID } from 'crypto';
import { prisma } from '../prisma/client';
import { NotFoundError } from '../errors/AppError';
import type { AuthenticatedUser } from '../types';

const KEY_PREFIX_LENGTH = 12; // chars shown in UI

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

function generateRawKey(): string {
  return `sk_${randomUUID().replace(/-/g, '')}`;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreatedApiKey {
  id: string;
  name: string;
  prefix: string;
  rawKey: string; // returned once only
  createdAt: string;
}

export class ApiKeyService {
  async create(userId: string, name: string): Promise<CreatedApiKey> {
    const rawKey = generateRawKey();
    const keyHash = hashKey(rawKey);
    const prefix = rawKey.slice(0, KEY_PREFIX_LENGTH);

    const record = await prisma.apiKey.create({
      data: { userId, name, keyHash, prefix },
    });

    return {
      id: record.id,
      name: record.name,
      prefix: record.prefix,
      rawKey,
      createdAt: record.createdAt.toISOString(),
    };
  }

  async list(userId: string): Promise<ApiKeyListItem[]> {
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      createdAt: k.createdAt.toISOString(),
      lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    }));
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await prisma.apiKey.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new NotFoundError('API key not found');
    }
    await prisma.apiKey.delete({ where: { id } });
  }

  /**
   * Verify a raw API key string. Returns the owning user or null.
   * Updates lastUsedAt on success.
   */
  async verify(rawKey: string): Promise<AuthenticatedUser | null> {
    const keyHash = hashKey(rawKey);
    const record = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });

    if (!record) return null;

    // Update lastUsedAt in the background — don't await to keep latency low
    prisma.apiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return {
      id: record.user.id,
      username: record.user.username,
      fullName: record.user.fullName,
      email: record.user.email,
    };
  }
}
