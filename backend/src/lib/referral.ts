import { UserModel } from "@/models/User";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoids ambiguous chars

function randomCode(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export async function generateUniqueReferralCode(length = 8) {
  // Try a few times to avoid a race on unique index.
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode(length);
    const exists = await UserModel.exists({ referralCode: code });
    if (!exists) return code;
  }
  throw new Error("Unable to generate unique referral code");
}
