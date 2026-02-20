import { Issuer, generators, Client, TokenSet } from 'openid-client';
import { config } from '../config';
import type { AuthenticatedUser } from '../types';

// Note: bearer-token (JWT) verification for native clients lives in auth/jwt.ts.
// This module is responsible solely for the OIDC protocol flows.

let oidcClient: Client | null = null;

export async function initializeOIDC(): Promise<void> {
  try {
    const issuer = await Issuer.discover(config.oidc.issuerUrl);
    
    const redirectUris = [config.oidc.redirectUri];
    if (config.oidc.iosRedirectUri) {
      redirectUris.push(config.oidc.iosRedirectUri);
    }
    
    oidcClient = new issuer.Client({
      client_id: config.oidc.clientId,
      redirect_uris: redirectUris,
      response_types: ['code'],
      token_endpoint_auth_method: 'none', // PKCE flow - no client secret
    });
    
    console.log('OIDC client initialized');
  } catch (error) {
    console.error('Failed to initialize OIDC client:', error);
    throw error;
  }
}

export function getOIDCClient(): Client {
  if (!oidcClient) {
    throw new Error('OIDC client not initialized');
  }
  return oidcClient;
}

export interface AuthSession {
  codeVerifier: string;
  state: string;
  nonce: string | undefined;
  redirectUri: string;
}

export function createAuthSession(redirectUri: string): AuthSession {
  const isNative = redirectUri.startsWith('timetracker://');
  return {
    codeVerifier: generators.codeVerifier(),
    state: generators.state(),
    // Nonce is omitted for native/PKCE-only flows. PKCE itself binds the code
    // exchange so nonce provides no additional security. Some providers also
    // don't echo the nonce back in the ID token for public clients, which
    // causes openid-client to throw a nonce mismatch error.
    nonce: isNative ? undefined : generators.nonce(),
    redirectUri,
  };
}

export function getAuthorizationUrl(session: AuthSession): string {
  const client = getOIDCClient();
  const codeChallenge = generators.codeChallenge(session.codeVerifier);

  const params: Record<string, string> = {
    scope: 'openid profile email',
    state: session.state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    redirect_uri: session.redirectUri,
  };

  if (session.nonce) {
    params.nonce = session.nonce;
  }

  return client.authorizationUrl(params);
}

export async function handleCallback(
  params: Record<string, string>,
  session: AuthSession
): Promise<TokenSet> {
  const client = getOIDCClient();

  const checks: Record<string, string | undefined> = {
    code_verifier: session.codeVerifier,
    state: session.state,
  };

  if (session.nonce) {
    checks.nonce = session.nonce;
  }

  const tokenSet = await client.callback(
    session.redirectUri,
    params,
    checks,
  );

  return tokenSet;
}

// For native app flows the provider may return only an access token (no ID token)
// when the redirect_uri uses a custom scheme. client.grant() calls the token
// endpoint directly and does not attempt ID token validation.
export async function exchangeNativeCode(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<TokenSet> {
  const client = getOIDCClient();

  const tokenSet = await client.grant({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  return tokenSet;
}

export async function getUserInfo(tokenSet: TokenSet): Promise<AuthenticatedUser> {
  const client = getOIDCClient();

  // ID token claims (only available in web/full OIDC flow)
  const idTokenClaims = tokenSet.id_token ? tokenSet.claims() : undefined;

  // Always attempt userinfo; for native flows this is the sole source of claims.
  let userInfo: Record<string, unknown> = {};
  try {
    userInfo = await client.userinfo(tokenSet);
  } catch {
    if (!idTokenClaims) {
      // No ID token and no userinfo — nothing to work with.
      throw new Error('Unable to retrieve user info: userinfo endpoint failed and no ID token present');
    }
    // Web flow: fall back to ID token claims only
  }

  const sub = String(userInfo.sub || idTokenClaims?.sub);
  const id = sub;
  const username = String(
    userInfo.preferred_username ||
    idTokenClaims?.preferred_username ||
    userInfo.name ||
    idTokenClaims?.name ||
    id
  );
  const email = String(userInfo.email || idTokenClaims?.email || '');
  const fullName = String(userInfo.name || idTokenClaims?.name || '') || null;

  if (!email) {
    throw new Error('Email not provided by OIDC provider');
  }

  return { id, username, fullName, email };
}

