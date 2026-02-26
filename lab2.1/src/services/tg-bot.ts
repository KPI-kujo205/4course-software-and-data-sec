import { Bot } from "grammy";
import { rememberUserIdAndTag } from "@/services/users-service";

const TG_BOT_TOKEN = String(process.env.TG_BOT_TOKEN);

const bot = new Bot(TG_BOT_TOKEN);

bot.command("start", async (ctx) => {
	const tag = ctx.message?.from.username;
	const fromChatId = ctx.message?.from.id;

	const response = await rememberUserIdAndTag(tag, fromChatId);

	if (response.isOk()) {
		await ctx.reply(
			"Thanks for the interest in the bot, we will keep you updated!",
		);
	} else {
		await ctx.reply(
			`Something bad occurred: ${JSON.stringify(response.error)}`,
		);
	}
});

bot.on("message", (ctx) => ctx.reply("Hi there!"));

bot.catch((err) => {
	console.error(`Error in bot ${err.ctx.update.update_id}:`, err.error);
});

bot.start();
