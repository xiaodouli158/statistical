const encoder = new TextEncoder();
const PBKDF2_ITERATIONS = 100000;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function deriveBits(password: string, salt: ArrayBuffer, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);

  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations
    },
    key,
    256
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function timingSafeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < a.length; index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }

  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = new Uint8Array(await deriveBits(password, toArrayBuffer(salt), PBKDF2_ITERATIONS));

  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(bits)}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [algorithm, iterationsRaw, saltRaw, expectedRaw] = passwordHash.split("$");

  if (algorithm !== "pbkdf2_sha256" || !iterationsRaw || !saltRaw || !expectedRaw) {
    return false;
  }

  const iterations = Number(iterationsRaw);
  const salt = base64ToBytes(saltRaw);
  const expected = base64ToBytes(expectedRaw);

  try {
    const actual = new Uint8Array(await deriveBits(password, toArrayBuffer(salt), iterations));
    return timingSafeEquals(actual, expected);
  } catch {
    return false;
  }
}
