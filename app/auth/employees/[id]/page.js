"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  ClipboardDocumentListIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { useUser } from "@/components/UserContext";
import { Notice, Spinner, StatusBadge, initials } from "@/components/ui";
import { api } from "@/lib/api";
import { LEAVE_TYPES, computePay, formatMoney, workingDays } from "@/lib/hr";

export default function ProfilePage() {
  const { id } = useParams();
  const user = useUser();
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = not found
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/data")
      .then((data) => setProfile(data.find((p) => p.id === Number(id)) || null))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="p-6"><Notice notice={{ type: "error", text: error }} /></div>;
  if (profile === undefined) return <Spinner />;
  if (profile === null)
    return (
      <p className="text-center mt-10 text-red-500">
        Profile not found or you are not allowed to view it.
      </p>
    );

  const isMe = user.id === profile.id;
  const p = profile.profile || {};
  const pay = computePay(profile.payroll);
  const pending = profile.attendance_leave?.leave_requests || [];
  const history = [...(profile.attendance_leave?.history_of_leaves || [])].sort((a, b) =>
    b.start_date.localeCompare(a.start_date)
  );

  async function cancelRequest(leaveId) {
    if (!window.confirm("Cancel this leave request?")) return;
    try {
      const updated = await api("/api/leave", { method: "DELETE", body: { leaveId } });
      setProfile(updated);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-6 bg-white rounded-xl p-6 shadow-md">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
          {initials(p.first_name, p.last_name)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">
            {p.first_name} {p.last_name}
          </h1>
          <p className="text-blue-600 font-medium">{p.job_title}</p>
          <p className="text-gray-500 text-sm">
            {p.department} · {p.contract} · since {p.hire_date}
          </p>
          <p className="text-gray-400 text-sm">{p.email}</p>
        </div>
        {!isMe && (
          <Link
            href={`/auth/messages?to=${profile.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <EnvelopeIcon className="w-5 h-5" /> Message
          </Link>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<BriefcaseIcon className="w-6 h-6" />} label="Projects" value={(p.current_projects ?? []).length} />
        <StatCard icon={<CalendarIcon className="w-6 h-6" />} label="Leave balance" value={`${profile.attendance_leave?.leave_balance ?? 0} days`} />
        <StatCard icon={<ClipboardDocumentListIcon className="w-6 h-6" />} label="Pending requests" value={pending.length} />
        <StatCard icon={<CurrencyDollarIcon className="w-6 h-6" />} label="Monthly salary" value={formatMoney(pay.salary)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects */}
        <SectionCard title="Current Projects" icon={<BriefcaseIcon className="w-5 h-5 text-blue-500" />}>
          {p.current_projects?.length > 0 ? (
            p.current_projects.map((proj) => (
              <div key={proj.project_id} className="border rounded p-3 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <p className="font-medium">{proj.name}</p>
                  <p className="text-sm text-gray-500">Started {proj.start_date || "—"}</p>
                </div>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full capitalize">{proj.status}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No active projects.</p>
          )}
        </SectionCard>

        {/* Attendance & Leave */}
        <SectionCard id="leave" title="Attendance & Leave" icon={<CalendarIcon className="w-5 h-5 text-blue-500" />}>
          {pending.length > 0 && (
            <>
              <p className="text-sm text-gray-600 font-medium">Pending requests</p>
              {pending.map((leave) => (
                <div key={leave.id} className="border rounded p-2 bg-yellow-50/50 flex justify-between items-center gap-2">
                  <div>
                    <p className="font-medium"><span className="capitalize">{leave.type}</span> · {leave.days ?? workingDays(leave.start_date, leave.end_date)} day(s)</p>
                    <p className="text-xs text-gray-500">{leave.start_date} → {leave.end_date} · {leave.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={leave.status} />
                    {isMe && (
                      <button onClick={() => cancelRequest(leave.id)} className="text-xs text-red-600 hover:underline">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          <p className="text-sm text-gray-600 font-medium">Leave history</p>
          {history.length > 0 ? (
            history.map((leave) => (
              <div key={leave.id} className="border rounded p-2 bg-gray-50 flex justify-between items-center">
                <div>
                  <p className="font-medium"><span className="capitalize">{leave.type}</span> · {leave.days ?? workingDays(leave.start_date, leave.end_date)} day(s)</p>
                  <p className="text-xs text-gray-500">
                    {leave.start_date} → {leave.end_date}
                    {leave.approved_by ? ` · by ${leave.approved_by}` : ""}
                  </p>
                </div>
                <StatusBadge status={leave.status} />
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No leave history.</p>
          )}

          {isMe && <LeaveRequestForm employee={profile} onCreated={setProfile} />}
        </SectionCard>

        {/* Payroll */}
        <SectionCard title="Payroll" icon={<CurrencyDollarIcon className="w-5 h-5 text-blue-500" />}>
          <dl className="text-sm text-gray-600 space-y-1">
            <Line label="Base salary" value={formatMoney(pay.salary)} />
            <Line label={`Overtime (${pay.overtimeHours} h)`} value={formatMoney(pay.overtimePay)} />
            <Line label="Bonuses" value={formatMoney(pay.bonuses)} />
            <Line label="Deductions" value={`− ${formatMoney(pay.deductions)}`} />
            <Line label="Net" value={formatMoney(pay.net)} bold />
          </dl>
          <div className="mt-3 space-y-2">
            <p className="font-medium">Payslips</p>
            {profile.payroll?.payslips?.length > 0 ? (
              profile.payroll.payslips.map((ps) => (
                <Link
                  key={ps.id}
                  href={`/auth/payroll/payslip/${profile.id}/${ps.id}`}
                  className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" /> {ps.month} {ps.year}
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-500">No payslips yet.</p>
            )}
          </div>
        </SectionCard>

        {/* Documents */}
        <SectionCard title="Documents" icon={<DocumentTextIcon className="w-5 h-5 text-blue-500" />}>
          <DocList title="Contracts" docs={profile.documents?.contracts} />
          <DocList title="Certificates" docs={profile.documents?.certificates} />
          <DocList title="ID Documents" docs={profile.documents?.id_documents} />
        </SectionCard>
      </div>
    </div>
  );
}

/* -------------------- Components -------------------- */
function Line({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-gray-900 border-t pt-1 mt-1" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-3 hover:shadow-lg transition">
      <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white">{icon}</div>
      <div className="min-w-0">
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-lg font-bold text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function SectionCard({ id, title, icon, children }) {
  return (
    <div id={id} className="bg-white p-5 rounded-xl shadow-md space-y-3 scroll-mt-20">
      <h2 className="flex items-center gap-2 font-semibold text-gray-800 border-b pb-2">
        {icon} {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DocList({ title, docs }) {
  return (
    <div className="mt-2">
      <p className="font-medium">{title}</p>
      {docs?.length > 0 ? (
        <ul className="list-disc list-inside text-sm text-blue-600 space-y-1">
          {docs.map((url, i) => (
            <li key={i}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
                {decodeURIComponent(url.split("/").pop() || `${title} ${i + 1}`)}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No {title.toLowerCase()} available.</p>
      )}
    </div>
  );
}

/* -------------------- Leave Request Form -------------------- */
function LeaveRequestForm({ employee, onCreated }) {
  const empty = { type: "vacation", start_date: "", end_date: "", reason: "" };
  const [formData, setFormData] = useState(empty);
  const [notice, setNotice] = useState(null);
  const [sending, setSending] = useState(false);

  const days = workingDays(formData.start_date, formData.end_date);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setNotice(null);
    setSending(true);
    try {
      const { employee: updated } = await api("/api/leave", { method: "POST", body: formData });
      onCreated(updated);
      setFormData(empty);
      setNotice({ type: "success", text: "Leave request sent. An admin will review it." });
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    } finally {
      setSending(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="mt-4 bg-gray-50 p-3 rounded-lg space-y-2">
      <h3 className="font-semibold text-blue-600">Request new leave</h3>
      <select name="type" value={formData.type} onChange={handleChange} className="border px-2 py-1 w-full rounded bg-white capitalize">
        {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-600">
          From
          <input type="date" name="start_date" required min={today} value={formData.start_date} onChange={handleChange} className="border px-2 py-1 w-full rounded bg-white" />
        </label>
        <label className="text-xs text-gray-600">
          To
          <input type="date" name="end_date" required min={formData.start_date || today} value={formData.end_date} onChange={handleChange} className="border px-2 py-1 w-full rounded bg-white" />
        </label>
      </div>
      <input type="text" name="reason" required maxLength={500} value={formData.reason} onChange={handleChange} placeholder="Reason" className="border px-2 py-1 w-full rounded bg-white" />
      <button type="submit" disabled={sending} className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700 transition disabled:opacity-60">
        {sending ? "Sending…" : `Submit leave${days ? ` (${days} working day${days > 1 ? "s" : ""})` : ""}`}
      </button>
      <p className="text-sm text-gray-500">Remaining balance: {employee.attendance_leave?.leave_balance ?? 0} days (vacation only)</p>
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </form>
  );
}
