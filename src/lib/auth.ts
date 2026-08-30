// Edge Runtime uyumluluğu için Node "crypto" modülü yerine Web Crypto API
// (globalThis.crypto.subtle) kullanılıyor; middleware her zaman Edge Runtime'da çalışır.

export const AUTH_COOKIE_NAME = "topkapi_session";
const SIGNED_MESSAGE = "topkapi-authenticated";

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Verilen şifre doğruysa, cookie'ye konacak imzalı token'ı döndürür. */
export async function createSessionToken(password: string): Promise<string | null> {
  const expected = process.env.APP_PASSWORD;
  if (!expected || password !== expected) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET tanımlı değil.");
  return hmacHex(secret, SIGNED_MESSAGE);
}

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  const expected = await hmacHex(secret, SIGNED_MESSAGE);
  return constantTimeEqual(token, expected);
}
