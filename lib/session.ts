const AUTH_SECRET = process.env.AUTH_SECRET ?? "";

export const SESSION_COOKIE = "gcc_sim_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionTrainee = {
  id: string;
  email: string;
  name: string;
};

type SessionPayload = SessionTrainee & { exp: number };

function getSecret(): string | null {
  return AUTH_SECRET || null;
}

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  let hex = "";
  for (let i = 0; i < view.length; i += 1) {
    hex += (view[i] as number).toString(16).padStart(2, "0");
  }
  return hex;
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const copy = new ArrayBuffer(clean.length / 2);
  const view = new Uint8Array(copy);
  for (let i = 0; i < view.length; i += 1) {
    view[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return copy;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(trainee: SessionTrainee): Promise<string> {
  const secret = getSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET is not set.");
  }
  const payload: SessionPayload = {
    ...trainee,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const body = bytesToHex(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );
  return `${body}.${bytesToHex(signature)}`;
}

function parsePayload(bodyHex: string): SessionPayload | null {
  try {
    const parsed = JSON.parse(
      new TextDecoder().decode(hexToArrayBuffer(bodyHex))
    ) as SessionPayload;
    if (!parsed.id || !parsed.email || !parsed.name) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Cookie shape check for Edge middleware. HMAC is verified in Node via readSession. */
export function peekSession(token: string | undefined): SessionTrainee | null {
  if (!token || !token.includes(".")) return null;
  const body = token.split(".")[0];
  if (!body) return null;
  const parsed = parsePayload(body);
  if (!parsed) return null;
  return { id: parsed.id, email: parsed.email, name: parsed.name };
}

export async function readSession(token: string | undefined): Promise<SessionTrainee | null> {
  if (!token || !token.includes(".")) return null;
  try {
    const secret = getSecret();
    if (!secret) return null;
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      hexToArrayBuffer(signature),
      new TextEncoder().encode(body)
    );
    if (!valid) return null;
    return peekSession(token);
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
