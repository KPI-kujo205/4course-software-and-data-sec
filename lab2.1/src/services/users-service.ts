import { err, fromPromise } from "neverthrow";
import { db } from "@/db";

export function rememberUserIdAndTag(
	tg_username?: string,
	tg_user_id?: number,
) {
	if (!tg_user_id) {
		return err("tg_user_id is required here");
	}

	if (!tg_username) {
		return err("tg_username is required here");
	}

	const promise = db
		.insertInto("users")
		.values({
			tg_user_id: BigInt(tg_user_id),
			tg_username: tg_username,
		})
		.onConflict((oc) => {
			return oc.column("tg_username").doUpdateSet({
				tg_username: tg_username,
				tg_user_id: BigInt(tg_user_id),
			});
		})
		.execute();

	return fromPromise(promise, (error) => {
		return error;
	});
}
