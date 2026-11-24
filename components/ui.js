"use client";
// Small shared UI pieces.

export function Spinner({ full = true }) {
  return (
    <div className={`flex items-center justify-center ${full ? "min-h-[60vh]" : "py-10"}`}>
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function Notice({ notice, onClose }) {
  if (!notice) return null;
  const styles =
    notice.type === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-green-50 border-green-200 text-green-700";
  return (
    <div className={`flex items-start justify-between gap-4 border rounded-lg px-4 py-3 text-sm ${styles}`}>
      <span>{notice.text}</span>
      {onClose && (
        <button onClick={onClose} className="font-bold opacity-60 hover:opacity-100" aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    pending: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

export function initials(first = "", last = "") {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase() || "?";
}

/** Shown when an employee opens an admin-only page. */
export function AdminOnly() {
  return (
    <div className="p-10 text-center text-gray-600">
      <p className="text-lg font-medium">This page is for administrators only.</p>
    </div>
  );
}
