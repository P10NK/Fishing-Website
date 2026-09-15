import { storage, storageError } from "@/lib/storage";
import { z } from "zod";
const water = z.object({
  id: z.string().max(100),
  name: z.string().min(1).max(200),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  kind: z.string().max(40),
  source: z.string().max(100),
  wbic: z
    .string()
    .regex(/^\d{1,10}$/)
    .optional(),
  county: z.string().max(100).optional(),
  state: z.string().max(40).optional(),
});
const catchSchema = z.object({
  species: z.string().min(1).max(80),
  size: z.number().positive().max(1000),
  unit: z.enum(["in", "cm", "lb", "kg"]),
  location: z.string().min(1).max(200),
  time: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    .refine((v) => Number.isFinite(Date.parse(v))),
  weather: z.string().max(500),
  bait: z.string().max(150),
  notes: z.string().max(3000),
  photo: z.string().max(200).optional(),
  water: water.optional(),
});
export async function GET(r: Request) {
  try {
    const { db, owner } = storage(r);
    const { results } = await db
      .prepare(
        "SELECT id,kind,payload,created FROM records WHERE owner = ? ORDER BY created DESC LIMIT 500",
      )
      .bind(owner)
      .all();
    return Response.json(
      {
        records: results.map((x: any) => ({
          ...JSON.parse(x.payload),
          id: x.id,
          kind: x.kind,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return storageError(e);
  }
}
export async function POST(r: Request) {
  try {
    const { db, owner } = storage(r);
    if (Number(r.headers.get("content-length")) > 20000)
      return Response.json({ error: "Too large" }, { status: 413 });
    const raw = await r.text();
    if (raw.length > 20000)
      return Response.json({ error: "Too large" }, { status: 413 });
    const body = z
      .object({ kind: z.enum(["catch", "favorite"]), payload: z.unknown() })
      .parse(JSON.parse(raw));
    const kind = z.enum(["catch", "favorite"]).parse(body.kind);
    const payload = (kind === "catch" ? catchSchema : water).parse(
      body.payload,
    );
    if (
      "photo" in payload &&
      payload.photo &&
      !payload.photo.startsWith(encodeURIComponent(owner) + "/")
    )
      return Response.json(
        { error: "Invalid photo reference" },
        { status: 400 },
      );
    const id = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO records (id,owner,kind,payload,created) VALUES (?,?,?,?,?)",
      )
      .bind(id, owner, kind, JSON.stringify(payload), new Date().toISOString())
      .run();
    return Response.json({ ...payload, id, kind }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError || e instanceof SyntaxError)
      return Response.json(
        { error: "Please check the catch fields." },
        { status: 400 },
      );
    return storageError(e);
  }
}
export async function DELETE(r: Request) {
  try {
    const { db, owner, bucket } = storage(r);
    const id = new URL(r.url).searchParams.get("id");
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
    const record = await db
      .prepare("SELECT payload FROM records WHERE id = ? AND owner = ?")
      .bind(id, owner)
      .first<{ payload: string }>();
    if (record) {
      const payload = JSON.parse(record.payload);
      if (
        payload.photo &&
        payload.photo.startsWith(encodeURIComponent(owner) + "/")
      )
        await bucket.delete(payload.photo);
    }
    await db
      .prepare("DELETE FROM records WHERE id = ? AND owner = ?")
      .bind(id, owner)
      .run();
    return Response.json({ ok: true });
  } catch (e) {
    return storageError(e);
  }
}
