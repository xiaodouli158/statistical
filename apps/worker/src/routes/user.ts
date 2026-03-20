import { Hono } from "hono";
import { normalizeLotteryType, type LoginRequest, type LoginResponse } from "@statisticalsystem/shared";
import { clearSession, persistSession, requireAuth } from "../auth/guard";
import { verifyPassword } from "../auth/password";
import { generateSessionToken, sha256 } from "../auth/session";
import { getExpectDetail, getUserByUsername, listExpectsForAccount } from "../db/queries";
import type { AppVariables, Env } from "../db/types";

const userRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

userRoutes.post("/login", async (c) => {
  const body = await c.req.json<LoginRequest>().catch(() => null);

  if (!body?.username || !body.password) {
    return c.json({ error: "邮箱账号和密码不能为空" }, 400);
  }

  const user = await getUserByUsername(c.env, body.username);

  if (!user || user.role !== "user") {
    return c.json({ error: "账号或密码错误" }, 401);
  }

  if (user.status !== "active") {
    return c.json({ error: "账号已停用" }, 403);
  }

  if (user.isExpired) {
    return c.json({ error: "会员已到期" }, 403);
  }

  const valid = await verifyPassword(body.password, user.passwordHash);

  if (!valid) {
    return c.json({ error: "账号或密码错误" }, 401);
  }

  const token = await generateSessionToken();
  const tokenHash = await sha256(token);

  await persistSession(c.env, c, user.id, token, tokenHash);

  const response: LoginResponse = {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      account: user.account
    }
  };

  return c.json(response);
});

userRoutes.post("/logout", requireAuth("user"), async (c) => {
  await clearSession(c.env, c);
  return c.json({ ok: true });
});

userRoutes.get("/me", requireAuth("user"), async (c) => {
  return c.json({ user: c.get("sessionUser") });
});

userRoutes.get("/expects", requireAuth("user"), async (c) => {
  const sessionUser = c.get("sessionUser");
  const lotteryType = normalizeLotteryType(c.req.query("lottery"));
  return c.json(await listExpectsForAccount(c.env, sessionUser.account, lotteryType));
});

userRoutes.get("/expects/:expect", requireAuth("user"), async (c) => {
  const sessionUser = c.get("sessionUser");
  const lotteryType = normalizeLotteryType(c.req.query("lottery"));
  const detail = await getExpectDetail(c.env, sessionUser.account, lotteryType, c.req.param("expect"));

  if (!detail) {
    return c.json({ error: "数据不存在" }, 404);
  }

  return c.json(detail);
});

export { userRoutes };
