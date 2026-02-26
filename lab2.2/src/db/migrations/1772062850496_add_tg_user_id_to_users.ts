import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
	await sql`
      alter table users
          add tg_user_id bigint;
  `.execute(db);
}
