import bcrypt from "bcryptjs";

export async function hashPassword(plainText: string) {
  // bcrypt cost factor 12 is a common baseline.
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, passwordHash: string) {
  return bcrypt.compare(plainText, passwordHash);
}
