import { Issuer, generators, Client, TokenSet } from 'openid-client';
import { config } from '../config';
import type { AuthenticatedUser } from '../types';

let oidcClient: Client | null = null;

export async function initializeOIDC(): Promise<void> {
  try {
    const issuer = await Issuer.discover(config.oidc.issuerUrl);
    
    oidcClient = new issuer.Client({
      client_id: config.oidc.clientId,
      redirect_uris: [config.oidc.redirectUri],
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
  nonce: string;
}

export function createAuthSession(): AuthSession {
  return {
    codeVerifier: generators.codeVerifier(),
    state: generators.state(),
    nonce: generators.nonce(),
  };
}

export function getAuthorizationUrl(session: AuthSession): string {
  const client = getOIDCClient();
  const codeChallenge = generators.codeChallenge(session.codeVerifier);
  
  return client.authorizationUrl({
    scope: 'openid profile email',
    state: session.state,
    nonce: session.nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
}

export async function handleCallback(
  params: Record<string, string>,
  session: AuthSession
): Promise<TokenSet> {
  const client = getOIDCClient();
  
  const tokenSet = await client.callback(
    config.oidc.redirectUri,
    params,
    {
      code_verifier: session.codeVerifier,
      state: session.state,
      nonce: session.nonce,
    }
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
  
  if (!email) {
    throw new Error('Email not provided by OIDC provider');
  }
  
  return {
    id,
    username,
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