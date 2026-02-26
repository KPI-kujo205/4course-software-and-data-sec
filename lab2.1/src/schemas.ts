import { z } from "zod";

export const Step1Schema = z.object({
	tg_username: z
		.string()
		.min(3)
		.max(32)
		.regex(/^[a-zA-Z0-9_]+$/),
});

export const Step2Schema = z.object({
	tg_username: z.string(),
	code: z.string().length(6).regex(/^\d+$/),
});

export const Step3Schema = z.object({
	password: z.string().min(8),
	two_fa_token: z.string().length(6),
});
