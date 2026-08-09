const crypto = require('crypto');
const { google } = require('googleapis');
const OAuth2Client = google.auth.OAuth2;

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'https://accounts.google.com/', 'accounts.google.com'];

function getRedirectUri(kind) {
  const backendUrl = new URL(
    process.env.BACKEND_PUBLIC_URL || process.env.API_URL || 'http://localhost:5000'
  );
  backendUrl.pathname = kind === 'calendar' ? '/auth/google/calendar/callback' : '/auth/google/callback';
  backendUrl.search = '';
  return backendUrl.toString();
}

function createClient(kind) {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri(kind)
  );
}

async function createAuthorizationRequest(kind, session, expectedGoogleId = null) {
  const client = createClient(kind);
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  const state = crypto.randomBytes(32).toString('base64url');
  const nonce = crypto.randomBytes(32).toString('base64url');

  session.oauth = {
    kind, state, nonce, codeVerifier, createdAt: Date.now(),
    expectedGoogleId
  };

  const scopes = kind === 'calendar'
    ? ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/calendar.events']
    : ['openid', 'profile', 'email'];

  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: kind === 'calendar' ? 'consent' : 'select_account',
    include_granted_scopes: true,
    scope: scopes,
    state, nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    redirect_uri: getRedirectUri(kind)
  });
}

async function exchangeAndVerify(code, oauthState, kind) {
  const client = createClient(kind);
  const { tokens } = await client.getToken({
    code,
    codeVerifier: oauthState.codeVerifier,
    redirect_uri: getRedirectUri(kind)
  });

  if (!tokens.id_token) throw new Error('Google did not return an ID token');

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const claims = ticket.getPayload();

  const issuerValid = GOOGLE_ISSUERS.includes(claims.iss);
  const nonceValid = claims.nonce === oauthState.nonce;
  if (!issuerValid || !nonceValid) {
    const reason = !issuerValid ? 'issuer' : 'nonce';
    throw new Error('Invalid Google identity response: ' + reason);
  }

  return { tokens, claims };
}

module.exports = { createAuthorizationRequest, exchangeAndVerify, getRedirectUri };
