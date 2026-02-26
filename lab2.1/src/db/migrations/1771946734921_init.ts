import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<never>): Promise<void> {
	await sql`
		CREATE TABLE users (
			id SERIAL PRIMARY KEY,
			tg_username VARCHAR(255) NOT NULL UNIQUE,
			password_hash TEXT, -- NULL на старті
			two_fa_secret TEXT, -- NULL до кроку 2
			is_verified BOOLEAN DEFAULT FALSE, -- TRUE після фіналу
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);

	-- Таблиця для тимчасових кодів верифікації (OTP)
		CREATE TABLE verification_codes (
			id SERIAL PRIMARY KEY,
			phone VARCHAR(20) NOT NULL,
			code VARCHAR(6) NOT NULL,
			expires_at TIMESTAMP NOT NULL
		);

-- Індекс для швидкого видалення прострочених кодів
		CREATE INDEX idx_verification_phone ON verification_codes(phone);
		
	`.execute(db);
}
