import { env } from "cloudflare:workers";
import { clearSessionCookie, configuredOrigin, cookieHeader, createSession, readCookie, readPending, sessionCookie, verifyGoogleIdToken } from "@/lib/google-auth";

const PENDING_COOKIE = "castline_google_pending";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pendingCookie = readCookie(request, PENDING_COOKIE);
  const headers = new Headers({ "Cache-Control": "no-store" });
  headers.append("Set-Cookie", cookieHeader(PENDING_COOKIE, "", 0, request, "/api/auth/google"));
  if (!pendingCookie || pendingCookie.length > 2048 || url.searchParams.has("error")) {
    return new Response("Google sign-in was cancelled or expired. Please try again.", { status: 400, headers });
  }
  try {
    const authSecret = env.AUTH_SECRET;
    if (!authSecret) throw new Error("Google sign-in is not configured");
    const pending = await readPending(pendingCookie, authSecret);
    const code = url.searchParams.get("code");
    if (!code || !pending || pending.state !== url.searchParams.get("state")) throw new Error("Invalid sign-in state");
    const origin = configuredOrigin(env.APP_ORIGIN);
    if (url.origin !== origin) throw new Error("Unexpected callback origin");
    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    if (!origin || !clientId || !clientSecret) throw new Error("Google sign-in is not configured");
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
        code_verifier: pending.verifier,
      }),
    });
    if (!response.ok) throw new Error("Google token exchange failed");
    const tokens = await response.json() as { id_token?: string };
    if (!tokens.id_token) throw new Error("Google ID token missing");
    const sub = await verifyGoogleIdToken(tokens.id_token, clientId, pending.nonce);
    headers.append("Set-Cookie", sessionCookie(await createSession(sub, authSecret), request));
    headers.set("Location", `${origin}/`);
    return new Response(null, { status: 303, headers });
  } catch (error) {
    console.error("Google sign-in failed", error instanceof Error ? error.message : "Unknown error");
    headers.append("Set-Cookie", clearSessionCookie(request));
    return new Response("Google sign-in failed. Please try again.", { status: 400, headers });
  }
}
