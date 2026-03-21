import { Hono } from "hono";
import { normalizeLotteryType, type LoginRequest, type LoginResponse, type UpsertUserRequest } from "@statisticalsystem/shared";
import { clearSession, persistSession, requireAuth } from "../auth/guard";
import { hashPassword, verifyPassword } from "../auth/password";
import { generateSessionToken, sha256 } from "../auth/session";
import { createUser, getAdminData, getAdminExpectDetail, getUserByUsername, listExpectsForAccount, listUsers, updateUser } from "../db/queries";
import type { AppVariables, Env } from "../db/types";
import { syncDrawOnce } from "../draw/fetch";

const DEFAULT_USER_PASSWORD = "123456";
const SUPERADMIN_ACCOUNT = "c0000";

const adminRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

adminRoutes.post("/login", async (c) => {
  const body = await c.req.json<LoginRequest>().catch(() => null);

  if (!body?.username || !body.password) {
    return c.json({ error: "用户名和密码不能为空" }, 400);
  }

  const user = await getUserByUsername(c.env, body.username);

  if (!user || user.role !== "admin") {
    return c.json({ error: "账号或密码错误" }, 401);
  }

  if (user.status !== "active" || user.isExpired) {
    return c.json({ error: "账号不可用" }, 403);
  }

  let valid = false;

  if (user.account === SUPERADMIN_ACCOUNT) {
    if (!c.env.SUPER_PASSWORD) {
      return c.json({ error: "Superadmin password is not configured" }, 500);
    }

    valid = body.password === c.env.SUPER_PASSWORD;
  } else {
    valid = await verifyPassword(body.password, user.passwordHash);
  }

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

adminRoutes.post("/logout", requireAuth("admin"), async (c) => {
  await clearSession(c.env, c);
  return c.json({ ok: true });
});

adminRoutes.get("/me", requireAuth("admin"), async (c) => {
  return c.json({ user: c.get("sessionUser") });
});

adminRoutes.get("/users", requireAuth("admin"), async (c) => {
  return c.json(await listUsers(c.env));
});

adminRoutes.post("/users", requireAuth("admin"), async (c) => {
  const body = await c.req.json<UpsertUserRequest>().catch(() => null);

  if (!body?.username) {
    return c.json({ error: "缺少邮箱账号" }, 400);
  }

  try {
    const user = await createUser(c.env, {
      username: body.username,
      passwordHash: await hashPassword(body.password?.trim() || DEFAULT_USER_PASSWORD),
      role: body.role,
      status: body.status,
      memberExpiresOn: body.memberExpiresOn
    });

    return c.json(user, 201);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

adminRoutes.put("/users/:id", requireAuth("admin"), async (c) => {
  const body = await c.req.json<UpsertUserRequest>().catch(() => null);

  if (!body?.username) {
    return c.json({ error: "缺少邮箱账号" }, 400);
  }

  try {
    const user = await updateUser(c.env, c.req.param("id"), {
      username: body.username,
      passwordHash: body.password ? await hashPassword(body.password) : undefined,
      role: body.role,
      status: body.status,
      memberExpiresOn: body.memberExpiresOn
    });

    if (!user) {
      return c.json({ error: "用户不存在" }, 404);
    }

    return c.json(user);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

adminRoutes.get("/data/expects", requireAuth("admin"), async (c) => {
  const account = c.req.query("account");
  const lotteryType = normalizeLotteryType(c.req.query("lottery"));

  if (!account) {
    return c.json({ error: "缺少编号" }, 400);
  }

  return c.json(await listExpectsForAccount(c.env, account, lotteryType));
});

adminRoutes.get("/data/expects/:expect", requireAuth("admin"), async (c) => {
  const account = c.req.query("account");
  const lotteryType = normalizeLotteryType(c.req.query("lottery"));

  if (!account) {
    return c.json({ error: "缺少编号" }, 400);
  }

  const detail = await getAdminExpectDetail(c.env, account, lotteryType, c.req.param("expect"));

  if (!detail) {
    return c.json({ error: "数据不存在" }, 404);
  }

  return c.json(detail);
});

adminRoutes.get("/data", requireAuth("admin"), async (c) => {
  const account = c.req.query("account");
  const expect = c.req.query("expect");
  const lotteryType = normalizeLotteryType(c.req.query("lottery"));

  if (!account || !expect) {
    return c.json({ error: "缺少编号或期数" }, 400);
  }

  return c.json(await getAdminData(c.env, account, expect, lotteryType));
});

adminRoutes.post("/draws/sync", requireAuth("admin"), async (c) => {
  const targetExpect = c.req.query("expect") ?? undefined;
  const lotteryType = normalizeLotteryType(c.req.query("lottery"));
  const result = await syncDrawOnce(c.env, lotteryType, targetExpect);
  return c.json({ drawResult: result });
});

export { adminRoutes };
