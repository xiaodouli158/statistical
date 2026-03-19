import { Hono } from "hono";
import type { LoginRequest, LoginResponse, UpsertAccountRequest, UpsertUserRequest } from "@statisticalsystem/shared";
import { clearSession, persistSession, requireAuth } from "../auth/guard";
import { hashPassword, verifyPassword } from "../auth/password";
import { generateSessionToken, sha256 } from "../auth/session";
import {
  createAccount,
  createUser,
  getAdminData,
  getUserByUsername,
  listAccounts,
  listUsers,
  updateAccount,
  updateUser
} from "../db/queries";
import type { AppVariables, Env } from "../db/types";
import { syncDrawOnce } from "../draw/fetch";

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

  if (user.status !== "active") {
    return c.json({ error: "账号已停用" }, 403);
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

  if (!body?.username || !body.password) {
    return c.json({ error: "新增用户必须提供用户名和密码" }, 400);
  }

  const user = await createUser(c.env, {
    ...body,
    passwordHash: await hashPassword(body.password)
  });

  return c.json(user, 201);
});

adminRoutes.put("/users/:id", requireAuth("admin"), async (c) => {
  const body = await c.req.json<UpsertUserRequest>().catch(() => null);

  if (!body?.username) {
    return c.json({ error: "缺少用户名" }, 400);
  }

  const user = await updateUser(c.env, c.req.param("id"), {
    ...body,
    passwordHash: body.password ? await hashPassword(body.password) : undefined
  });

  if (!user) {
    return c.json({ error: "用户不存在" }, 404);
  }

  return c.json(user);
});

adminRoutes.get("/accounts", requireAuth("admin"), async (c) => {
  return c.json(await listAccounts(c.env));
});

adminRoutes.post("/accounts", requireAuth("admin"), async (c) => {
  const body = await c.req.json<(UpsertAccountRequest & { account: string })>().catch(() => null);

  if (!body?.account || !body.inbox) {
    return c.json({ error: "缺少 account 或 inbox" }, 400);
  }

  const account = await createAccount(c.env, body.account, body);
  return c.json(account, 201);
});

adminRoutes.put("/accounts/:account", requireAuth("admin"), async (c) => {
  const body = await c.req.json<UpsertAccountRequest>().catch(() => null);

  if (!body?.inbox) {
    return c.json({ error: "缺少 inbox" }, 400);
  }

  const account = await updateAccount(c.env, c.req.param("account"), body);

  if (!account) {
    return c.json({ error: "账号不存在" }, 404);
  }

  return c.json(account);
});

adminRoutes.get("/data", requireAuth("admin"), async (c) => {
  const account = c.req.query("account");
  const expect = c.req.query("expect");

  if (!account || !expect) {
    return c.json({ error: "缺少 account 或 expect" }, 400);
  }

  return c.json(await getAdminData(c.env, account, expect));
});

adminRoutes.post("/draws/sync", requireAuth("admin"), async (c) => {
  const targetExpect = c.req.query("expect") ?? undefined;
  const result = await syncDrawOnce(c.env, targetExpect);
  return c.json({ drawResult: result });
});

export { adminRoutes };
