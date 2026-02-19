import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { AuthenticatedUser } from '../types';

export interface JwtPayload {
  sub: string;
  username: string;
  fullName: string | null;
  email: string;
}

/**
 * Mint a backend-signed JWT for a native (iOS) client.
 * The token is self-contained — no IDP call is needed to verify it.
 */
export function signBackendJwt(user: AuthenticatedUser): string {
  const payload: JwtPayload = {
    sub: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    algorithm: 'HS256',
  });
}

/**
 * Verify a backend-signed JWT and return the encoded user.
 * Throws if the token is invalid or expired.
 */
export function verifyBackendJwt(token: string): AuthenticatedUser {
  const payload = jwt.verify(token, config.jwt.secret, {
    algorithms: ['HS256'],
  }) as JwtPayload;

  return {
    id: payload.sub,
    username: payload.username,
    fullName: payload.fullName,
    email: payload.email,
  };
}
