import crypto from "crypto";

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin";
const DEFAULT_SESSION_HOURS = 8;

export interface AdminTokenPayload {
  sub: "admin";
  user: string;
  iat: number;
  exp: number;
}

export function getAdminCredentials(): { username: string; password: string } {
  return {
    username: process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
  };
}

export function getAdminSessionHours(): number {
  const raw = process.env.ADMIN_SESSION_HOURS;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_SESSION_HOURS;
}

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-secret";
}

function toBase64Url(input: Buffer | string): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function signPayload(payloadB64: string): string {
  const hmac = crypto.createHmac("sha256", getSessionSecret());
  hmac.update(payloadB64);
  return toBase64Url(hmac.digest());
}

export function createAdminToken(username: string, expiresAtMs: number): string {
  const payload: AdminTokenPayload = {
    sub: "admin",
    user: username,
    iat: Date.now(),
    exp: expiresAtMs,
  };
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifyAdminToken(token?: string | null): {
  valid: boolean;
  expiresAt?: number;
  payload?: AdminTokenPayload;
  reason?: string;
} {
  if (!token) return { valid: false, reason: "missing" };
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "format" };

  const [payloadB64, signature] = parts;
  const expected = signPayload(payloadB64);

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, reason: "signature" };
    }
  } catch {
    return { valid: false, reason: "signature" };
  }

  try {
    const payloadJson = fromBase64Url(payloadB64);
    const payload = JSON.parse(payloadJson) as AdminTokenPayload;
    if (payload.sub !== "admin") return { valid: false, reason: "subject" };
    if (!payload.exp || payload.exp <= Date.now()) {
      return { valid: false, reason: "expired", payload, expiresAt: payload.exp };
    }
    return { valid: true, payload, expiresAt: payload.exp };
  } catch {
    return { valid: false, reason: "payload" };
  }
}
