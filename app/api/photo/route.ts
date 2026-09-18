import { storage, storageError } from "@/lib/storage";
export async function POST(r: Request) {
  try {
    const { owner, bucket } = await storage(r);
    if (!bucket) throw Error("Unavailable");
    if (Number(r.headers.get("content-length")) > 5500000)
      return Response.json(
        { error: "Photo must be under 5 MB" },
        { status: 413 },
      );
    const form = await r.formData(),
      file = form.get("photo");
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > 5000000 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      return Response.json(
        { error: "Choose a JPG, PNG or WebP under 5 MB." },
        { status: 400 },
      );
    const bytes = await file.arrayBuffer(),
      header = new Uint8Array(bytes);
    const valid =
      file.type === "image/jpeg"
        ? header[0] === 255 && header[1] === 216 && header[2] === 255
        : file.type === "image/png"
          ? header[0] === 137 &&
            header[1] === 80 &&
            header[2] === 78 &&
            header[3] === 71
          : new TextDecoder().decode(header.slice(0, 4)) === "RIFF" &&
            new TextDecoder().decode(header.slice(8, 12)) === "WEBP";
    if (!valid)
      return Response.json(
        { error: "File content does not match the selected image format." },
        { status: 400 },
      );
    const key = encodeURIComponent(owner) + "/" + crypto.randomUUID();
    await bucket.put(key, bytes, {
      httpMetadata: { contentType: file.type },
    });
    return Response.json({ key });
  } catch (e) {
    return storageError(e);
  }
}
export async function GET(r: Request) {
  try {
    const { owner, bucket } = await storage(r);
    const key = new URL(r.url).searchParams.get("key") ?? "";
    if (!key.startsWith(encodeURIComponent(owner) + "/"))
      return new Response("Not found", { status: 404 });
    const f = await bucket.get(key);
    if (!f) return new Response("Not found", { status: 404 });
    return new Response(f.body, {
      headers: {
        "Content-Type":
          f.httpMetadata?.contentType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return storageError(e);
  }
}
