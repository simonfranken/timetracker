import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import type { AuthenticatedRequest, AuthenticatedUser } from '../types';
import { verifyBackendJwt } from '../auth/jwt';

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const tag = `[requireAuth] ${req.method} ${req.path}`;

  // 1. Session-based auth (web frontend)
  if (req.session?.user) {
    console.log(`${tag} -> session auth OK (user: ${req.session.user.id})`);
    req.user = req.session.user as AuthenticatedUser;
    return next();
  }

  // 2. Bearer JWT auth (iOS / native clients)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    console.log(`${tag} -> Bearer token present (first 20 chars: ${token.slice(0, 20)}…)`);
    try {
      req.user = verifyBackendJwt(token);
      console.log(`${tag} -> JWT auth OK (user: ${req.user.id})`);
      return next();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`${tag} -> JWT verification failed: ${message}`);
      res.status(401).json({ error: `Unauthorized: ${message}` });
      return;
    }
  }

  if (authHeader) {
    console.warn(`${tag} -> Authorization header present but not a Bearer token: "${authHeader.slice(0, 30)}…"`);
  } else {
    console.warn(`${tag} -> No session and no Authorization header`);
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
