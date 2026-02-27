import type {Context, Next} from "hono";
import {decodeSessionToken, type SessionPayload} from "@/utils/session-jwt";

const PIN_TIMEOUT_SECONDS = 0.5 * 60; // 30 secs

const SKIP_PATHS = ["/auth/verify-pin"];

type Variables = {
  session: SessionPayload;
};

export const verifySession = async (
  c: Context<{ Variables: Variables }>,
  next: Next,
) => {
  const path = c.req.path;

  console.log("Verifying session for path:", path);

  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return c.json({error: "Session token required"}, 401);
  }

  const result = await decodeSessionToken(token);

  if (result.isErr()) {
    console.error(result.error);
    return c.json({error: "Invalid or expired session"}, 401);
  }

  const payload = result.value;
  const currentTime = Math.floor(Date.now() / 1000);
  const timeSinceLastPin = currentTime - payload.last_pin_at;

  if (timeSinceLastPin > PIN_TIMEOUT_SECONDS && !SKIP_PATHS.includes(path)) {
    return c.json(
      {
        error: "PIN_REQUIRED",
        message: "Time limit exceeded. Please verify your PIN.",
      },
      403,
    );
  }

  // 3. Успіх: встановлюємо сесію та йдемо далі
  c.set("session", payload);
  await next();
};
