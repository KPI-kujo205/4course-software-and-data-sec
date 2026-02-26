import { z } from "zod";
import "dotenv/config";

const schema = z.object({
	DATABASE_URL: z.string(),
	TG_BOT_TOKEN: z.string(),
	JWT_SECRET: z.string(),
});

export const env = schema.parse(process.env);
