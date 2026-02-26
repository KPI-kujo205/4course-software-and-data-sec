import 'dotenv/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { DB } from './types.js';

const dialect = new PostgresDialect({
	pool: async () =>
		new Pool({
			connectionString: process.env.DATABASE_URL
		})
});

export const db = new Kysely<DB>({
	dialect: dialect
});

export type { DB };
