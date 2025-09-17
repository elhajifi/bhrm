"use client";
import { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

export default function LeavePage() {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    async function fetchProfiles() {
      const res = await fetch("/api/data");
      const data = await res.json();
      setProfiles(data);
    }
    fetchProfiles();
  }, []);

  async function handleLeaveAction(employeeId, leaveId, action) {
    const employee = profiles.find((p) => p.id === employeeId);
    if (!employee) return;

    const leaveIndex = employee.attendance_leave.leave_requests.findIndex(
      (l) => l.id === leaveId
    );
    if (leaveIndex === -1) return;

    const leave = {
      ...employee.attendance_leave.leave_requests[leaveIndex],
      status: action,
    };

    employee.attendance_leave.leave_requests.splice(leaveIndex, 1);
    employee.attendance_leave.history_of_leaves = [
      ...(employee.attendance_leave.history_of_leaves || []),
      leave,
    ];

    await fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: employeeId,
        attendance_leave: {
          leave_requests: employee.attendance_leave.leave_requests,
          history_of_leaves: employee.attendance_leave.history_of_leaves,
        },
      }),
    });

    setProfiles([...profiles]);
  }

  const allRequests = profiles
    .flatMap((p) =>
      (p.attendance_leave?.leave_requests || []).map((req) => ({
        ...req,
        employeeName: `${p.profile.first_name} ${p.profile.last_name}`,
        employeeId: p.id,
      }))
    )
    .sort((a, b) => {
      if (
        a.status !== "approved" &&
        a.status !== "rejected" &&
        (b.status === "approved" || b.status === "rejected")
      )
        return -1;
      if (
        (a.status === "approved" || a.status === "rejected") &&
        b.status !== "approved" &&
        b.status !== "rejected"
      )
        return 1;
      return new Date(b.start_date) - new Date(a.start_date);
    });

  const allHistory = profiles
    .flatMap((p) =>
      (p.attendance_leave?.history_of_leaves || []).map((h) => ({
        ...h,
        employeeName: `${p.profile.first_name} ${p.profile.last_name}`,
      }))
    )
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <h1 className="text-2xl font-semibold text-gray-800">
        Leave Requests Dashboard
      </h1>

      {/* Pending Requests */}
      <section>
        <h2 className="text-lg font-medium text-gray-700 flex items-center gap-2 mb-4">
          <ClockIcon className="w-5 h-5 text-blue-600" />
          Pending / Current Requests
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {allRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl shadow hover:shadow-md transition p-5 space-y-3 border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <UserIcon className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-semibold text-gray-800">
                    {req.employeeName}
                  </p>
                  <p className="text-sm text-gray-500">{req.type}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-1 text-sm text-gray-600">
                <InfoRow label="Period" value={`${req.start_date} → ${req.end_date}`} />
                <InfoRow label="Reason" value={req.reason} />
                <InfoRow
                  label="Status"
                  value={req.status}
                  statusColor={
                    req.status === "approved"
                      ? "green"
                      : req.status === "rejected"
                      ? "red"
                      : "yellow"
                  }
                />
              </div>

              {req.status !== "approved" && req.status !== "rejected" && (
                <div className="flex gap-2 mt-4">
                  <ActionButton
                    label="Approve"
                    icon={<CheckCircleIcon className="w-5 h-5" />}
                    color="blue"
                    onClick={() =>
                      handleLeaveAction(req.employeeId, req.id, "approved")
                    }
                  />
                  <ActionButton
                    label="Reject"
                    icon={<XCircleIcon className="w-5 h-5" />}
                    color="red"
                    onClick={() =>
                      handleLeaveAction(req.employeeId, req.id, "rejected")
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Leave History */}
      <section>
        <h2 className="text-lg font-medium text-gray-700 flex items-center gap-2 mb-4">
          <ClockIcon className="w-5 h-5 text-gray-600" />
          Leave History
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {allHistory.map((h) => (
            <div
              key={h.id}
              className="bg-white rounded-2xl shadow hover:shadow-md transition p-5 space-y-2 border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <UserIcon className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-semibold text-gray-800">{h.employeeName}</p>
                  <p className="text-sm text-gray-500">{h.type}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-1 text-sm text-gray-600">
                <InfoRow label="Period" value={`${h.start_date} → ${h.end_date}`} />
                <InfoRow label="Reason" value={h.reason} />
                <InfoRow
                  label="Status"
                  value={h.status}
                  statusColor={
                    h.status === "approved"
                      ? "green"
                      : h.status === "rejected"
                      ? "red"
                      : "yellow"
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* --- Reusable Components --- */
function InfoRow({ label, value, statusColor }) {
  const colorMap = {
    green: "text-green-600",
    red: "text-red-600",
    yellow: "text-yellow-600",
  };
  return (
    <div className="flex justify-between">
      <span className="text-gray-600 font-medium">{label}:</span>
      <span className={`${statusColor ? colorMap[statusColor] : "text-gray-800"} font-medium`}>
        {value}
      </span>
    </div>
  );
}

function ActionButton({ label, icon, color, onClick }) {
  const colorMap = {
    blue: "bg-blue-600 hover:bg-blue-700",
    red: "bg-red-600 hover:bg-red-700",
  };
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-2 text-white rounded transition-colors flex items-center justify-center gap-2 ${colorMap[color]}`}
    >
      {icon} {label}
    </button>
  );
}
