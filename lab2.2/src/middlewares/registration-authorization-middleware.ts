import type { Context, Next } from "hono";
import { decodeRegToken } from "@/utils/registration-jwt";

export const verifyRegistration = async (c: Context, next: Next) => {
	const authHeader = c.req.header("Authorization");

	const token = authHeader?.startsWith("Bearer ")
		? authHeader.split(" ")[1]
		: null;

	if (!token) {
		return c.json({ error: "Authorization token required" }, 401);
	}

	const result = await decodeRegToken(token);

	return result.match(
		async (payload) => {
			c.set("reg_username", payload.tg_username);
			c.set("reg_2fa_secret", payload.reg_2fa_secret);
			await next();
		},
		(error) => {
			return c.json({ error: "Invalid or expired registration session" }, 401);
		},
	);
};
