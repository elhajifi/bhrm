import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";

const filePath = path.join(process.cwd(), "data.json");

export async function POST(req) {
    const { email, password } = await req.json();

    if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email and password required" }), { status: 400 });
    }

    const data = await fs.readFile(filePath, "utf-8");
    const employees = JSON.parse(data);

    const employee = employees.find(
        e => e.profile.email === email && e.profile.password === password
    );

    if (!employee) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
    }

    // Save user info in a cookie
    const user = { id: employee.id, role: employee.profile.role, name: `${employee.profile.first_name} ${employee.profile.last_name}` };
    const cookieStore = await cookies();
    cookieStore.set("user", JSON.stringify(user), { path: "/" });

    return new Response(JSON.stringify({ user }), { status: 200 });
}
