import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import type { AuthenticatedRequest, AuthenticatedUser } from '../types';
import { getOIDCClient, verifyBearerToken } from '../auth/oidc';

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // 1. Session-based auth (web frontend)
  if (req.session?.user) {
    req.user = req.session.user as AuthenticatedUser;
    return next();
  }

  // 2. Bearer token auth (iOS / native clients)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.slice(7);
    try {
      const user = await verifyBearerToken(accessToken);
      req.user = user;
      return next();
    } catch {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  res.status(401).json({ error: 'Unauthorized' });
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.session?.user) {
    req.user = req.session.user as AuthenticatedUser;
  }
  next();
}

export async function syncUser(user: AuthenticatedUser): Promise<void> {
  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      username: user.username,
      fullName: user.fullName,
      email: user.email,
    },
    create: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
    },
  });
}
