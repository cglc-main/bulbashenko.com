import * as oidc from "openid-client";
import { SignJWT, createRemoteJWKSet, jwtVerify } from "jose";

// Sign-in goes through the SSO (Ory Hydra at auth.bulbashenko.com, repo cglc-main/auth), client `bulbashenko-site`.
// Only members of ADMIN_GROUP may enter the admin panel. Signing out ends the SSO session too (RP-initiated logout),
// and the SSO tells the site when someone signs out elsewhere (back-channel logout).
export const ADMIN_GROUP = "site-admins";
export const FLOW_COOKIE_NAME = "bul_oidc_flow";
export const FLOW_COOKIE_PATH = "/api/auth/oidc";
export const FLOW_COOKIE_MAX_AGE = 10 * 60; // seconds to finish signing in at the provider
const SCOPE = "openid profile email groups";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} env var is not set`);
  return value;
}

// Absolute URL on the public site. Request URLs can't be used: behind the proxy they carry the bind address.
// SITE_URL is read at run time (one image runs anywhere); NEXT_PUBLIC_SITE_URL is inlined at build time.
export function siteUrl(path: string): URL {
  return new URL(path, process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
}

export function redirectUri(): string {
  return siteUrl("/api/auth/oidc/callback").toString();
}

let configPromise: Promise<oidc.Configuration> | null = null;

// Discovery is cached for the life of the process; a failed attempt is retried on the next request.
function getConfig(): Promise<oidc.Configuration> {
  configPromise ??= oidc
    .discovery(
      new URL(env("OIDC_ISSUER")),
      env("OIDC_CLIENT_ID"),
      undefined,
      oidc.ClientSecretBasic(env("OIDC_CLIENT_SECRET")),
    )
    .catch((err) => {
      configPromise = null;
      throw err;
    });
  return configPromise;
}

type Flow = { verifier: string; state: string; nonce: string };

function flowSecret(): Uint8Array {
  return new TextEncoder().encode(env("JWT_SECRET"));
}

// Starts a login: returns the provider URL and a signed cookie value that carries the PKCE verifier, state and nonce.
export async function beginLogin(): Promise<{ url: URL; flowToken: string }> {
  const config = await getConfig();
  const flow: Flow = {
    verifier: oidc.randomPKCECodeVerifier(),
    state: oidc.randomState(),
    nonce: oidc.randomNonce(),
  };
  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri(),
    scope: SCOPE,
    code_challenge: await oidc.calculatePKCECodeChallenge(flow.verifier),
    code_challenge_method: "S256",
    state: flow.state,
    nonce: flow.nonce,
  });
  const flowToken = await new SignJWT(flow)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${FLOW_COOKIE_MAX_AGE}s`)
    .sign(flowSecret());
  return { url, flowToken };
}

export type SignedInUser = {
  subject: string;
  username: string;
  groups: string[];
  /** The SSO session this sign-in belongs to (ID token `sid`); a back-channel logout names it. */
  sid: string | null;
  idToken: string;
};

// Finishes a login from the callback query string. Throws if the response, state, nonce or PKCE check fails.
export async function finishLogin(search: string, flowToken: string): Promise<SignedInUser> {
  const { payload } = await jwtVerify(flowToken, flowSecret(), { algorithms: ["HS256"] });
  const flow = payload as unknown as Flow;
  const config = await getConfig();

  // The callback is checked against the registered redirect URI, not the internal URL the request arrived on.
  const currentUrl = new URL(redirectUri());
  currentUrl.search = search;

  const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: flow.verifier,
    expectedState: flow.state,
    expectedNonce: flow.nonce,
    idTokenExpected: true,
  });
  const claims = tokens.claims()!;
  const subject = claims.sub;
  const info = await oidc.fetchUserInfo(config, tokens.access_token, subject);
  const groups = Array.isArray(info.groups) ? info.groups.filter((g): g is string => typeof g === "string") : [];
  return {
    subject,
    username: info.preferred_username ?? subject,
    groups,
    sid: typeof claims.sid === "string" ? claims.sid : null,
    idToken: tokens.id_token!,
  };
}

/**
 * Where to send the browser to sign out of the SSO as well: its end-session endpoint with this sign-in's ID token,
 * back to the home page afterwards. Null without an ID token (sessions from before it was stored).
 */
export async function endSessionUrl(idToken: string): Promise<string | null> {
  if (!idToken) return null;
  const config = await getConfig();
  return oidc
    .buildEndSessionUrl(config, { id_token_hint: idToken, post_logout_redirect_uri: siteUrl("/").toString() })
    .toString();
}

const BACKCHANNEL_LOGOUT_EVENT = "http://schemas.openid.net/event/backchannel-logout";
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Checks a back-channel logout token (OpenID Connect Back-Channel Logout 1.0, section 2.6): signed by the SSO,
 * issued for this client, carrying the logout event, no nonce, and a session (sid) or subject (sub) to end.
 */
export async function verifyLogoutToken(token: string): Promise<{ sid: string | null; sub: string | null }> {
  const config = await getConfig();
  const metadata = config.serverMetadata();
  jwks ??= createRemoteJWKSet(new URL(metadata.jwks_uri!));
  const { payload } = await jwtVerify(token, jwks, {
    issuer: metadata.issuer,
    audience: env("OIDC_CLIENT_ID"),
    maxTokenAge: "5m",
  });
  const events = payload.events as Record<string, unknown> | undefined;
  if (!events || typeof events[BACKCHANNEL_LOGOUT_EVENT] !== "object") throw new Error("not a logout token");
  if ("nonce" in payload) throw new Error("logout token carries a nonce");
  const sid = typeof payload.sid === "string" ? payload.sid : null;
  const sub = typeof payload.sub === "string" ? payload.sub : null;
  if (!sid && !sub) throw new Error("logout token names no session and no subject");
  return { sid, sub };
}
