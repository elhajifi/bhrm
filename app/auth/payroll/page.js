"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BanknotesIcon,
  GiftIcon,
  ClockIcon,
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useUser } from "@/components/UserContext";
import { Notice, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { MONTHS, computePay, formatMoney } from "@/lib/hr";

export default function PayrollPage() {
  const user = useUser();
  const isAdmin = user.role === "admin";
  const [profiles, setProfiles] = useState(null);
  const [notice, setNotice] = useState(null);
  const [filter, setFilter] = useState("");
  const now = new Date();
  const [period, setPeriod] = useState({ month: MONTHS[now.getMonth()], year: now.getFullYear() });
  const [running, setRunning] = useState(false);

  async function load() {
    try {
      setProfiles(await api("/api/data"));
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (!profiles) return notice ? <div className="p-6"><Notice notice={notice} /></div> : <Spinner />;

  const rows = profiles.map((p) => ({ emp: p, pay: computePay(p.payroll) }));
  const totals = rows.reduce(
    (t, { pay }) => ({
      salary: t.salary + pay.salary,
      overtimeHours: t.overtimeHours + pay.overtimeHours,
      overtimePay: t.overtimePay + pay.overtimePay,
      bonuses: t.bonuses + pay.bonuses,
      deductions: t.deductions + pay.deductions,
      gross: t.gross + pay.gross,
      net: t.net + pay.net,
    }),
    { salary: 0, overtimeHours: 0, overtimePay: 0, bonuses: 0, deductions: 0, gross: 0, net: 0 }
  );

  const q = filter.toLowerCase();
  const visibleRows = rows.filter(({ emp }) =>
    `${emp.profile?.first_name} ${emp.profile?.last_name} ${emp.profile?.department}`.toLowerCase().includes(q)
  );

  async function runPayroll() {
    if (!window.confirm(`Generate payslips for ${period.month} ${period.year} for all employees?`)) return;
    setRunning(true);
    try {
      const r = await api("/api/payroll/run", { method: "POST", body: period });
      setNotice({
        type: "success",
        text: `${r.month} ${r.year}: ${r.created} payslip(s) generated${r.skipped ? `, ${r.skipped} already existed` : ""}.`,
      });
      await load();
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setRunning(false);
    }
  }

  function exportCsv() {
    const header = ["ID", "First name", "Last name", "Department", "Contract", "Base salary", "Overtime hours", "Overtime pay", "Bonuses", "Gross", "Deductions", "Net"];
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map(({ emp, pay }) =>
      [emp.id, emp.profile?.first_name, emp.profile?.last_name, emp.profile?.department, emp.profile?.contract,
        pay.salary, pay.overtimeHours, pay.overtimePay, pay.bonuses, pay.gross, pay.deductions, pay.net]
        .map(escape)
        .join(";")
    );
    // BOM so Excel opens accents correctly; ";" separator for French Excel
    const blob = new Blob(["﻿" + [header.map(escape).join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${period.month}-${period.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">{isAdmin ? "Payroll Overview" : "My Payroll"}</h1>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period.month}
              onChange={(e) => setPeriod((p) => ({ ...p, month: e.target.value }))}
              className="border rounded-lg px-3 py-2 bg-white"
            >
              {MONTHS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <input
              type="number"
              value={period.year}
              onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
              className="border rounded-lg px-3 py-2 w-24"
            />
            <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-white hover:bg-gray-50">
              <ArrowDownTrayIcon className="w-5 h-5" /> Export CSV
            </button>
            <button
              onClick={runPayroll}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <PlayIcon className="w-5 h-5" /> {running ? "Running…" : "Run payroll"}
            </button>
          </div>
        )}
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard title="Base salaries" value={formatMoney(totals.salary, { decimals: 0 })} icon={<BanknotesIcon className="w-6 h-6 text-blue-600" />} />
          <KpiCard title="Bonuses" value={formatMoney(totals.bonuses)} icon={<GiftIcon className="w-6 h-6 text-blue-600" />} />
          <KpiCard
            title="Overtime"
            value={formatMoney(totals.overtimePay)}
            sub={`${totals.overtimeHours} hours`}
            icon={<ClockIcon className="w-6 h-6 text-blue-600" />}
          />
          <KpiCard
            title="Net to pay"
            value={formatMoney(totals.net)}
            sub={`after ${formatMoney(totals.deductions)} deductions`}
            icon={<ArrowTrendingDownIcon className="w-6 h-6 text-blue-600" />}
          />
        </div>
      )}

      {isAdmin && (
        <input
          type="text"
          placeholder="Filter by name or department"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-80 shadow-sm"
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visibleRows.map(({ emp: p, pay }) => (
          <div key={p.id} className="bg-white rounded-2xl shadow hover:shadow-md transition p-5 space-y-3 border border-gray-100">
            <div>
              <Link href={`/auth/employees/${p.id}`} className="font-semibold text-gray-800 hover:underline">
                {p.profile?.first_name} {p.profile?.last_name}
              </Link>
              <p className="text-sm text-gray-500">
                {p.profile?.job_title} · {p.profile?.department} · {p.profile?.contract}
              </p>
            </div>

            <dl className="bg-blue-50 p-3 rounded-lg space-y-1 text-sm">
              <Line label="Base salary" value={formatMoney(pay.salary)} />
              <Line label={`Overtime (${pay.overtimeHours} h × 125 %)`} value={formatMoney(pay.overtimePay)} />
              <Line label="Bonuses" value={formatMoney(pay.bonuses)} />
              <Line label="Gross" value={formatMoney(pay.gross)} bold />
              <Line label="Deductions" value={`− ${formatMoney(pay.deductions)}`} />
              <Line label="Net" value={formatMoney(pay.net)} bold />
            </dl>

            <div>
              <p className="font-medium text-gray-800 text-sm mb-1">Payslips</p>
              {p.payroll?.payslips?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {[...p.payroll.payslips].reverse().map((ps) => (
                    <Link
                      key={ps.id}
                      href={`/auth/payroll/payslip/${p.id}/${ps.id}`}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-blue-100 text-blue-700 hover:bg-blue-50"
                    >
                      <DocumentTextIcon className="w-4 h-4" /> {ps.month.slice(0, 3)} {ps.year}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No payslips yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Line({ label, value, bold }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-semibold text-gray-900" : "text-gray-600"}`}>
      <dt>{label}</dt>
      <dd className="whitespace-nowrap">{value}</dd>
    </div>
  );
}

function KpiCard({ title, value, sub, icon }) {
  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-md transition p-4 border border-gray-100 flex items-center gap-4">
      <div className="p-2 bg-blue-50 rounded-lg">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-lg font-semibold text-gray-800 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}
