import { env } from "cloudflare:workers";
export function storage(request: Request) {
  const owner = request.headers.get("oai-authenticated-user-id");
  if (!owner) throw new Error("Unauthorized");
  if (!env.DB) throw new Error("Storage unavailable");
  return {
    db: env.DB,
    owner,
    bucket: (env as unknown as { BUCKET: R2Bucket }).BUCKET,
  };
}
export function storageError(e: unknown) {
  const unauthorized = e instanceof Error && e.message === "Unauthorized";
  console.error(unauthorized ? "Missing identity" : "Storage operation failed");
  return Response.json(
    {
      error: unauthorized
        ? "Sign in to save your fishing journal."
        : "Storage is unavailable. Your form has been kept; please retry.",
    },
    { status: unauthorized ? 401 : 503 },
  );
}
