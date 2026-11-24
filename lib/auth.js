// Authentication helpers (server only).
// - Passwords are stored as scrypt hashes ("scrypt$<salt>$<hash>").
// - The session cookie holds "<employeeId>.<expiry>.<signature>", signed with
//   HMAC-SHA256, and is httpOnly, so it can't be read or forged in the browser.
// - Every request re-reads the employee, so role changes and deletions apply
//   immediately.
import crypto from "crypto";
import { cookies } from "next/headers";
import { read } from "./db";

export const SESSION_COOKIE = "bhrm_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

const DEV_SECRET = "dev-only-insecure-secret-change-me";
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production" && !secret.warned) {
    console.warn(
      "[auth] SESSION_SECRET is not set: using an insecure default. Set it in .env.local."
    );
    secret.warned = true;
  }
  return s || DEV_SECRET;
}

/* ---------------- passwords ---------------- */

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  if (!stored.startsWith("scrypt$")) {
    // legacy plain-text password (old data.json): compare in constant time
    const a = Buffer.from(String(password));
    const b = Buffer.from(stored);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  const [, salt, hash] = stored.split("$");
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

export function isHashed(stored) {
  return typeof stored === "string" && stored.startsWith("scrypt$");
}

/* ---------------- session token ---------------- */

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken(employeeId) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const body = `${employeeId}.${exp}`;
  return `${body}.${sign(body)}`;
}

function parseSessionToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  const expected = sign(`${id}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return null;
  return { id: Number(id) };
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

/* ---------------- current user ---------------- */

/** Public, password-free summary of an employee for the session. */
export function toSessionUser(emp) {
  const first = emp.profile?.first_name || "";
  const last = emp.profile?.last_name || "";
  return {
    id: emp.id,
    role: emp.profile?.role === "admin" ? "admin" : "employee",
    first_name: first,
    last_name: last,
    name: `${first} ${last}`.trim(),
    email: emp.profile?.email || "",
  };
}

/** Returns the logged-in user (without password) or null. */
export async function getSessionUser() {
  const store = await cookies();
  const session = parseSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const employees = await read("employees");
  const emp = employees.find((e) => e.id === session.id);
  return emp ? toSessionUser(emp) : null;
}

/* ---------------- API helpers ---------------- */

export function json(data, status = 200) {
  return Response.json(data, { status });
}

export function error(message, status = 400) {
  return Response.json({ error: message }, { status });
}

/**
 * Use at the top of a route handler:
 *   const { user, response } = await requireUser({ admin: true });
 *   if (response) return response;
 */
export async function requireUser({ admin = false } = {}) {
  const user = await getSessionUser();
  if (!user) return { response: error("Not authenticated", 401) };
  if (admin && user.role !== "admin") return { response: error("Admins only", 403) };
  return { user };
}

/** Remove secrets before sending an employee to the browser. */
export function sanitizeEmployee(emp) {
  if (!emp) return emp;
  const { password, ...profile } = emp.profile || {};
  return { ...emp, profile };
}
