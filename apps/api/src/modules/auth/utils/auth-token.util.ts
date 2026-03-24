import * as bcrypt from "bcrypt";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashRefreshToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

export async function verifyRefreshToken(
  token: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(token, hash);
}
