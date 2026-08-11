import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export const PASSWORD_HASH_PREFIX = "scrypt";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${PASSWORD_HASH_PREFIX}$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedPassword: string): Promise<boolean> {
  if (!storedPassword.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    const supplied = Buffer.from(password);
    const stored = Buffer.from(storedPassword);
    return supplied.length === stored.length && timingSafeEqual(supplied, stored);
  }

  const [, salt, storedKeyHex] = storedPassword.split("$");
  if (!salt || !storedKeyHex || storedKeyHex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(storedKeyHex)) return false;

  const storedKey = Buffer.from(storedKeyHex, "hex");
  const derivedKey = (await scrypt(password, salt, storedKey.length)) as Buffer;
  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}
