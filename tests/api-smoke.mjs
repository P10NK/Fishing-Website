import assert from "node:assert/strict";
import { createSession } from "../lib/google-auth.ts";
const base = process.env.TEST_BASE_URL ?? "http://localhost:5173";
const secret = process.env.TEST_AUTH_SECRET;
if (!secret) throw new Error("Set TEST_AUTH_SECRET to the local AUTH_SECRET before running the API smoke test.");
const cookie = `castline_session=${await createSession("api-smoke-test", secret)}`;
assert.equal((await fetch(base + "/api/records")).status, 401);
const call = (path, init = {}) =>
  fetch(base + path, { ...init, headers: { ...init.headers, Cookie: cookie } });
const initial = await call("/api/records");
assert.equal(initial.status, 200);
const before = await initial.json();
assert.ok(Array.isArray(before.records));
const payload = {
  species: "Rainbow trout",
  size: 15.5,
  unit: "in",
  location: "Test water",
  time: "2026-09-10T07:30",
  weather: "Test observation: overcast",
  bait: "Test spinner",
  notes: "Automated smoke test",
  water: {
    id: "wi:805400",
    wbic: "805400",
    name: "Test water",
    lat: 43.105,
    lon: -89.41994,
    kind: "Lake",
    source: "Test",
    county: "Dane",
    state: "WI",
  },
};
const send = (body) =>
  call("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const created = [];
let photoKey;
try {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6lKQAAAAASUVORK5CYII=",
    "base64",
  );
  const upload = new FormData();
  upload.set("photo", new Blob([png], { type: "image/png" }), "test.png");
  const uploaded = await call("/api/photo", { method: "POST", body: upload });
  assert.equal(uploaded.status, 200);
  photoKey = (await uploaded.json()).key;
  assert.equal(
    (await call("/api/photo?key=" + encodeURIComponent(photoKey))).status,
    200,
  );
  const r = await send({
    kind: "catch",
    payload: { ...payload, photo: photoKey },
  });
  assert.equal(r.status, 201);
  const c = await r.json();
  created.push(c.id);
  const read = await (await call("/api/records")).json();
  assert.ok(read.records.some((x) => x.id === c.id && x.size === 15.5));
  assert.deepEqual(
    read.records.find((x) => x.id === c.id).water,
    payload.water,
  );
  const bad = await send({ kind: "catch", payload: { ...payload, size: -1 } });
  assert.equal(bad.status, 400);
  assert.equal(
    (
      await send({
        kind: "catch",
        payload: { ...payload, time: "not-a-date-time!" },
      })
    ).status,
    400,
  );
  assert.equal((await send(null)).status, 400);
  const f = await send({
    kind: "favorite",
    payload: {
      id: "test-water",
      name: "Smoke test water",
      lat: 43,
      lon: -89,
      kind: "Lake",
      source: "Test",
    },
  });
  assert.equal(f.status, 201);
  created.push((await f.json()).id);
  const fd = new FormData();
  fd.set("photo", new Blob(["bad"], { type: "text/plain" }), "test.txt");
  assert.equal(
    (await call("/api/photo", { method: "POST", body: fd })).status,
    400,
  );
  assert.equal((await call("/api/photo?key=another-owner/test")).status, 404);
  assert.equal((await call("/api/forecast?lat=999&lon=0")).status, 400);
  assert.equal((await call("/api/forecast?lon=0")).status, 400);
  const weather = await call("/api/forecast?lat=43.07&lon=-89.4");
  assert.ok([200, 503].includes(weather.status));
  if (weather.ok) {
    const d = await weather.json();
    assert.equal(d.hours.length, 192);
    assert.ok(d.timezone);
    console.log("Live forecast: 192 valid hours.");
  } else console.log("Weather service unavailable; UI fallback expected.");
  console.log(
    "PASS: catch save/read, favorites, validation, photo rejection, ownership, weather.",
  );
} finally {
  for (const id of created)
    assert.equal(
      (await call("/api/records?id=" + id, { method: "DELETE" })).status,
      200,
    );
  const after = await (await call("/api/records")).json();
  assert.ok(created.every((id) => !after.records.some((r) => r.id === id)));
  if (photoKey)
    assert.equal(
      (await call("/api/photo?key=" + encodeURIComponent(photoKey))).status,
      404,
    );
  console.log("Test records and photo removed; deletion verified.");
}
