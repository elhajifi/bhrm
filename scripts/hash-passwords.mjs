// One-off migration: replaces plain-text passwords in data.json with scrypt
// hashes. Safe to run several times (already-hashed passwords are skipped).
//   node scripts/hash-passwords.mjs
import { promises as fs } from "fs";
import crypto from "crypto";
import path from "path";

const file = path.join(process.env.DATA_DIR || process.cwd(), "data.json");
const employees = JSON.parse(await fs.readFile(file, "utf-8"));

let changed = 0;
for (const emp of employees) {
  const pwd = emp.profile?.password;
  if (pwd && !String(pwd).startsWith("scrypt$")) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(String(pwd), salt, 64).toString("hex");
    emp.profile.password = `scrypt$${salt}$${hash}`;
    changed++;
  }
}

await fs.writeFile(file, JSON.stringify(employees, null, 2));
console.log(`Hashed ${changed} password(s).`);
