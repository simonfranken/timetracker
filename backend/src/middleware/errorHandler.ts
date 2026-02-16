import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);
  
  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        res.status(409).json({ error: 'Resource already exists' });
        return;
      case 'P2025':
        res.status(404).json({ error: 'Resource not found' });
        return;
      case 'P2003':
        res.status(400).json({ error: 'Invalid reference to related resource' });
        return;
      default:
        res.status(500).json({ error: 'Database error' });
        return;
    }
  }
  
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ error: 'Invalid data format' });
    return;
  }
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({ 
    error: statusCode === 500 ? 'Internal server error' : message 
  });
}

export function notFoundHandler(
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({ error: 'Endpoint not found' });
}