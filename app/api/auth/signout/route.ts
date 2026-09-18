import { clearSessionCookie } from "@/lib/google-auth";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) return new Response("Forbidden", { status: 403 });
  return new Response(null, { status: 204, headers: { "Set-Cookie": clearSessionCookie(request), "Cache-Control": "no-store" } });
}
