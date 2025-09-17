"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BanknotesIcon,
  GiftIcon,
  ClockIcon,
  ArrowTrendingDownIcon,
  UserIcon,
  BriefcaseIcon,
  CalendarIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

export default function PayrollPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const userRes = await fetch("/api/me");
      const { user } = await userRes.json();
      setUser(user);

      if (!user) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/data");
      const data = await res.json();
      const visibleProfiles =
        user.role === "employee"
          ? data.filter((p) => p.id === user.id)
          : data;

      setProfiles(visibleProfiles);
      setLoading(false);
    }
    init();
  }, [router]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  // Global payroll calculations (for admins)
  const totalSalaries = profiles.reduce(
    (sum, p) => sum + (p.payroll?.salary_amount || 0),
    0
  );
  const totalBonuses = profiles.reduce(
    (sum, p) => sum + (p.payroll?.bonuses || 0),
    0
  );
  const totalOvertime = profiles.reduce(
    (sum, p) => sum + (p.payroll?.overtime_hours || 0),
    0
  );
  const totalDeductions = profiles.reduce(
    (sum, p) => sum + (p.payroll?.deductions || 0),
    0
  );

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <h1 className="text-2xl font-semibold text-gray-800">Payroll Overview</h1>

      {/* Admin KPIs */}
      {user.role === "admin" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard
            title="Total Salaries"
            value={totalSalaries}
            icon={<BanknotesIcon className="w-6 h-6 text-blue-600" />}
          />
          <KpiCard
            title="Total Bonuses"
            value={totalBonuses}
            icon={<GiftIcon className="w-6 h-6 text-blue-600" />}
          />
          <KpiCard
            title="Overtime Hours"
            value={totalOvertime}
            icon={<ClockIcon className="w-6 h-6 text-blue-600" />}
          />
          <KpiCard
            title="Total Deductions"
            value={totalDeductions}
            icon={<ArrowTrendingDownIcon className="w-6 h-6 text-blue-600" />}
          />
        </div>
      )}

      {/* Employee Payroll Section */}
      <h2 className="text-lg font-medium text-gray-700">
        {user.role === "admin" ? "Employees Payroll" : "Your Payroll"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {profiles.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl shadow hover:shadow-md transition p-5 space-y-3 border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <UserIcon className="w-8 h-8 text-blue-500" />
              <div>
                <p className="font-semibold text-gray-800">
                  {p.profile.first_name} {p.profile.last_name}
                </p>
                <p className="text-sm text-gray-500">{p.profile.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
              <InfoRow
                icon={<BriefcaseIcon className="w-4 h-4 text-blue-400" />}
                label="Role"
                value={p.profile.role}
              />
              <InfoRow
                icon={<DocumentTextIcon className="w-4 h-4 text-blue-400" />}
                label="Job Title"
                value={p.profile.job_title}
              />
              <InfoRow
                icon={<BriefcaseIcon className="w-4 h-4 text-blue-400" />}
                label="Department"
                value={p.profile.department}
              />
              <InfoRow
                icon={<DocumentTextIcon className="w-4 h-4 text-blue-400" />}
                label="Contract"
                value={p.profile.contract}
              />
              <InfoRow
                icon={<CalendarIcon className="w-4 h-4 text-blue-400" />}
                label="Hire Date"
                value={p.profile.hire_date}
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg space-y-1">
              <p className="font-medium text-gray-800">Payroll Details</p>
              <p>Salary: {p.payroll?.salary_amount}</p>
              <p>Overtime Hours: {p.payroll?.overtime_hours}</p>
              <p>Bonuses: {p.payroll?.bonuses}</p>
              <p>Deductions: {p.payroll?.deductions}</p>
            </div>

            <div>
              <p className="font-medium text-gray-800">Payslips</p>
              <ul className="list-disc list-inside text-sm text-gray-600">
                {p.payroll?.payslips?.length > 0 ? (
                  p.payroll.payslips.map((ps) => (
                    <li key={ps.id}>
                      {ps.month} {ps.year} –{" "}
                      <a
                        href={ps.file_url}
                        target="_blank"
                        className="text-blue-600 hover:underline"
                      >
                        Download
                      </a>
                    </li>
                  ))
                ) : (
                  <li>No payslips available</li>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Reusable Components --- */
function KpiCard({ title, value, icon }) {
  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-md transition p-4 border border-gray-100 flex items-center gap-4">
      <div className="p-2 bg-blue-50 rounded-lg">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-lg font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-gray-600">
        {label}: <span className="font-medium text-gray-800">{value}</span>
      </span>
    </div>
  );
}
