const encoder = new TextEncoder();
const SESSION_COOKIE = "castline_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export function configuredOrigin(value: string | undefined): string {
  if (!value) throw new Error("APP_ORIGIN is missing");
  const url = new URL(value);
  if (url.pathname !== "/" || url.search || url.hash || (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost"))) throw new Error("APP_ORIGIN must be a secure site origin");
  return url.origin;
}

type Session = { version: 1; sub: string; expires: number };

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid encoding");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function randomBase64url(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function pkceChallenge(verifier: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(verifier))));
}

export function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=") || null;
  }
  return null;
}

export function cookieHeader(name: string, value: string, seconds: number, request: Request, path = "/"): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${value}; Path=${path}; Max-Age=${seconds}; HttpOnly; SameSite=Lax${secure}`;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const signature = base64url(new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload))));
  return `${payload}.${signature}`;
}

async function verifyPayload(token: string, secret: string): Promise<string | null> {
  if (token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    return await crypto.subtle.verify("HMAC", await hmacKey(secret), fromBase64url(parts[1]), encoder.encode(parts[0])) ? parts[0] : null;
  } catch {
    return null;
  }
}

type Pending = { state: string; nonce: string; verifier: string; expires: number };

export async function createPending(state: string, nonce: string, verifier: string, secret: string): Promise<string> {
  const payload = base64url(encoder.encode(JSON.stringify({ state, nonce, verifier, expires: Math.floor(Date.now() / 1000) + 600 } satisfies Pending)));
  return signPayload(payload, secret);
}

export async function readPending(token: string, secret: string): Promise<Pending | null> {
  const payload = await verifyPayload(token, secret);
  if (!payload) return null;
  try {
    const pending = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as Pending;
    if (![pending.state, pending.nonce, pending.verifier].every((value) => typeof value === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(value)) || !Number.isInteger(pending.expires) || pending.expires <= Date.now() / 1000) return null;
    return pending;
  } catch {
    return null;
  }
}

export async function createSession(sub: string, secret: string): Promise<string> {
  if (!sub || sub.length > 255) throw new Error("Invalid Google subject");
  const payload = base64url(encoder.encode(JSON.stringify({ version: 1, sub, expires: Math.floor(Date.now() / 1000) + SESSION_SECONDS } satisfies Session)));
  return signPayload(payload, secret);
}

export async function sessionOwner(request: Request, secret: string | undefined): Promise<string | null> {
  if (!secret) return null;
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  try {
    const payload = await verifyPayload(token, secret);
    if (!payload) return null;
    const session = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as Session;
    if (session.version !== 1 || typeof session.sub !== "string" || !session.sub || session.sub.length > 255 || !Number.isInteger(session.expires) || session.expires <= Date.now() / 1000) return null;
    return `google:${session.sub}`;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string, request: Request): string {
  return cookieHeader(SESSION_COOKIE, token, SESSION_SECONDS, request);
}

export function clearSessionCookie(request: Request): string {
  return cookieHeader(SESSION_COOKIE, "", 0, request);
}

export async function verifyGoogleIdToken(token: string, clientId: string, nonce: string): Promise<string> {
  if (token.length > 16384) throw new Error("Invalid ID token size");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid ID token");
  const header = JSON.parse(new TextDecoder().decode(fromBase64url(parts[0]))) as { alg?: string; kid?: string };
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unexpected ID token signature");
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", { cache: "no-store" });
  if (!response.ok) throw new Error("Google signing keys unavailable");
  const jwks = await response.json() as { keys?: Array<JsonWebKey & { kid?: string; alg?: string; use?: string }> };
  const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.kty === "RSA" && (!key.alg || key.alg === "RS256") && (!key.use || key.use === "sig"));
  if (!jwk) throw new Error("Google signing key not found");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, fromBase64url(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
  if (!valid) throw new Error("Invalid ID token signature");
  const claims = JSON.parse(new TextDecoder().decode(fromBase64url(parts[1]))) as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);
  if (!(["https://accounts.google.com", "accounts.google.com"].includes(String(claims.iss))) || claims.aud !== clientId || claims.nonce !== nonce || typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 255 || typeof claims.exp !== "number" || claims.exp <= now || typeof claims.iat !== "number" || claims.iat > now + 60) throw new Error("Invalid ID token claims");
  return claims.sub;
}
