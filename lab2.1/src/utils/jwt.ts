import { sign, verify } from "hono/jwt";
import type { JWTPayload } from "hono/utils/jwt/types";
import { err, ok, ResultAsync } from "neverthrow";
import { generateSecret } from "otplib";
import { env } from "./env";

const ALGORITHM = "HS256";

export interface RegistrationPayload extends JWTPayload {
	tg_username: string;
	reg_2fa_secret: string;
	exp: number;
	sub: string;
}

export function createRegToken(
	tg_username: string,
): ResultAsync<string, Error> {
	const two_fa_secret = generateSecret();

	const payload = {
		tg_username,
		reg_2fa_secret: two_fa_secret,
		sub: "registration",
		exp: Math.floor(Date.now() / 1000) + 600,
	} satisfies RegistrationPayload;

	return ResultAsync.fromPromise(
		sign(payload, env.JWT_SECRET, ALGORITHM),
		(e) => new Error(`JWT_SIGN_FAILED: ${e}`),
	);
}

export function decodeRegToken(
	token: string,
): ResultAsync<RegistrationPayload, Error> {
	return ResultAsync.fromPromise(
		verify(token, env.JWT_SECRET, ALGORITHM),
		(e) => new Error(`JWT_VERIFY_FAILED: ${e}`),
	).andThen((payload) => {
		// Перевіряємо, чи структура відповідає нашому інтерфейсу
		if (
			payload &&
			typeof payload.tg_username === "string" &&
			payload.sub === "registration"
		) {
			return ok(payload as RegistrationPayload);
		}
		return err(new Error("INVALID_TOKEN_PAYLOAD"));
	});
}
