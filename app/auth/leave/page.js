"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircleIcon, XCircleIcon, ClockIcon, UserIcon } from "@heroicons/react/24/outline";
import { useUser } from "@/components/UserContext";
import { AdminOnly, Notice, Spinner, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { workingDays } from "@/lib/hr";

export default function LeavePage() {
  const user = useUser();
  const [profiles, setProfiles] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(null);
  const [historyFilter, setHistoryFilter] = useState("all");

  useEffect(() => {
    if (user.role !== "admin") return;
    api("/api/data")
      .then(setProfiles)
      .catch((e) => setNotice({ type: "error", text: e.message }));
  }, [user.role]);

  if (user.role !== "admin") return <AdminOnly />;
  if (!profiles) return notice ? <div className="p-6"><Notice notice={notice} /></div> : <Spinner />;

  async function handleLeaveAction(employeeId, leaveId, action) {
    setBusy(`${employeeId}-${leaveId}`);
    try {
      const updated = await api("/api/leave", { method: "PATCH", body: { employeeId, leaveId, action } });
      setProfiles((list) => list.map((p) => (p.id === updated.id ? updated : p)));
      setNotice({ type: "success", text: `Request ${action}.` });
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  }

  const withEmployee = (p, l) => ({
    ...l,
    days: l.days ?? workingDays(l.start_date, l.end_date),
    employeeName: `${p.profile?.first_name} ${p.profile?.last_name}`,
    employeeId: p.id,
    balance: p.attendance_leave?.leave_balance ?? 0,
  });

  const pending = profiles
    .flatMap((p) => (p.attendance_leave?.leave_requests || []).map((l) => withEmployee(p, l)))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const history = profiles
    .flatMap((p) => (p.attendance_leave?.history_of_leaves || []).map((l) => withEmployee(p, l)))
    .filter((h) => historyFilter === "all" || h.status === historyFilter)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Leave Requests</h1>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <section>
        <h2 className="text-lg font-medium text-gray-700 flex items-center gap-2 mb-4">
          <ClockIcon className="w-5 h-5 text-blue-600" />
          Pending requests ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-gray-500 text-sm">Nothing to review 🎉</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pending.map((req) => {
              const key = `${req.employeeId}-${req.id}`;
              const overBalance = req.type === "vacation" && req.days > req.balance;
              return (
                <div key={key} className="bg-white rounded-2xl shadow hover:shadow-md transition p-5 space-y-3 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <UserIcon className="w-8 h-8 text-blue-500" />
                    <div>
                      <Link href={`/auth/employees/${req.employeeId}`} className="font-semibold text-gray-800 hover:underline">
                        {req.employeeName}
                      </Link>
                      <p className="text-sm text-gray-500 capitalize">{req.type}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1 text-sm text-gray-600">
                    <InfoRow label="Period" value={`${req.start_date} → ${req.end_date}`} />
                    <InfoRow label="Working days" value={req.days} />
                    <InfoRow label="Balance" value={`${req.balance} days`} warn={overBalance} />
                    <InfoRow label="Reason" value={req.reason} />
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <StatusBadge status={req.status} />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <ActionButton
                      label="Approve"
                      icon={<CheckCircleIcon className="w-5 h-5" />}
                      color="blue"
                      disabled={busy === key}
                      onClick={() => handleLeaveAction(req.employeeId, req.id, "approved")}
                    />
                    <ActionButton
                      label="Reject"
                      icon={<XCircleIcon className="w-5 h-5" />}
                      color="red"
                      disabled={busy === key}
                      onClick={() => handleLeaveAction(req.employeeId, req.id, "rejected")}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-medium text-gray-700 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-gray-600" />
            Leave history
          </h2>
          <div className="flex gap-1 text-sm">
            {["all", "approved", "rejected"].map((f) => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={`px-3 py-1 rounded-full border capitalize ${historyFilter === f ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Days</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Decided by</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={`${h.employeeId}-${h.id}`} className="border-t">
                  <td className="px-4 py-2">
                    <Link href={`/auth/employees/${h.employeeId}`} className="hover:underline font-medium text-gray-800">
                      {h.employeeName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 capitalize">{h.type}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{h.start_date} → {h.end_date}</td>
                  <td className="px-4 py-2 text-right">{h.days}</td>
                  <td className="px-4 py-2">{h.reason}</td>
                  <td className="px-4 py-2">{h.approved_by || "—"}</td>
                  <td className="px-4 py-2"><StatusBadge status={h.status} /></td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">No leave in history.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value, warn }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="font-medium">{label}:</span>
      <span className={`text-right ${warn ? "text-red-600 font-semibold" : "text-gray-800"}`}>{value}</span>
    </div>
  );
}

function ActionButton({ label, icon, color, onClick, disabled }) {
  const colorMap = {
    blue: "bg-blue-600 hover:bg-blue-700",
    red: "bg-red-600 hover:bg-red-700",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 px-4 py-2 text-white rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${colorMap[color]}`}
    >
      {icon} {label}
    </button>
  );
}
