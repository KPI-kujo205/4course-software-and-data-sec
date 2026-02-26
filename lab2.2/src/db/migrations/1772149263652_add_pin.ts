import type {Kysely} from "kysely";
import {sql} from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  await sql`
      alter table users
          add pin text;
  `.execute(db);
}
