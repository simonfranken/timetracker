import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import type { AuthenticatedRequest, AuthenticatedUser } from '../types';

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.session?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  req.user = req.session.user as AuthenticatedUser;
  next();
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
      email: user.email,
    },
    create: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  });
}