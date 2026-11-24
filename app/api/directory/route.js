// Minimal list of colleagues (no salaries, no passwords), used e.g. to pick a
// message recipient. Available to every logged-in user.
import { read } from "@/lib/db";
import { json, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireUser();
  if (response) return response;

  const employees = await read("employees");
  return json(
    employees.map((e) => ({
      id: e.id,
      name: `${e.profile?.first_name || ""} ${e.profile?.last_name || ""}`.trim(),
      job_title: e.profile?.job_title || "",
      department: e.profile?.department || "",
    }))
  );
}
