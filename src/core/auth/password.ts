import argon2 from "argon2";

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) throw new Error("PASSWORD_TOO_SHORT");
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(hash, password);
}