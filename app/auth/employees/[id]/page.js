"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  UserIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

export default function ProfilesPage() {
  const params = useParams();
  const { id } = params;
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const userRes = await fetch("/api/me");
      const { user } = await userRes.json();
      setUser(user);

      const res = await fetch("/api/data");
      const data = await res.json();
      const selectedProfile = data.find((p) => p.id === Number(id));

      if (!selectedProfile || (user.role === "employee" && user.id !== selectedProfile.id)) {
        alert("You are not allowed to view this profile.");
        router.push("/auth/dashboard");
        return;
      }

      setProfile(selectedProfile);
      setLoading(false);
    }

    fetchData();
  }, [id, router]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  if (!profile)
    return <p className="text-center mt-10 text-red-500">Profile not found or access denied.</p>;

  const canRequestLeave = user && user.role === "employee" && user.id === profile.id;

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-8">
      {/* Header */}
      <div className="flex items-center gap-6 bg-white rounded-xl p-6 shadow-md">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
          {profile.profile?.first_name[0]}
          {profile.profile?.last_name[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {profile.profile?.first_name} {profile.profile?.last_name}
          </h1>
          <p className="text-blue-600 font-medium">{profile.profile?.job_title}</p>
          <p className="text-gray-500 text-sm">{profile.profile?.department}</p>
          <p className="text-gray-400 text-sm">{profile.profile?.email}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<BriefcaseIcon className="w-6 h-6" />} label="Projects" value={(profile.profile?.current_projects ?? []).length} />
        <StatCard icon={<CalendarIcon className="w-6 h-6" />} label="Leave Balance" value={profile.attendance_leave?.leave_balance ?? 0} />
        <StatCard icon={<ClipboardDocumentListIcon className="w-6 h-6" />} label="Pending Requests" value={(profile.attendance_leave?.leave_requests ?? []).length} />
        <StatCard icon={<CurrencyDollarIcon className="w-6 h-6" />} label="Salary" value={`${profile.payroll?.salary_amount} MAD`} />
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects */}
        <SectionCard title="Current Projects" icon={<BriefcaseIcon className="w-5 h-5 text-blue-500" />}>
          {profile.profile?.current_projects?.length > 0 ? (
            profile.profile.current_projects.map((proj) => (
              <div key={proj.project_id} className="border rounded p-3 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <p className="font-medium">{proj.name}</p>
                  <p className="text-sm text-gray-500">
                    {proj.start_date} – {proj.status}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No active projects.</p>
          )}
        </SectionCard>

        {/* Attendance & Leave */}
        <SectionCard title="Attendance & Leave" icon={<CalendarIcon className="w-5 h-5 text-blue-500" />}>
          <p className="text-sm text-gray-600 font-medium">Leave History:</p>
          <div className="space-y-2 mt-2">
            {profile.attendance_leave?.history_of_leaves?.length > 0 ? (
              profile.attendance_leave.history_of_leaves.map((leave) => (
                <div key={leave.id} className="border rounded p-2 bg-gray-50">
                  <p className="font-medium capitalize">{leave.type}</p>
                  <p className="text-xs text-gray-500">
                    {leave.start_date} → {leave.end_date}
                  </p>
                  <p className="text-xs text-gray-400">Status: {leave.status}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No leave history.</p>
            )}
          </div>
          {canRequestLeave && <LeaveRequestForm employee={profile} />}
        </SectionCard>

        {/* Payroll */}
        <SectionCard title="Payroll" icon={<CurrencyDollarIcon className="w-5 h-5 text-blue-500" />}>
          <p className="text-gray-600">Overtime: {profile.payroll?.overtime_hours} hrs</p>
          <p className="text-gray-600">Bonuses: {profile.payroll?.bonuses} MAD</p>
          <p className="text-gray-600">Deductions: {profile.payroll?.deductions} MAD</p>
          <div className="mt-3 space-y-2">
            <p className="font-medium">Payslips</p>
            {profile.payroll?.payslips?.map((p) => (
              <a
                key={p.id}
                href={p.file_url}
                target="_blank"
                className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
              >
                <ArrowDownTrayIcon className="w-4 h-4" /> {p.month} {p.year}
              </a>
            ))}
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
function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-3 hover:shadow-lg transition">
      <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white">{icon}</div>
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-lg font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-md space-y-3">
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
              <a href={url} target="_blank" className="hover:underline">
                {title} {i + 1}
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
function LeaveRequestForm({ employee }) {
  const [formData, setFormData] = useState({
    type: "vacation",
    start_date: "",
    end_date: "",
    reason: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.start_date || !formData.end_date || !formData.reason) {
      alert("All fields are required");
      return;
    }

    const newLeaveRequest = {
      id: Date.now(),
      type: formData.type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      reason: formData.reason,
      status: "pending",
      approved_by: null,
    };

    const updatedEmployee = {
      id: employee.id,
      attendance_leave: {
        ...employee.attendance_leave,
        leave_requests: [
          ...(employee.attendance_leave?.leave_requests || []),
          newLeaveRequest,
        ],
      },
    };

    const res = await fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedEmployee),
    });

    if (res.ok) {
      alert("Leave request submitted!");
      setFormData({ type: "vacation", start_date: "", end_date: "", reason: "" });
    } else {
      alert("Error submitting leave request");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 bg-gray-50 p-3 rounded-lg space-y-2">
      <h3 className="font-semibold text-blue-600">Request New Leave</h3>
      <select name="type" value={formData.type} onChange={handleChange} className="border px-2 py-1 w-full rounded">
        <option value="vacation">Vacation</option>
        <option value="sick">Sick</option>
        <option value="other">Other</option>
      </select>
      <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="border px-2 py-1 w-full rounded" />
      <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="border px-2 py-1 w-full rounded" />
      <input type="text" name="reason" value={formData.reason} onChange={handleChange} placeholder="Reason" className="border px-2 py-1 w-full rounded" />
      <button type="submit" className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700 transition">Submit Leave</button>
      <p className="text-sm text-gray-500">Remaining balance: {employee.attendance_leave?.leave_balance ?? 0}</p>
    </form>
  );
}
