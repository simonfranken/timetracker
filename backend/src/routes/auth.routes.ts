import { Router } from "express";
import {
  initializeOIDC,
  createAuthSession,
  getAuthorizationUrl,
  handleCallback,
  getUserInfo,
} from "../auth/oidc";
import { requireAuth, syncUser } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";

const router = Router();

// Initialize OIDC on first request
let oidcInitialized = false;

async function ensureOIDC() {
  if (!oidcInitialized) {
    await initializeOIDC();
    oidcInitialized = true;
  }
}

// GET /auth/login - Initiate OIDC login flow
router.get("/login", async (req, res) => {
  try {
    await ensureOIDC();

    const session = createAuthSession();
    req.session.oidc = session;

    const authorizationUrl = getAuthorizationUrl(session);
    res.redirect(authorizationUrl);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to initiate login" });
  }
});

// GET /auth/callback - OIDC callback handler
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

export default router;
