// Admin: generate this month's payslip for every employee.
// A payslip is a snapshot of the pay at that moment, so later salary changes
// don't rewrite old payslips. Running it twice for the same month does nothing.
import { update } from "@/lib/db";
import { error, json, requireUser } from "@/lib/auth";
import { MONTHS, computePay } from "@/lib/hr";

export async function POST(req) {
  const { user, response } = await requireUser({ admin: true });
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const now = new Date();
  const month = body.month || MONTHS[now.getMonth()];
  const year = Number(body.year) || now.getFullYear();
  if (!MONTHS.includes(month)) return error("Invalid month");

  const result = await update("employees", (list) => {
    let created = 0;
    let skipped = 0;
    list.forEach((emp, i) => {
      emp.payroll ??= {};
      emp.payroll.payslips ??= [];
      const exists = emp.payroll.payslips.some((p) => p.month === month && Number(p.year) === year);
      if (exists) {
        skipped++;
        return;
      }
      emp.payroll.payslips.push({
        id: Date.now() + i,
        month,
        year,
        generated_at: new Date().toISOString(),
        generated_by: user.name,
        ...computePay(emp.payroll),
      });
      created++;
    });
    return { data: list, result: { created, skipped, month, year } };
  });

  return json(result);
}
