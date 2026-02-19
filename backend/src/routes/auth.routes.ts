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
    console.log(`[auth/login] initiated (redirect_uri: ${redirectUri ?? '(web flow)'})`);
    const session = createAuthSession(redirectUri);

    if (redirectUri) {
      // Native app flow: store session by state so /auth/token can retrieve it
      // without relying on the browser cookie jar.
      storeNativeSession(session);
      console.log(`[auth/login] native session stored (state: ${session.state})`);
    } else {
      // Web flow: store session in the cookie-backed server session as before.
      req.session.oidc = session;
    }

    const authorizationUrl = getAuthorizationUrl(session, redirectUri);
    console.log(`[auth/login] redirecting to IDP`);
    res.redirect(authorizationUrl);
  } catch (error) {
    console.error("[auth/login] error:", error);
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
    console.log(`[auth/token] received (state: ${state}, redirect_uri: ${redirect_uri}, code present: ${!!code})`);

    if (!code || !state || !redirect_uri) {
      const missing = ['code', 'state', 'redirect_uri'].filter(k => !req.body[k]);
      console.warn(`[auth/token] missing parameters: ${missing.join(', ')}`);
      res.status(400).json({ error: `Missing required parameters: ${missing.join(', ')}` });
      return;
    }

    const oidcSession = popNativeSession(state);
    if (!oidcSession) {
      console.warn(`[auth/token] no session found for state "${state}" — known states: [${[...nativeOidcSessions.keys()].join(', ')}]`);
      res.status(400).json({ error: "OIDC session not found or expired. Initiate login again." });
      return;
    }
    console.log(`[auth/token] session found, exchanging code with IDP`);

    const tokenSet = await exchangeNativeCode(code, oidcSession.codeVerifier, redirect_uri);
    console.log(`[auth/token] IDP code exchange OK (access_token present: ${!!tokenSet.access_token}, id_token present: ${!!tokenSet.id_token})`);

    const user = await getUserInfo(tokenSet);
    console.log(`[auth/token] user resolved (id: ${user.id}, email: ${user.email})`);
    await syncUser(user);

    // Mint a backend JWT. The iOS app stores this and sends it as Bearer <token>.
    const backendJwt = signBackendJwt(user);
    console.log(`[auth/token] backend JWT minted for user ${user.id}`);

    res.json({
      access_token: backendJwt,
      token_type: "Bearer",
      expires_in: 30 * 24 * 60 * 60, // 30 days
      user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[auth/token] error:", error);
    res.status(500).json({ error: `Failed to exchange token: ${message}` });
  }
});

export default router;
