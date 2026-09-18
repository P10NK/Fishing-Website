import { env } from "cloudflare:workers";
import { configuredOrigin, cookieHeader, createPending, pkceChallenge, randomBase64url } from "@/lib/google-auth";

const PENDING_COOKIE = "castline_google_pending";

export async function GET(request: Request) {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId || !env.GOOGLE_CLIENT_SECRET || !env.AUTH_SECRET) {
    return new Response("Google sign-in is being set up. Please try again later.", { status: 503 });
  }
  let origin: string;
  try { origin = configuredOrigin(env.APP_ORIGIN); }
  catch { return new Response("Google sign-in is not configured.", { status: 503 }); }
  if (new URL(request.url).origin !== origin) return Response.redirect(`${origin}/api/auth/google/start`, 303);
  const state = randomBase64url();
  const nonce = randomBase64url();
  const verifier = randomBase64url();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${origin}/api/auth/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", await pkceChallenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  const pending = await createPending(state, nonce, verifier, env.AUTH_SECRET);
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": cookieHeader(PENDING_COOKIE, pending, 600, request, "/api/auth/google"),
      "Cache-Control": "no-store",
    },
  });
}
