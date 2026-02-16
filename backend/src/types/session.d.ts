import 'express-session';
import type { AuthenticatedUser } from './index';
import type { AuthSession } from '../auth/oidc';

declare module 'express-session' {
  interface SessionData {
    user?: AuthenticatedUser;
    oidc?: AuthSession;
  }
}