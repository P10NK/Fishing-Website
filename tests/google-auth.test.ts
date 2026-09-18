import assert from "node:assert/strict";
import test from "node:test";
import { createPending, createSession, readPending, sessionOwner, verifyGoogleIdToken } from "../lib/google-auth.ts";

const secret = "local-test-secret-with-more-than-thirty-two-characters";
const requestWith = (cookie: string) => new Request("https://castlinefishing.com/api/records", { headers: { Cookie: cookie } });

test("only an untampered Google session grants journal ownership", async () => {
  const token = await createSession("google-user-123", secret);
  assert.equal(await sessionOwner(requestWith(`castline_session=${token}`), secret), "google:google-user-123");
  assert.equal(await sessionOwner(requestWith(`castline_session=${token.startsWith("A") ? "B" : "A"}${token.slice(1)}`), secret), null);
  assert.equal(await sessionOwner(requestWith(`castline_session=${token}`), "different-valid-secret-with-thirty-two-characters"), null);
  assert.equal(await sessionOwner(requestWith(""), secret), null);
});

test("Google callback state must have a valid signature and be fresh", async () => {
  const pending = await createPending("a".repeat(43), "b".repeat(43), "c".repeat(43), secret);
  assert.equal((await readPending(pending, secret))?.state, "a".repeat(43));
  assert.equal(await readPending(`${pending.startsWith("A") ? "B" : "A"}${pending.slice(1)}`, secret), null);
});

test("Google ID token signature, audience and nonce are verified", async () => {
  const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...await crypto.subtle.exportKey("jwk", keys.publicKey), kid: "test-key", alg: "RS256", use: "sig" };
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ keys: [jwk] });
  try {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const header = encode({ alg: "RS256", kid: "test-key" });
    const claims = { iss: "https://accounts.google.com", aud: "client-123", sub: "user-456", nonce: "nonce-789", exp: Math.floor(Date.now() / 1000) + 300, iat: Math.floor(Date.now() / 1000) };
    const payload = encode(claims);
    const content = `${header}.${payload}`;
    const signature = Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(content))).toString("base64url");
    const token = `${content}.${signature}`;
    assert.equal(await verifyGoogleIdToken(token, "client-123", "nonce-789"), "user-456");
    await assert.rejects(verifyGoogleIdToken(token, "wrong-client", "nonce-789"));
    await assert.rejects(verifyGoogleIdToken(token, "client-123", "wrong-nonce"));
    await assert.rejects(verifyGoogleIdToken(`${content}.${signature.slice(0, -1)}x`, "client-123", "nonce-789"));
  } finally {
    globalThis.fetch = oldFetch;
  }
});
