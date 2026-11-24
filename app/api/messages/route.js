// Internal messages.
// GET   → messages sent or received by the logged-in user.
// POST  → send a message (sender = logged-in user; admins can send to "all").
// PATCH → archive / unarchive / delete (to trash) / restore / purge / mark read.
// Archive and trash are per user: archiving a message doesn't hide it for the
// other person.
import { read, update } from "@/lib/db";
import { error, json, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ACTIONS = ["archive", "unarchive", "delete", "restore", "purge", "read"];

function fullName(emp) {
  return `${emp.profile?.first_name || ""} ${emp.profile?.last_name || ""}`.trim();
}

/** What the current user sees of a message. */
function view(msg, userId) {
  const has = (key) => (msg[key] || []).includes(userId);
  return {
    id: msg.id,
    from: msg.from,
    from_name: msg.from_name,
    to: msg.to,
    to_name: msg.to_name,
    subject: msg.subject,
    content: msg.content,
    date: msg.date,
    read: msg.to !== userId || msg.read === true,
    archived: has("archived_by"),
    deleted: has("deleted_by"),
  };
}

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const me = String(user.id);
  const messages = await read("messages");
  const mine = messages
    .filter((m) => (m.to === me || m.from === me) && !(m.purged_by || []).includes(me))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((m) => view(m, me));

  return json(mine);
}

export async function POST(req) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const subject = String(body.subject || "").trim();
  const content = String(body.content || "").trim();
  const to = String(body.to || "").trim();

  if (!to || !subject || !content) return error("Recipient, subject and content are required");
  if (subject.length > 200) return error("Subject is too long (max 200 characters)");
  if (content.length > 5000) return error("Message is too long (max 5000 characters)");

  const employees = await read("employees");
  let recipients;
  if (to === "all") {
    if (user.role !== "admin") return error("Only admins can message everyone", 403);
    recipients = employees.filter((e) => e.id !== user.id);
  } else {
    const target = employees.find((e) => String(e.id) === to);
    if (!target) return error("Recipient not found", 404);
    recipients = [target];
  }

  const now = Date.now();
  const created = recipients.map((r, i) => ({
    id: `${now}${String(i).padStart(3, "0")}`,
    from: String(user.id),
    from_name: user.name,
    to: String(r.id),
    to_name: fullName(r),
    subject,
    content,
    date: new Date(now).toISOString(),
    read: false,
    archived_by: [],
    deleted_by: [],
    purged_by: [],
  }));

  await update("messages", (list) => ({ data: [...created, ...list] }));

  const me = String(user.id);
  return json(created.map((m) => view(m, me)), 201);
}

export async function PATCH(req) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const action = body.action;
  if (!id) return error("Message id is required");
  if (!ACTIONS.includes(action)) return error("Unknown action");

  const me = String(user.id);
  const result = await update("messages", (list) => {
    const msg = list.find((m) => m.id === id);
    if (!msg || (msg.to !== me && msg.from !== me)) {
      return { data: list, result: { error: "Message not found" } };
    }
    const add = (key) => {
      msg[key] = Array.from(new Set([...(msg[key] || []), me]));
    };
    const remove = (key) => {
      msg[key] = (msg[key] || []).filter((u) => u !== me);
    };

    switch (action) {
      case "archive": add("archived_by"); remove("deleted_by"); break;
      case "unarchive": remove("archived_by"); break;
      case "delete": add("deleted_by"); remove("archived_by"); break;
      case "restore": remove("deleted_by"); break;
      case "purge": add("purged_by"); break;
      case "read": if (msg.to === me) msg.read = true; break;
    }

    // remove the message completely once both people purged it
    const participants = new Set([msg.to, msg.from]);
    const purgedByAll = [...participants].every((p) => (msg.purged_by || []).includes(p));
    const data = purgedByAll ? list.filter((m) => m.id !== id) : list;
    return { data, result: { message: view(msg, me) } };
  });

  if (result.error) return error(result.error, 404);
  return json(result.message);
}
