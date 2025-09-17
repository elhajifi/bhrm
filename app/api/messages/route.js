import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";

const filePath = path.join(process.cwd(), "messages.json");
const employeesPath = path.join(process.cwd(), "data.json");

// helper: safely find employee name
async function getEmployeeName(id) {
  try {
    const employeesData = JSON.parse(
      await fs.readFile(employeesPath, "utf-8")
    );
    const emp = employeesData.find((e) => String(e.id) === String(id));
    if (emp?.profile) {
      return `${emp.profile.first_name} ${emp.profile.last_name}`;
    }
  } catch (err) {
    console.error("Could not read data.json", err);
  }
  return String(id); // fallback if not found
}

// GET all messages
export async function GET() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user");

  if (!userCookie) {
    return new Response(JSON.stringify([]), { status: 200 });
  }

  const user = JSON.parse(userCookie.value);
  const userId = String(user.id);

  const data = await fs.readFile(filePath, "utf-8").catch(() => "[]");
  const messages = JSON.parse(data);

  // Filter messages related to this user
  const filtered = messages.filter(
    (msg) => msg.to === userId || msg.from === userId
  );

  return new Response(JSON.stringify(filtered), { status: 200 });
}

// POST a new message
export async function POST(req) {
  const body = await req.json();
  let { to, subject, content, from } = body;

  if (!subject || !content || !to || !from) {
    return new Response(JSON.stringify({ error: "Missing fields" }), {
      status: 400,
    });
  }

  subject = String(subject).trim();
  content = String(content).trim();
  to = String(to).trim();
  from = String(from).trim();

  if (subject.length > 200 || content.length > 5000) {
    return new Response(JSON.stringify({ error: "Message too long" }), {
      status: 400,
    });
  }

  const data = await fs.readFile(filePath, "utf-8").catch(() => "[]");
  const messages = JSON.parse(data);

  // ✅ Fetch correct names
  const from_name = await getEmployeeName(from);
  const to_name = await getEmployeeName(to);

  const newMessage = {
    id: String(Date.now()),
    to,
    to_name,
    subject,
    content,
    from,
    from_name,
    date: new Date().toISOString(),
    status: "inbox",
  };

  messages.unshift(newMessage);

  await fs.writeFile(filePath, JSON.stringify(messages, null, 2));

  return new Response(JSON.stringify(newMessage), { status: 201 });
}
