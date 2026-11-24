import { cookies } from "next/headers";
import { read, update } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSessionToken,
  error,
  hashPassword,
  isHashed,
  json,
  sessionCookieOptions,
  toSessionUser,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return error("Invalid request");
  }
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (!email || !password) return error("Email and password required");

  const employees = await read("employees");
  const employee = employees.find(
    (e) => String(e.profile?.email || "").toLowerCase() === email
  );

  if (!employee || !verifyPassword(password, employee.profile?.password)) {
    return error("Invalid email or password", 401);
  }

  // Upgrade an old plain-text password to a hash on first successful login
  if (!isHashed(employee.profile.password)) {
    await update("employees", (list) => {
      const target = list.find((e) => e.id === employee.id);
      if (target) target.profile.password = hashPassword(password);
      return { data: list };
    });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(employee.id), sessionCookieOptions);

  return json({ user: toSessionUser(employee) });
}
