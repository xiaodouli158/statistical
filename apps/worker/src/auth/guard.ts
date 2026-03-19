import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono";
import { getSessionCookieName, sha256 } from "./session";
import { createSession, deleteSession, getSessionUser } from "../db/queries";
import type { AppVariables, Env } from "../db/types";

type AppMiddleware = MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }>;

function shouldUseSecureCookie(env: Env): boolean {
  return env.APP_ORIGIN.startsWith("https://");
}

function getCookieSameSite(env: Env, requestUrl: string): "Lax" | "None" {
  if (!shouldUseSecureCookie(env)) {
    return "Lax";
  }

  try {
    const appOrigin = new URL(env.APP_ORIGIN).origin;
    const apiOrigin = new URL(requestUrl).origin;
    return appOrigin === apiOrigin ? "Lax" : "None";
  } catch {
    return "Lax";
  }
}

function getSessionCookieOptions(
  env: Env,
  requestUrl: string,
  expires?: Date
): {
  path: "/";
  httpOnly: true;
  secure: boolean;
  sameSite: "Lax" | "None";
  expires?: Date;
} {
  return {
    path: "/",
    ...(expires ? { expires } : {}),
    httpOnly: true,
    secure: shouldUseSecureCookie(env),
    sameSite: getCookieSameSite(env, requestUrl)
  };
}

export const requireAuth = (role?: "admin" | "user"): AppMiddleware => {
  return async (c, next) => {
    const token = getCookie(c, getSessionCookieName());

    if (!token) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const tokenHash = await sha256(token);
    const sessionUser = await getSessionUser(c.env, tokenHash);

    if (!sessionUser) {
      deleteCookie(c, getSessionCookieName(), getSessionCookieOptions(c.env, c.req.url));
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (role && sessionUser.role !== role) {
      return c.json({ error: "Forbidden" }, 403);
    }

    c.set("sessionUser", sessionUser);
    await next();
  };
};

export async function persistSession(
  env: Env,
  c: Parameters<AppMiddleware>[0],
  userId: string,
  token: string,
  tokenHash: string
): Promise<void> {
  const expires = new Date();
  const ttlDays = Number(env.SESSION_TTL_DAYS ?? "7");
  expires.setUTCDate(expires.getUTCDate() + ttlDays);

  await createSession(env, userId, tokenHash, expires.toISOString());

  setCookie(c, getSessionCookieName(), token, getSessionCookieOptions(env, c.req.url, expires));
}

export async function clearSession(env: Env, c: Parameters<AppMiddleware>[0]): Promise<void> {
  const token = getCookie(c, getSessionCookieName());

  if (token) {
    await deleteSession(env, await sha256(token));
  }

  deleteCookie(c, getSessionCookieName(), getSessionCookieOptions(env, c.req.url));
}
