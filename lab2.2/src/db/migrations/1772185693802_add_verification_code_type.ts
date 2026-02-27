import {type Kysely, sql} from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  await sql`create
  type verification_code_type as enum ('signup', 'reset')`.execute(db);

  await sql`
      alter table verification_codes
          add column type verification_code_type not null default 'signup'
  `.execute(db);
}
