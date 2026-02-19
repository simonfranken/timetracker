import { Router } from "express";
import {
  initializeOIDC,
  createAuthSession,
  getAuthorizationUrl,
  handleCallback,
  exchangeNativeCode,
  getUserInfo,
} from "../auth/oidc";
import { signBackendJwt } from "../auth/jwt";
import { requireAuth, syncUser } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";
import type { AuthSession } from "../auth/oidc";

const router = Router();

// Initialize OIDC on first request
let oidcInitialized = false;

async function ensureOIDC() {
  if (!oidcInitialized) {
    await initializeOIDC();
    oidcInitialized = true;
  }
}

// Short-lived store for native app OIDC sessions, keyed by state.
// Entries are cleaned up after 10 minutes regardless of use.
const nativeOidcSessions = new Map<string, { session: AuthSession; expiresAt: number }>();
const NATIVE_SESSION_TTL_MS = 10 * 60 * 1000;

function storeNativeSession(session: AuthSession): void {
  nativeOidcSessions.set(session.state, {
    session,
    expiresAt: Date.now() + NATIVE_SESSION_TTL_MS,
  });
}

function popNativeSession(state: string): AuthSession | null {
  const entry = nativeOidcSessions.get(state);
  if (!entry) return null;
  nativeOidcSessions.delete(state);
  if (Date.now() > entry.expiresAt) return null;
  return entry.session;
}

// GET /auth/login - Initiate OIDC login flow
router.get("/login", async (req, res) => {
  try {
    await ensureOIDC();

    const redirectUri = req.query.redirect_uri as string | undefined;
    const session = createAuthSession(redirectUri);

    if (redirectUri) {
      // Native app flow: store session by state so /auth/token can retrieve it
      // without relying on the browser cookie jar.
      storeNativeSession(session);
    } else {
      // Web flow: store session in the cookie-backed server session as before.
      req.session.oidc = session;
    }

    const authorizationUrl = getAuthorizationUrl(session, redirectUri);
    res.redirect(authorizationUrl);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to initiate login" });
  }
});

// GET /auth/callback - OIDC callback handler (web frontend only)
router.get("/callback", async (req, res) => {
  try {
    await ensureOIDC();

    const oidcSession = req.session.oidc;
    if (!oidcSession) {
      res.status(400).json({ error: "Invalid session" });
      return;
    }

    const tokenSet = await handleCallback(
      req.query as Record<string, string>,
      oidcSession,
    );
    const user = await getUserInfo(tokenSet);

    // Sync user with database
    await syncUser(user);

    // Store user in session
    req.session.user = user;
    delete req.session.oidc;

    // Redirect to frontend
    const frontendUrl = process.env.APP_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/auth/callback?success=true`);
  } catch (error) {
    console.error("Callback error:", error);
    const frontendUrl = process.env.APP_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/auth/callback?error=authentication_failed`);
  }
});

// POST /auth/logout - End session
router.post("/logout", (req: AuthenticatedRequest, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to logout" });
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

// GET /auth/me - Get current user
router.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
  res.json(req.user);
});

// POST /auth/token - Exchange OIDC authorization code for a backend JWT (native app flow).
// The iOS app calls this after the OIDC redirect; it receives a backend-signed JWT which
// it then uses as a Bearer token for all subsequent API requests. The backend verifies
// this JWT locally — no per-request IDP call is needed.
router.post("/token", async (req, res) => {
  try {
    await ensureOIDC();

    const { code, state, redirect_uri } = req.body;

    if (!code || !state || !redirect_uri) {
      res.status(400).json({ error: "Missing required parameters: code, state, redirect_uri" });
      return;
    }

    const oidcSession = popNativeSession(state);
    if (!oidcSession) {
      res.status(400).json({ error: "OIDC session not found or expired. Initiate login again." });
      return;
    }

    const tokenSet = await exchangeNativeCode(code, oidcSession.codeVerifier, redirect_uri);
    const user = await getUserInfo(tokenSet);
    await syncUser(user);

    // Mint a backend JWT. The iOS app stores this and sends it as Bearer <token>.
    const backendJwt = signBackendJwt(user);

    res.json({
      access_token: backendJwt,
      token_type: "Bearer",
      expires_in: 30 * 24 * 60 * 60, // 30 days
      user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Token exchange error:", error);
    res.status(500).json({ error: `Failed to exchange token: ${message}` });
  }
});

export default router;
