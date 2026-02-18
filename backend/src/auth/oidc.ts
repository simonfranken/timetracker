import { Issuer, generators, Client, TokenSet } from 'openid-client';
import { config } from '../config';
import type { AuthenticatedUser } from '../types';

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
  redirectUri?: string;
}

export function createAuthSession(redirectUri?: string): AuthSession {
  const isNative = !!redirectUri;
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

export function getAuthorizationUrl(session: AuthSession, redirectUri?: string): string {
  const client = getOIDCClient();
  const codeChallenge = generators.codeChallenge(session.codeVerifier);
  
  const params: Record<string, string> = {
    scope: 'openid profile email',
    state: session.state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  };

  if (session.nonce) {
    params.nonce = session.nonce;
  }
  
  if (redirectUri) {
    params.redirect_uri = redirectUri;
  }
  
  return client.authorizationUrl(params);
}

export async function handleCallback(
  params: Record<string, string>,
  session: AuthSession
): Promise<TokenSet> {
  const client = getOIDCClient();
  
  const redirectUri = session.redirectUri || config.oidc.redirectUri;
  
  const checks: Record<string, string | undefined> = {
    code_verifier: session.codeVerifier,
    state: session.state,
  };

  if (session.nonce) {
    checks.nonce = session.nonce;
  }

  const tokenSet = await client.callback(
    redirectUri,
    params,
    checks,
  );
  
  return tokenSet;
}

export async function getUserInfo(tokenSet: TokenSet): Promise<AuthenticatedUser> {
  const client = getOIDCClient();
  
  const claims = tokenSet.claims();
  
  // Try to get more detailed userinfo if available
  let userInfo: Record<string, unknown> = {};
  try {
    userInfo = await client.userinfo(tokenSet);
  } catch {
    // Some providers don't support userinfo endpoint
    // We'll use the claims from the ID token
  }
  
  const id = String(claims.sub);
  const username = String(userInfo.preferred_username || claims.preferred_username || claims.name || id);
  const email = String(userInfo.email || claims.email || '');
  const fullName = String(userInfo.name || claims.name || '') || null;
  
  if (!email) {
    throw new Error('Email not provided by OIDC provider');
  }
  
  return {
    id,
    username,
    fullName,
    email,
  };
}

export async function verifyToken(tokenSet: TokenSet): Promise<boolean> {
  try {
    const client = getOIDCClient();
    await client.userinfo(tokenSet);
    return true;
  } catch {
    return false;
  }
}

export async function verifyBearerToken(accessToken: string): Promise<AuthenticatedUser> {
  const client = getOIDCClient();

  const userInfo = await client.userinfo(accessToken);

  const id = String(userInfo.sub);
  const username = String(userInfo.preferred_username || userInfo.name || id);
  const email = String(userInfo.email || '');
  const fullName = String(userInfo.name || '') || null;

  if (!email) {
    throw new Error('Email not provided by OIDC provider');
  }

  return { id, username, fullName, email };
}