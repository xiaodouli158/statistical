import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppVariables, Env } from "./db/types";
import { pollDrawUntilSaved } from "./draw/fetch";
import { handleEmailProcessingQueue } from "./email/process";
import { handleEmail } from "./email/receive";
import type { EmailProcessingMessage } from "./email/types";
import { adminRoutes } from "./routes/admin";
import { userRoutes } from "./routes/user";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use("/api/*", async (c, next) =>
  cors({
    origin: c.env.APP_ORIGIN,
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
    credentials: true
  })(c, next)
);

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/user", userRoutes);
app.route("/api/admin", adminRoutes);

export default {
  fetch: app.fetch,
  email: handleEmail,
  queue: handleEmailProcessingQueue,
  scheduled: async (_controller: ScheduledController, env: Env) => {
    await pollDrawUntilSaved(env);
  }
} satisfies ExportedHandler<Env, EmailProcessingMessage>;
