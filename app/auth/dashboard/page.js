"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BellAlertIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
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

const COLORS = ["#2563eb", "#60a5fa", "#93c5fd", "#bfdbfe"];

export default function DashboardPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");
  const [quickLeave, setQuickLeave] = useState({ days: 1, reason: "" });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const userRes = await fetch("/api/me");
        const { user } = await userRes.json();
        setUser(user);

        const res = await fetch("/api/data");
        const data = await res.json();
        setProfiles(data);

        if (!user) return;

        if (user.role === "admin") {
          calculateGlobalKpis(data);
        } else {
          const employee = data.find((emp) => emp.id === user.id);
          if (employee) calculateEmployeeKpis(employee);
        }
      } catch (e) {
        console.error("Failed to fetch dashboard data", e);
      }
    }
    fetchData();
  }, []);

  function calculateGlobalKpis(data) {
    const totalEmployees = data.length;
    const headcountByContract = {};
    let totalLeaveDays = 0;
    let totalWorkDays = 0;
    let totalLeaveUsed = 0;
    let totalLeaveBalance = 0;
    let totalSalaries = 0;
    let totalOvertime = 0;
    let totalBonuses = 0;
    let totalDeductions = 0;

    data.forEach((emp) => {
      const contract = emp.profile?.contract || "unknown";
      headcountByContract[contract] = (headcountByContract[contract] || 0) + 1;

      const workDays = emp.profile?.work_days_per_year || 220;
      totalWorkDays += workDays;

      const leaves = emp.attendance_leave?.history_of_leaves || [];
      leaves.forEach((leave) => {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        totalLeaveDays += (end - start) / (1000 * 60 * 60 * 24) + 1;
      });

      const leaveRequests = emp.attendance_leave?.leave_requests || [];
      leaveRequests.forEach((leave) => {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        totalLeaveUsed += (end - start) / (1000 * 60 * 60 * 24) + 1;
      });

      totalLeaveBalance += emp.attendance_leave?.leave_balance || 0;

      const payroll = emp.payroll || {};
      totalSalaries += payroll.salary_amount || 0;
      totalOvertime += payroll.overtime_hours || 0;
      totalBonuses += payroll.bonuses || 0;
      totalDeductions += payroll.deductions || 0;
    });

    const absenteeismRate = totalWorkDays ? (totalLeaveDays / totalWorkDays) * 100 : 0;
    const leaveUsagePercent = totalLeaveUsed + totalLeaveBalance
      ? (totalLeaveUsed / (totalLeaveUsed + totalLeaveBalance)) * 100
      : 0;

    setKpis({
      type: "global",
      totalEmployees,
      headcountByContract,
      absenteeismRate: absenteeismRate.toFixed(2) + "%",
      leaveUsagePercent: leaveUsagePercent.toFixed(2) + "%",
      payrollCosts: { totalSalaries, totalOvertime, totalBonuses, totalDeductions },
    });
  }

  function calculateEmployeeKpis(emp) {
    const workDays = emp.profile?.work_days_per_year || 220;

    let leaveDays = 0;
    (emp.attendance_leave?.history_of_leaves || []).forEach((leave) => {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      leaveDays += (end - start) / (1000 * 60 * 60 * 24) + 1;
    });

    const payroll = emp.payroll || {};

    setKpis({
      type: "personal",
      employeeName: `${emp.profile?.first_name || ""} ${emp.profile?.last_name || ""}`,
      absenteeismRate: ((leaveDays / workDays) * 100).toFixed(2) + "%",
      leaveBalance: emp.attendance_leave?.leave_balance || 0,
      payroll: {
        salary: payroll.salary_amount || 0,
        overtime: payroll.overtime_hours || 0,
        bonuses: payroll.bonuses || 0,
        deductions: payroll.deductions || 0,
      },
    });
  }

  if (!user || !kpis)
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const filteredProfiles = profiles.filter((p) => {
    if (!query) return true;
    const name = `${p.profile?.first_name || ""} ${p.profile?.last_name || ""}`.toLowerCase();
    return name.includes(query.toLowerCase());
  });

  async function submitQuickLeave(e) {
    e.preventDefault();
    try {
      await fetch('/api/leave/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: quickLeave.days, reason: quickLeave.reason }),
      });
      setShowModal(false);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 p-6">
      <header className="flex items-center justify-between gap-4 mb-6 max-w-screen-xl mx-auto">
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
              className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 w-64"
            />
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
          </div>

          {/* <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 transition"
            aria-haspopup="dialog"
          >
            <PlusCircleIcon className="w-5 h-5" />
            Quick Leave
          </button> */}

          <button
            onClick={() => router.push("/auth/messages")}
            className="p-2 rounded-lg border border-blue-300 shadow-sm bg-blue-600"
            aria-label="Notifications"
          >
            <BellAlertIcon className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        <section className="lg:col-span-2 flex flex-col gap-6 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <CompactCard
              icon={<UserIcon className="w-6 h-6" />}
              title="Total Employees"
              value={kpis.totalEmployees}
              onClick={() => router.push("/auth/employees")}
            />
            <CompactCard
              icon={<CalendarDaysIcon className="w-6 h-6" />}
              title="Absenteeism"
              value={kpis.absenteeismRate}
              subtitle="Company avg"
            />
            <CompactCard
              icon={<ChartBarIcon className="w-6 h-6" />}
              title="Leave usage"
              value={kpis.leaveUsagePercent}
              subtitle="Used vs bal"
            />
            <CompactCard
              icon={<CurrencyDollarIcon className="w-6 h-6" />}
              title="Payroll (k€)"
              value={(kpis.payrollCosts.totalSalaries / 1000).toFixed(1)}
              subtitle="Salaries (k€)"
              onClick={() => router.push("/auth/payroll")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
            <div className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition min-h-0 flex flex-col cursor-pointer"
              onClick={() => router.push(`/auth/departments/`)}>
              <h3 className="text-lg font-medium mb-2">Headcount by Contract</h3>
              <div style={{ height: 200 }} className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(kpis.headcountByContract).map(([contract, count]) => ({ contract, count }))}
                  >
                    <XAxis dataKey="contract" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition min-h-0 flex flex-col cursor-pointer"
              onClick={() => router.push(`/auth/employees/`)}>
              <h3 className="text-lg font-medium mb-2">Payroll Breakdown</h3>
              <div style={{ height: 200 }} className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Salaries", value: kpis.payrollCosts.totalSalaries },
                        { name: "Overtime", value: kpis.payrollCosts.totalOvertime },
                        { name: "Bonuses", value: kpis.payrollCosts.totalBonuses },
                        { name: "Deductions", value: kpis.payrollCosts.totalDeductions },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={70}
                      label
                    >
                      {[
                        kpis.payrollCosts.totalSalaries,
                        kpis.payrollCosts.totalOvertime,
                        kpis.payrollCosts.totalBonuses,
                        kpis.payrollCosts.totalDeductions,
                      ].map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
            <ActionCard title="Recent Documents" icon={<DocumentTextIcon className="w-5 h-5" />}>
              <p className="text-sm text-gray-500 mb-3">Most recent contracts and payslips</p>
              <ul className="space-y-2">
                {profiles.slice(0, 3).map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{p.profile?.first_name} {p.profile?.last_name}</div>
                      <div className="text-xs text-gray-400">Contract: {p.profile?.contract || '—'}</div>
                    </div>
                    <button
                      className="text-sm text-blue-600 hover:underline cursor-pointer"
                      onClick={() => router.push(`/auth/employees/${p.id}`)}
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            </ActionCard>

            <ActionCard title="Attendance Alerts" icon={<ChartBarIcon className="w-5 h-5" />}>
              <p className="text-sm text-gray-500 mb-2">High absenteeism flags</p>
              <div className="text-sm text-gray-700">No alerts · all teams within thresholds</div>
            </ActionCard>

            <ActionCard title="Quick People" icon={<UserIcon className="w-5 h-5" />}>
              <p className="text-sm text-gray-500 mb-2">Search and actions</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => router.push("/auth/employees")}
                  className="py-2 rounded-lg border border-blue-100 hover:bg-blue-50 cursor-pointer"
                >
                  View Directory
                </button>
                {/* <button className="py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  Invite Employee
                </button> */}
              </div>
            </ActionCard>
          </div>
        </section>

        <aside className="flex flex-col justify-between gap-4  ">
          <div className="sticky top-6 mb-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition w-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">People</h3>
              <span className="text-sm text-gray-500">{filteredProfiles.length} results</span>
            </div>

            {/* Scrollable container with hidden scrollbar */}
            <div
              className="max-h-[calc(100vh-20rem)] overflow-y-auto divide-y"
              style={{
                scrollbarWidth: "none", /* Firefox */
              }}
            >
              {/* Hide scrollbar for Webkit browsers */}
              <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

              {filteredProfiles.slice(0, 20).map((p) => (
                <div key={p.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{p.profile?.first_name} {p.profile?.last_name}</div>
                    <div className="text-xs text-gray-400">{p.profile?.job_title || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/auth/employees/${p.id}`)}
                      className="text-xs px-3 py-1 rounded-lg border hover:bg-gray-50 cursor-pointer"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => router.push(`/auth/messages/${p.id}`)}
                      className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                    >
                      Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CurrencyDollarIcon className="w-5 h-5" /> Payroll Quick View
            </h4>
            <div className="text-sm text-gray-600">
              Total salaries: {kpis.payrollCosts.totalSalaries.toLocaleString()}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => router.push("/auth/payroll/")}
                className="flex-1 py-2 rounded-lg border cursor-pointer"
              >
                Export
              </button>
              <button
                onClick={() => router.push("/auth/payroll/")}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white cursor-pointer"
              >
                Run Payroll
              </button>
            </div>
          </div>
        </aside>


      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Request Quick Leave</h4>
              <button onClick={() => setShowModal(false)} className="text-gray-400">Close</button>
            </div>

            <form onSubmit={submitQuickLeave} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600">Number of days</label>
                <input
                  type="number"
                  min={1}
                  value={quickLeave.days}
                  onChange={(e) => setQuickLeave((s) => ({ ...s, days: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600">Reason</label>
                <textarea
                  value={quickLeave.reason}
                  onChange={(e) => setQuickLeave((s) => ({ ...s, reason: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 h-24"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white">Send Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
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
        {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
      </div>
    </div>
  );
}

function ActionCard({ title, icon, children }) {
  return (
    <div className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition">
      <h4 className="font-medium mb-2 flex items-center gap-2"><span className="text-blue-400">{icon}</span> {title}</h4>
      <div>{children}</div>
    </div>
  );
}
