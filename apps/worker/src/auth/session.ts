import { SESSION_COOKIE_NAME } from "@statisticalsystem/shared";

const encoder = new TextEncoder();

export async function generateSessionToken(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}
