import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import "@/services/tg-bot.js";
import { verifyRegistration } from "@/middlewares/authorization-middleware";
import zodValidatorMiddleware from "@/middlewares/zod-validator-middleware";
import { Step1Schema, Step2Schema, Step3Schema } from "@/schemas";
import { sendMessageToUser } from "@/services/tg-bot";
import {
	createUser,
	generateOtpStoreInDb,
	getTgUserIdByUsername,
	verifyOtpInDb,
} from "@/services/users-service";
import { hashPassword } from "@/utils/bcrypt";
import { createRegToken } from "@/utils/jwt";
import { generateQRCode } from "@/utils/otp";

type Variables = {
	reg_username: string;
	reg_2fa_secret: string;
};

const app = new Hono<{ Variables: Variables }>();

app.get("/ping", (c) => {
	return c.text("pong");
});

app.get("/info", (c) => {
	return c.html(
		'<a href="https://t.me/lab2_1_ivan_bot?start=auth">link to the bot</a>',
	);
});

app.post(
	"/register/step1",
	zodValidatorMiddleware("json", Step1Schema),
	async (c) => {
		const { tg_username } = c.req.valid("json");

		const userRes = await getTgUserIdByUsername(tg_username);

		if (userRes.isErr()) {
			return c.json(
				{
					error:
						"User not found, make sure you visited https://t.me/lab2_1_ivan_bot?start=auth",
				},
				404,
			);
		}

		const otpRes = await generateOtpStoreInDb(tg_username);

		if (otpRes.isErr()) {
			return c.json({ error: "Failed to generate OTP, try later" }, 500);
		}

		await sendMessageToUser(
			Number(userRes.value),
			`Your OTP code: ${otpRes.value}\n\nIt expires in 10 minutes. Don't report it to anyone!`,
		);

		return c.json(
			"OTP code sent to your Telegram, please check and proceed to step 2",
		);
	},
);

app.post(
	"/register/step2",
	zodValidatorMiddleware("json", Step2Schema),
	async (c) => {
		const { tg_username, code } = c.req.valid("json");

		const verificationResult = await verifyOtpInDb(tg_username, code);

		if (verificationResult.isErr()) {
			return c.json({ error: verificationResult.error }, 400);
		}

		const tokenResult = await createRegToken(tg_username);

		return tokenResult.match(
			(token) => {
				return c.json({
					success: true,
					registrationToken: token,
				});
			},
			(err) => c.json({ error: err }, 500),
		);
	},
);

app.post(
	"/register/step3",
	verifyRegistration,
	zodValidatorMiddleware("json", Step3Schema),
	async (c) => {
		const hashedPassword = await hashPassword(c.req.valid("json").password);

		const res = await createUser({
			tg_username: c.get("reg_username"),
			reg_2fa_secret: c.get("reg_2fa_secret"),
			password_hash: hashedPassword,
			two_fa_token: c.req.valid("json").two_fa_token,
		});

		if (res.isOk()) {
			return c.json({
				success: true,
				message: "Registration completed successfully",
			});
		} else {
			return c.json({ error: res.error }, 400);
		}
	},
);

app.get("/2fa/setup", verifyRegistration, async (c) => {
	const reg_username = c.get("reg_username");
	const reg_2fa_secret = c.get("reg_2fa_secret");

	const qrCodeBuffer = await generateQRCode(reg_username, reg_2fa_secret);

	if (qrCodeBuffer.isOk()) {
		const buffer = qrCodeBuffer.value;

		const uint8Array = new Uint8Array(buffer);

		return c.newResponse(uint8Array, 200, {
			"Content-Type": "image/png",
			"Content-Length": uint8Array.length.toString(),
		});
	}

	return c.json({ error: qrCodeBuffer.error }, 500);
});

serve(
	{
		fetch: app.fetch,
		port: 3000,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
	},
);
