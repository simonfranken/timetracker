import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  database: {
    url: process.env.DATABASE_URL || "",
  },

  oidc: {
    issuerUrl: process.env.OIDC_ISSUER_URL || "",
    clientId: process.env.OIDC_CLIENT_ID || "",
    redirectUri:
      process.env.OIDC_REDIRECT_URI ||
      "http://localhost:3001/api/auth/callback",
    iosRedirectUri: process.env.OIDC_IOS_REDIRECT_URI || "timetracker://oauth/callback",
  },

  session: {
    secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },

  cors: {
    origin: process.env.APP_URL || "http://localhost:5173",
    credentials: true,
  },
};

export function validateConfig(): void {
  const required = ["DATABASE_URL", "OIDC_ISSUER_URL", "OIDC_CLIENT_ID"];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  if (config.session.secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be at least 32 characters. Set a strong secret in your environment.",
    );
  }
}
