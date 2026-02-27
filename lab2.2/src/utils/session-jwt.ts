import {sign, verify} from "hono/jwt";
import type {JWTPayload} from "hono/utils/jwt/types";
import {err, ok, ResultAsync} from "neverthrow";
import {env} from "@/utils/env";

export interface SessionPayload extends JWTPayload {
  user_id: string | number;
  tg_username: string;
  last_pin_at: number; // last access pin timestamp
  exp: number;
  sub: string;
}

const ALGORITHM = "HS256";

export function createSessionToken(
  user_id: string | number,
  tg_username: string,
) {
  const payload = {
    user_id,
    tg_username,
    sub: "session",
    last_pin_at: Math.floor(Date.now() / 1000), //
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 h
  } satisfies SessionPayload;

  return ResultAsync.fromPromise(
    sign(payload, env.JWT_SECRET, ALGORITHM),
    (e) => new Error(`SESSION_JWT_SIGN_FAILED: ${e}`),
  );
}

export function createRefreshedPinToken(
  oldPayload: SessionPayload,
): ResultAsync<string, Error> {
  const payload = {
    ...oldPayload,
    last_pin_at: Math.floor(Date.now() / 1000), // Оновлюємо тільки час PIN
  } satisfies SessionPayload;

  return ResultAsync.fromPromise(
    sign(payload, env.JWT_SECRET, ALGORITHM),
    (e) => new Error(`PIN_REFRESH_JWT_SIGN_FAILED: ${e}`),
  );
}

export function decodeSessionToken(
  token: string,
): ResultAsync<SessionPayload, Error> {
  return ResultAsync.fromPromise(
    verify(token, env.JWT_SECRET, ALGORITHM),
    (e) => new Error(`SESSION_JWT_VERIFY_FAILED: ${e}`),
  ).map((payload) => {
    // Видаляємо всі if-перевірки. Просто кастимо до нашого інтерфейсу.
    // Оскільки ми використовуємо .map, він поверне ok(payload) автоматично.
    return payload as unknown as SessionPayload;
  });
}
