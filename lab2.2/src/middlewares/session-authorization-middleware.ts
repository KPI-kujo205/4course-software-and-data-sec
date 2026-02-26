import type {Context, Next} from "hono";
import {decodeSessionToken, type SessionPayload} from "@/utils/session-jwt";

const PIN_TIMEOUT_SECONDS = 10 * 60; // 10 mins

type Variables = {
  session: SessionPayload;
};

export const verifySession = async (
  c: Context<{ Variables: Variables }>,
  next: Next,
) => {
  const authHeader = c.req.header("Authorization");

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return c.json({error: "Session token required"}, 401);
  }

  const result = await decodeSessionToken(token);

  return result.match(
    async (payload) => {
      const currentTime = Math.floor(Date.now() / 1000);
      const timeSinceLastPin = currentTime - payload.last_pin_at;

      // Перевірка умови "кожні N часу"
      if (timeSinceLastPin > PIN_TIMEOUT_SECONDS) {
        return c.json(
          {
            error: "PIN_REQUIRED",
            message: "Time limit exceeded. Please verify your PIN.",
          },
          403,
        );
      }

      c.set("session", payload);
      await next();
    },
    (error) => {
      return c.json({error: "Invalid or expired session"}, 401);
    },
  );
};
