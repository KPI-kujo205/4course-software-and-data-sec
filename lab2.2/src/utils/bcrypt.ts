import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export const hashPassword = (p: string) => bcrypt.hash(p, SALT_ROUNDS);
export const verifyPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);
