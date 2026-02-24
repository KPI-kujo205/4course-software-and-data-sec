import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<never>): Promise<void> {
	await sql`
		CREATE TABLE users (
			id SERIAL PRIMARY KEY,
			phone VARCHAR(20) NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			two_fa_secret TEXT, -- NULL за замовчуванням
			is_verified BOOLEAN DEFAULT FALSE,
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
