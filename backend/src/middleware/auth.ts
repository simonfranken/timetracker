import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import type { AuthenticatedRequest, AuthenticatedUser } from '../types';
import { verifyBackendJwt } from '../auth/jwt';

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

  // 2. Bearer JWT auth (iOS / native clients)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      // Verify the backend-signed JWT locally — no IDP network call needed.
      req.user = verifyBackendJwt(token);
      return next();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(401).json({ error: `Unauthorized: ${message}` });
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
