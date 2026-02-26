import 'dotenv/config';
import { Kysely, PostgresDialect } from 'kysely';
import { defineConfig } from 'kysely-ctl';
import { Pool } from 'pg';

export default defineConfig({
	kysely: new Kysely({
		dialect: new PostgresDialect({
			pool: async () =>
				new Pool({
					connectionString: process.env.DATABASE_URL
				})
		})
	}),
	migrations: {
		migrationFolder: 'src/db/migrations'
	}
});
