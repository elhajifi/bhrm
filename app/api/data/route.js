// Employees API.
// GET    → admins get everyone, employees get only their own record.
// POST   → admin: create an employee.
// PUT    → admin: update an employee.
// DELETE → admin: delete an employee.
// Passwords are never sent back to the browser.
import { read, update } from "@/lib/db";
import { error, hashPassword, json, requireUser, sanitizeEmployee } from "@/lib/auth";
import { CONTRACT_TYPES, ROLES, toNumber } from "@/lib/hr";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function cleanProjects(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((p) => p && String(p.name || "").trim())
    .map((p, i) => ({
      project_id: p.project_id ?? Date.now() + i,
      name: String(p.name).trim(),
      start_date: DATE_RE.test(p.start_date || "") ? p.start_date : "",
      status: String(p.status || "ongoing").trim() || "ongoing",
    }));
}

/** Validates and normalises the editable fields. Returns { values } or { error }. */
function validate(body, { creating }) {
  const p = body?.profile || {};
  const out = { profile: {}, payroll: {}, attendance_leave: {}, documents: {} };

  const first = String(p.first_name ?? "").trim();
  const last = String(p.last_name ?? "").trim();
  if (creating || p.first_name !== undefined) {
    if (!first) return { error: "First name is required" };
    out.profile.first_name = first;
  }
  if (creating || p.last_name !== undefined) {
    if (!last) return { error: "Last name is required" };
    out.profile.last_name = last;
  }
  if (creating || p.email !== undefined) {
    const email = String(p.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { error: "A valid email is required" };
    out.profile.email = email;
  }
  if (creating || (p.password !== undefined && p.password !== "")) {
    const pwd = String(p.password ?? "");
    if (pwd.length < 4) return { error: "Password must be at least 4 characters" };
    out.profile.password = hashPassword(pwd);
  }
  if (creating || p.role !== undefined) {
    const role = p.role || "employee";
    if (!ROLES.includes(role)) return { error: "Invalid role" };
    out.profile.role = role;
  }
  if (creating || p.contract !== undefined) {
    const contract = p.contract || "CDI";
    if (!CONTRACT_TYPES.includes(contract)) return { error: "Invalid contract type" };
    out.profile.contract = contract;
  }
  if (creating || p.hire_date !== undefined) {
    const hire = p.hire_date || new Date().toISOString().slice(0, 10);
    if (!DATE_RE.test(hire)) return { error: "Invalid hire date" };
    out.profile.hire_date = hire;
  }
  for (const key of ["job_title", "department"]) {
    if (creating || p[key] !== undefined) out.profile[key] = String(p[key] ?? "").trim();
  }
  if (creating || p.work_days_per_year !== undefined) {
    const days = toNumber(p.work_days_per_year, 220);
    if (days <= 0 || days > 366) return { error: "Work days per year must be between 1 and 366" };
    out.profile.work_days_per_year = days;
  }
  if (creating || p.current_projects !== undefined) {
    out.profile.current_projects = cleanProjects(p.current_projects);
  }

  const pay = body?.payroll || {};
  for (const key of ["salary_amount", "overtime_hours", "bonuses", "deductions"]) {
    if (creating || pay[key] !== undefined) {
      const n = toNumber(pay[key], NaN);
      if (pay[key] !== undefined && pay[key] !== "" && (!Number.isFinite(n) || n < 0)) {
        return { error: `${key.replace("_", " ")} must be a positive number` };
      }
      out.payroll[key] = Number.isFinite(n) ? n : 0;
    }
  }

  const leave = body?.attendance_leave || {};
  if (creating || leave.leave_balance !== undefined) {
    const n = toNumber(leave.leave_balance, 0);
    if (n < 0) return { error: "Leave balance can't be negative" };
    out.attendance_leave.leave_balance = n;
  }

  const docs = body?.documents || {};
  for (const key of ["contracts", "certificates", "id_documents"]) {
    if (creating || docs[key] !== undefined) out.documents[key] = cleanList(docs[key]);
  }

  return { values: out };
}

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const employees = await read("employees");
  const visible = user.role === "admin" ? employees : employees.filter((e) => e.id === user.id);
  return json(visible.map(sanitizeEmployee));
}

export async function POST(req) {
  const { response } = await requireUser({ admin: true, write: true });
  if (response) return response;

  const body = await req.json().catch(() => null);
  const { values, error: msg } = validate(body, { creating: true });
  if (msg) return error(msg);

  const result = await update("employees", (list) => {
    if (list.some((e) => e.profile?.email?.toLowerCase() === values.profile.email)) {
      return { data: list, result: { error: "This email is already used" } };
    }
    const newId = list.reduce((max, e) => Math.max(max, Number(e.id) || 0), 999) + 1;
    const employee = {
      id: newId,
      profile: values.profile,
      attendance_leave: {
        leave_balance: values.attendance_leave.leave_balance,
        leave_requests: [],
        history_of_leaves: [],
      },
      payroll: { ...values.payroll, payslips: [] },
      documents: values.documents,
    };
    return { data: [...list, employee], result: { employee } };
  });

  if (result.error) return error(result.error, 409);
  return json(sanitizeEmployee(result.employee), 201);
}

export async function PUT(req) {
  const { user, response } = await requireUser({ admin: true, write: true });
  if (response) return response;

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return error("Employee ID required");

  const { values, error: msg } = validate(body, { creating: false });
  if (msg) return error(msg);

  if (id === user.id && values.profile.role && values.profile.role !== "admin") {
    return error("You can't remove your own admin role");
  }

  const result = await update("employees", (list) => {
    const emp = list.find((e) => e.id === id);
    if (!emp) return { data: list, result: { error: "Employee not found", status: 404 } };

    if (
      values.profile.email &&
      list.some((e) => e.id !== id && e.profile?.email?.toLowerCase() === values.profile.email)
    ) {
      return { data: list, result: { error: "This email is already used", status: 409 } };
    }

    emp.profile = { ...emp.profile, ...values.profile };
    emp.payroll = { payslips: [], ...emp.payroll, ...values.payroll };
    emp.attendance_leave = {
      leave_requests: [],
      history_of_leaves: [],
      ...emp.attendance_leave,
      ...values.attendance_leave,
    };
    emp.documents = { ...emp.documents, ...values.documents };
    return { data: list, result: { employee: emp } };
  });

  if (result.error) return error(result.error, result.status);
  return json(sanitizeEmployee(result.employee));
}

export async function DELETE(req) {
  const { user, response } = await requireUser({ admin: true, write: true });
  if (response) return response;

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return error("Employee ID required");
  if (id === user.id) return error("You can't delete your own account");

  const removed = await update("employees", (list) => {
    const next = list.filter((e) => e.id !== id);
    return { data: next, result: next.length !== list.length };
  });

  if (!removed) return error("Employee not found", 404);
  return json({ success: true });
}
