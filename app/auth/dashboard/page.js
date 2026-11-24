"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  BanknotesIcon,
  BellAlertIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useUser } from "@/components/UserContext";
import { Notice, Spinner, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { absenteeismRate, approvedLeaveDays, computePay, formatMoney, workingDays } from "@/lib/hr";

const COLORS = ["#2563eb", "#60a5fa", "#93c5fd", "#1e40af"];
const ABSENTEEISM_ALERT = 3; // % of yearly work days

export default function DashboardPage() {
  const user = useUser();
  const [profiles, setProfiles] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/data")
      .then(setProfiles)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="p-6"><Notice notice={{ type: "error", text: error }} /></div>;
  if (!profiles) return <Spinner />;

  if (user.role !== "admin") {
    const me = profiles.find((p) => p.id === user.id);
    return me ? <EmployeeDashboard emp={me} /> : <Spinner />;
  }
  return <AdminDashboard profiles={profiles} />;
}

/* ============================== Admin ============================== */

function AdminDashboard({ profiles }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const kpis = useMemo(() => {
    const byContract = {};
    const byDepartment = {};
    let workDays = 0;
    let absentDays = 0;
    let vacationUsed = 0;
    let balance = 0;
    const pay = { salary: 0, overtimePay: 0, bonuses: 0, deductions: 0, gross: 0, net: 0 };
    let pending = 0;

    profiles.forEach((emp) => {
      const contract = emp.profile?.contract || "Unknown";
      byContract[contract] = (byContract[contract] || 0) + 1;
      const dept = emp.profile?.department || "Unassigned";
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;

      workDays += Number(emp.profile?.work_days_per_year) || 220;
      absentDays += approvedLeaveDays(emp);
      vacationUsed += (emp.attendance_leave?.history_of_leaves || [])
        .filter((l) => l.status === "approved" && l.type === "vacation")
        .reduce((s, l) => s + workingDays(l.start_date, l.end_date), 0);
      balance += Number(emp.attendance_leave?.leave_balance) || 0;
      pending += (emp.attendance_leave?.leave_requests || []).length;

      const p = computePay(emp.payroll);
      for (const key of Object.keys(pay)) pay[key] += p[key];
    });

    return {
      total: profiles.length,
      byContract: Object.entries(byContract).map(([name, count]) => ({ name, count })),
      byDepartment: Object.entries(byDepartment)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      absenteeism: workDays ? (absentDays / workDays) * 100 : 0,
      leaveUsage: vacationUsed + balance ? (vacationUsed / (vacationUsed + balance)) * 100 : 0,
      pay,
      pending,
    };
  }, [profiles]);

  const alerts = profiles
    .map((emp) => ({ emp, rate: absenteeismRate(emp) }))
    .filter((a) => a.rate > ABSENTEEISM_ALERT)
    .sort((a, b) => b.rate - a.rate);

  const recentHires = [...profiles]
    .sort((a, b) => String(b.profile?.hire_date).localeCompare(String(a.profile?.hire_date)))
    .slice(0, 4);

  const people = profiles.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return [p.profile?.first_name, p.profile?.last_name, p.profile?.department, p.profile?.job_title]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const payrollPie = [
    { name: "Base salaries", value: kpis.pay.salary },
    { name: "Overtime", value: kpis.pay.overtimePay },
    { name: "Bonuses", value: kpis.pay.bonuses },
  ].filter((d) => d.value > 0);

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-800 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6 max-w-screen-xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">HR Dashboard</h1>
          <p className="text-sm text-gray-500">Overview · KPIs · People</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <label htmlFor="global-search" className="sr-only">Search people</label>
            <input
              id="global-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people, teams..."
              className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 w-64 bg-white"
            />
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
          </div>
          <Link
            href="/auth/leave"
            className="relative p-2 rounded-lg shadow-sm bg-blue-600"
            aria-label="Pending leave requests"
            title="Pending leave requests"
          >
            <BellAlertIcon className="w-5 h-5 text-white" />
            {kpis.pending > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {kpis.pending}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 flex flex-col gap-6 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <CompactCard
              icon={<UserIcon className="w-6 h-6" />}
              title="Total employees"
              value={kpis.total}
              onClick={() => router.push("/auth/employees")}
            />
            <CompactCard
              icon={<CalendarDaysIcon className="w-6 h-6" />}
              title="Absenteeism"
              value={`${kpis.absenteeism.toFixed(2)} %`}
              subtitle="Approved leave / work days"
            />
            <CompactCard
              icon={<ChartBarIcon className="w-6 h-6" />}
              title="Leave usage"
              value={`${kpis.leaveUsage.toFixed(1)} %`}
              subtitle="Vacation used vs. balance"
              onClick={() => router.push("/auth/leave")}
            />
            <CompactCard
              icon={<BanknotesIcon className="w-6 h-6" />}
              title="Monthly payroll"
              value={formatMoney(kpis.pay.gross, { decimals: 0 })}
              subtitle="Gross, all employees"
              onClick={() => router.push("/auth/payroll")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Headcount by department" onClick={() => router.push("/auth/departments")}>
              <BarChart data={kpis.byDepartment} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Employees" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Payroll breakdown (monthly)" onClick={() => router.push("/auth/payroll")}>
              <PieChart>
                <Pie data={payrollPie} dataKey="value" nameKey="name" outerRadius={70}>
                  {payrollPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Legend />
              </PieChart>
            </ChartCard>
          </div>

          <ChartCard title="Headcount by contract" height={160} onClick={() => router.push("/auth/employees")}>
            <BarChart data={kpis.byContract} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip />
              <Bar dataKey="count" name="Employees" fill="#60a5fa" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard title="Recent hires" icon={<UserIcon className="w-5 h-5" />}>
              <ul className="space-y-2">
                {recentHires.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.profile?.first_name} {p.profile?.last_name}</div>
                      <div className="text-xs text-gray-400">{p.profile?.hire_date} · {p.profile?.contract}</div>
                    </div>
                    <Link className="text-sm text-blue-600 hover:underline" href={`/auth/employees/${p.id}`}>
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            </ActionCard>

            <ActionCard title="Attendance alerts" icon={<ExclamationTriangleIcon className="w-5 h-5" />}>
              <p className="text-xs text-gray-500 mb-2">Absenteeism above {ABSENTEEISM_ALERT} %</p>
              {alerts.length === 0 ? (
                <div className="text-sm text-gray-700">No alerts · everyone is within the threshold</div>
              ) : (
                <ul className="space-y-1">
                  {alerts.slice(0, 5).map(({ emp, rate }) => (
                    <li key={emp.id} className="flex justify-between text-sm">
                      <Link href={`/auth/employees/${emp.id}`} className="hover:underline truncate">
                        {emp.profile?.first_name} {emp.profile?.last_name}
                      </Link>
                      <span className="text-red-600 font-medium">{rate.toFixed(1)} %</span>
                    </li>
                  ))}
                </ul>
              )}
            </ActionCard>

            <ActionCard title="Pending leave" icon={<ClockIcon className="w-5 h-5" />}>
              <p className="text-3xl font-semibold text-gray-900">{kpis.pending}</p>
              <p className="text-xs text-gray-500 mb-3">request(s) waiting for a decision</p>
              <Link
                href="/auth/leave"
                className="block text-center py-2 rounded-lg border border-blue-100 hover:bg-blue-50 text-sm"
              >
                Review requests
              </Link>
            </ActionCard>
          </div>
        </section>

        <aside className="flex flex-col gap-4 min-w-0">
          <div className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">People</h3>
              <span className="text-sm text-gray-500">{people.length} results</span>
            </div>
            <div className="max-h-[calc(100vh-20rem)] overflow-y-auto divide-y no-scrollbar">
              {people.map((p) => (
                <div key={p.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.profile?.first_name} {p.profile?.last_name}</div>
                    <div className="text-xs text-gray-400 truncate">{p.profile?.job_title || "—"}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/auth/employees/${p.id}`} className="text-xs px-3 py-1 rounded-lg border hover:bg-gray-50">
                      Profile
                    </Link>
                    <Link
                      href={`/auth/messages?to=${p.id}`}
                      className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Message
                    </Link>
                  </div>
                </div>
              ))}
              {people.length === 0 && <p className="py-4 text-sm text-gray-500">Nobody matches “{query}”.</p>}
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <BanknotesIcon className="w-5 h-5" /> Payroll quick view
            </h4>
            <dl className="text-sm text-gray-600 space-y-1">
              <Row label="Base salaries" value={formatMoney(kpis.pay.salary)} />
              <Row label="Overtime" value={formatMoney(kpis.pay.overtimePay)} />
              <Row label="Bonuses" value={formatMoney(kpis.pay.bonuses)} />
              <Row label="Deductions" value={`− ${formatMoney(kpis.pay.deductions)}`} />
              <Row label="Net to pay" value={formatMoney(kpis.pay.net)} bold />
            </dl>
            <Link
              href="/auth/payroll"
              className="mt-3 block text-center py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Open payroll
            </Link>
          </div>
        </aside>
      </main>
    </div>
  );
}

/* ============================== Employee ============================== */

function EmployeeDashboard({ emp }) {
  const pay = computePay(emp.payroll);
  const pending = emp.attendance_leave?.leave_requests || [];
  const history = [...(emp.attendance_leave?.history_of_leaves || [])]
    .sort((a, b) => b.start_date.localeCompare(a.start_date))
    .slice(0, 4);

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Welcome, {emp.profile?.first_name} 👋</h1>
        <p className="text-sm text-gray-500">{emp.profile?.job_title} · {emp.profile?.department}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CompactCard icon={<CalendarDaysIcon className="w-6 h-6" />} title="Leave balance" value={`${emp.attendance_leave?.leave_balance ?? 0} days`} />
        <CompactCard icon={<ClockIcon className="w-6 h-6" />} title="Pending requests" value={pending.length} />
        <CompactCard icon={<ChartBarIcon className="w-6 h-6" />} title="Absenteeism" value={`${absenteeismRate(emp).toFixed(2)} %`} subtitle="Approved leave / work days" />
        <CompactCard icon={<BanknotesIcon className="w-6 h-6" />} title="Net monthly pay" value={formatMoney(pay.net)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActionCard title="My recent leave" icon={<CalendarDaysIcon className="w-5 h-5" />}>
          {pending.length + history.length === 0 ? (
            <p className="text-sm text-gray-500">No leave yet.</p>
          ) : (
            <ul className="space-y-2">
              {[...pending, ...history].map((l) => (
                <li key={l.id} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{l.type} · {l.start_date} → {l.end_date}</span>
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          )}
          <Link href={`/auth/employees/${emp.id}#leave`} className="mt-4 block text-center py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">
            Request leave
          </Link>
        </ActionCard>

        <ActionCard title="My pay this month" icon={<BanknotesIcon className="w-5 h-5" />}>
          <dl className="text-sm text-gray-600 space-y-1">
            <Row label="Base salary" value={formatMoney(pay.salary)} />
            <Row label={`Overtime (${pay.overtimeHours} h)`} value={formatMoney(pay.overtimePay)} />
            <Row label="Bonuses" value={formatMoney(pay.bonuses)} />
            <Row label="Deductions" value={`− ${formatMoney(pay.deductions)}`} />
            <Row label="Net" value={formatMoney(pay.net)} bold />
          </dl>
          <Link href="/auth/payroll" className="mt-4 block text-center py-2 rounded-lg border border-blue-100 hover:bg-blue-50 text-sm">
            See my payslips
          </Link>
        </ActionCard>
      </div>
    </div>
  );
}

/* ============================== Pieces ============================== */

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-gray-900 border-t pt-1 mt-1" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ChartCard({ title, children, onClick, height = 220 }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition min-w-0 ${onClick ? "cursor-pointer" : ""}`}
    >
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CompactCard({ icon, title, value, subtitle, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition flex items-start gap-3 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="p-2 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-500 truncate">{title}</div>
        <div className="text-xl font-semibold text-gray-900 truncate">{value}</div>
        {subtitle && <div className="text-xs text-gray-400 truncate">{subtitle}</div>}
      </div>
    </div>
  );
}

function ActionCard({ title, icon, children }) {
  return (
    <div className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition">
      <h4 className="font-medium mb-2 flex items-center gap-2">
        <span className="text-blue-400">{icon}</span> {title}
      </h4>
      <div>{children}</div>
    </div>
  );
}
