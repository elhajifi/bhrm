// Leave requests.
// POST   → any logged-in user requests leave for themselves.
// PATCH  → admin approves or rejects a pending request.
// DELETE → a user cancels one of their own pending requests.
import { update } from "@/lib/db";
import { error, json, requireUser, sanitizeEmployee } from "@/lib/auth";
import { LEAVE_TYPES, workingDays } from "@/lib/hr";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function overlaps(a, b) {
  return a.start_date <= b.end_date && b.start_date <= a.end_date;
}

export async function POST(req) {
  const { user, response } = await requireUser({ write: true });
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const type = body.type || "vacation";
  const start_date = String(body.start_date || "");
  const end_date = String(body.end_date || "");
  const reason = String(body.reason || "").trim();

  if (!LEAVE_TYPES.includes(type)) return error("Invalid leave type");
  if (!DATE_RE.test(start_date) || !DATE_RE.test(end_date)) return error("Start and end dates are required");
  if (end_date < start_date) return error("End date must be after start date");
  if (!reason) return error("Please give a reason");
  if (reason.length > 500) return error("Reason is too long");

  const days = workingDays(start_date, end_date);
  if (days === 0) return error("The selected period has no working days");

  const result = await update("employees", (list) => {
    const emp = list.find((e) => e.id === user.id);
    if (!emp) return { data: list, result: { error: "Employee not found", status: 404 } };

    emp.attendance_leave ??= { leave_balance: 0, leave_requests: [], history_of_leaves: [] };
    const al = emp.attendance_leave;
    al.leave_requests ??= [];
    al.history_of_leaves ??= [];

    const candidate = { start_date, end_date };
    const clash = [
      ...al.leave_requests,
      ...al.history_of_leaves.filter((l) => l.status === "approved"),
    ].some((l) => overlaps(l, candidate));
    if (clash) {
      return { data: list, result: { error: "You already have leave during this period", status: 409 } };
    }

    if (type === "vacation") {
      const pendingVacation = al.leave_requests
        .filter((l) => l.type === "vacation")
        .reduce((sum, l) => sum + workingDays(l.start_date, l.end_date), 0);
      const available = (Number(al.leave_balance) || 0) - pendingVacation;
      if (days > available) {
        return {
          data: list,
          result: {
            error: `Not enough leave balance: ${days} day(s) requested, ${available} available`,
            status: 400,
          },
        };
      }
    }

    const request = {
      id: Date.now(),
      type,
      start_date,
      end_date,
      days,
      reason,
      status: "pending",
      requested_at: new Date().toISOString(),
      approved_by: null,
    };
    al.leave_requests.push(request);
    return { data: list, result: { employee: emp, request } };
  });

  if (result.error) return error(result.error, result.status);
  return json({ request: result.request, employee: sanitizeEmployee(result.employee) }, 201);
}

export async function PATCH(req) {
  const { user, response } = await requireUser({ admin: true, write: true });
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const employeeId = Number(body.employeeId);
  const leaveId = Number(body.leaveId);
  const action = body.action;
  if (!employeeId || !leaveId) return error("employeeId and leaveId are required");
  if (!["approved", "rejected"].includes(action)) return error("Action must be 'approved' or 'rejected'");

  const result = await update("employees", (list) => {
    const emp = list.find((e) => e.id === employeeId);
    if (!emp) return { data: list, result: { error: "Employee not found", status: 404 } };
    const al = emp.attendance_leave;
    const index = (al?.leave_requests || []).findIndex((l) => l.id === leaveId);
    if (index === -1) return { data: list, result: { error: "Leave request not found", status: 404 } };

    const [leave] = al.leave_requests.splice(index, 1);
    const days = leave.days ?? workingDays(leave.start_date, leave.end_date);
    const decided = {
      ...leave,
      days,
      status: action,
      approved_by: user.name,
      decided_at: new Date().toISOString(),
    };

    if (action === "approved" && leave.type === "vacation") {
      al.leave_balance = Math.max(0, (Number(al.leave_balance) || 0) - days);
    }

    al.history_of_leaves = [...(al.history_of_leaves || []), decided];
    return { data: list, result: { employee: emp } };
  });

  if (result.error) return error(result.error, result.status);
  return json(sanitizeEmployee(result.employee));
}

export async function DELETE(req) {
  const { user, response } = await requireUser({ write: true });
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const leaveId = Number(body.leaveId);
  if (!leaveId) return error("leaveId is required");

  const result = await update("employees", (list) => {
    const emp = list.find((e) => e.id === user.id);
    const requests = emp?.attendance_leave?.leave_requests || [];
    const index = requests.findIndex((l) => l.id === leaveId);
    if (index === -1) return { data: list, result: { error: "Leave request not found", status: 404 } };
    requests.splice(index, 1);
    return { data: list, result: { employee: emp } };
  });

  if (result.error) return error(result.error, result.status);
  return json(sanitizeEmployee(result.employee));
}
