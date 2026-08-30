// Edge Runtime uyumluluğu için Node "crypto" modülü yerine Web Crypto API
// (globalThis.crypto.subtle) kullanılıyor; middleware her zaman Edge Runtime'da çalışır.

export const AUTH_COOKIE_NAME = "topkapi_session";

export type PanelRole = "admin" | "editor" | "reviewer";

export interface SessionPayload {
  sub: string; // panel_users.id veya "app_password" (paylaşımlı şifre girişi)
  role: PanelRole;
  name: string;
}

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

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET tanımlı değil.");
  return secret;
}

/** Verilen payload için imzalı, cookie'ye konacak bir session token üretir. */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const secret = getSecret();
  const body = toBase64Url(JSON.stringify(payload));
  const signature = await hmacHex(secret, body);
  return `${body}.${signature}`;
}

/**
 * Token'ı doğrular ve geçerliyse payload'ı döndürür; imza uyuşmuyorsa veya
 * bozuksa null döner. AUTH_SECRET tanımlı değilse de null döner (edge runtime
 * ortamlarında process.env erişimi olmayabilir, bu durumda güvenli varsayılan
 * her zaman "yetkisiz"dir).
 */
export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }

  const expected = await hmacHex(secret, body);
  if (!constantTimeEqual(signature, expected)) return null;

  try {
    return JSON.parse(fromBase64Url(body)) as SessionPayload;
  } catch {
    return null;
  }
}

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  return (await verifySessionToken(token)) !== null;
}

/** API route'larında (NextRequest alan) oturum sahibini okumak için yardımcı. */
export async function getSessionFromRequest(req: {
  cookies: { get(name: string): { value: string } | undefined };
}): Promise<SessionPayload | null> {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
