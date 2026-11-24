"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/components/UserContext";
import { AdminOnly, Notice, Spinner, initials } from "@/components/ui";
import { api } from "@/lib/api";
import { computePay, formatMoney } from "@/lib/hr";

export default function DepartmentsPage() {
  const user = useUser();
  const [profiles, setProfiles] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

  useEffect(() => {
    if (user.role !== "admin") return;
    api("/api/data").then(setProfiles).catch((e) => setError(e.message));
  }, [user.role]);

  if (user.role !== "admin") return <AdminOnly />;
  if (error) return <div className="p-6"><Notice notice={{ type: "error", text: error }} /></div>;
  if (!profiles) return <Spinner />;

  const departments = profiles.reduce((acc, emp) => {
    const dept = emp.profile?.department || "Unassigned";
    (acc[dept] ||= []).push(emp);
    return acc;
  }, {});
  const deptNames = Object.keys(departments).sort();

  const q = filter.toLowerCase();
  const visible = deptNames
    .filter((d) => selectedDept === "all" || d === selectedDept)
    .map((dept) => ({
      dept,
      all: departments[dept],
      employees: departments[dept].filter((emp) =>
        `${emp.profile?.first_name} ${emp.profile?.last_name} ${emp.profile?.job_title} ${dept}`.toLowerCase().includes(q)
      ),
    }))
    .filter((d) => d.employees.length > 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Departments Overview</h1>

      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search by name, job or department..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white"
        >
          <option value="all">All departments ({deptNames.length})</option>
          {deptNames.map((d) => (
            <option key={d} value={d}>{d} ({departments[d].length})</option>
          ))}
        </select>
      </div>

      {visible.length === 0 && <p className="text-gray-500">No results.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visible.map(({ dept, all, employees }) => {
          const payroll = all.reduce((s, e) => s + computePay(e.payroll).gross, 0);
          return (
            <div key={dept} className="bg-white rounded-2xl shadow hover:shadow-md transition p-5 border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-blue-700">{dept}</h2>
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                  {all.length} employee{all.length > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Monthly gross payroll: {formatMoney(payroll)}</p>

              <div className="space-y-3">
                {employees.map((emp) => (
                  <Link
                    href={`/auth/employees/${emp.id}`}
                    key={emp.id}
                    className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-blue-50 transition"
                  >
                    <div className="w-12 h-12 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                      {initials(emp.profile?.first_name, emp.profile?.last_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{emp.profile?.first_name} {emp.profile?.last_name}</p>
                      <p className="text-sm text-blue-700">{emp.profile?.job_title}</p>
                      <p className="text-sm text-gray-500 truncate">{emp.profile?.email}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
