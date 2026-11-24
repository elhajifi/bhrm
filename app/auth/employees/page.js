"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PencilIcon, TrashIcon, EyeIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useUser } from "@/components/UserContext";
import { useGuard } from "@/components/ReadOnly";
import { AdminOnly, Notice, Spinner, initials } from "@/components/ui";
import { api } from "@/lib/api";
import { CONTRACT_TYPES, ROLES, formatMoney } from "@/lib/hr";

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  role: "employee",
  contract: "CDI",
  job_title: "",
  department: "",
  hire_date: new Date().toISOString().slice(0, 10),
  work_days_per_year: 220,
  current_projects: [],
  salary_amount: 0,
  overtime_hours: 0,
  bonuses: 0,
  deductions: 0,
  leave_balance: 25,
  contracts: "",
  certificates: "",
  id_documents: "",
};

function toForm(emp) {
  const p = emp.profile || {};
  return {
    ...emptyForm,
    first_name: p.first_name || "",
    last_name: p.last_name || "",
    email: p.email || "",
    password: "",
    role: p.role || "employee",
    contract: p.contract || "CDI",
    job_title: p.job_title || "",
    department: p.department || "",
    hire_date: p.hire_date || "",
    work_days_per_year: p.work_days_per_year ?? 220,
    current_projects: p.current_projects || [],
    salary_amount: emp.payroll?.salary_amount ?? 0,
    overtime_hours: emp.payroll?.overtime_hours ?? 0,
    bonuses: emp.payroll?.bonuses ?? 0,
    deductions: emp.payroll?.deductions ?? 0,
    leave_balance: emp.attendance_leave?.leave_balance ?? 0,
    contracts: (emp.documents?.contracts || []).join(", "),
    certificates: (emp.documents?.certificates || []).join(", "),
    id_documents: (emp.documents?.id_documents || []).join(", "),
  };
}

function toPayload(form) {
  const list = (s) => String(s || "").split(",").map((v) => v.trim()).filter(Boolean);
  return {
    profile: {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      password: form.password,
      role: form.role,
      contract: form.contract,
      job_title: form.job_title,
      department: form.department,
      hire_date: form.hire_date,
      work_days_per_year: Number(form.work_days_per_year),
      current_projects: form.current_projects,
    },
    attendance_leave: { leave_balance: Number(form.leave_balance) },
    payroll: {
      salary_amount: Number(form.salary_amount),
      overtime_hours: Number(form.overtime_hours),
      bonuses: Number(form.bonuses),
      deductions: Number(form.deductions),
    },
    documents: {
      contracts: list(form.contracts),
      certificates: list(form.certificates),
      id_documents: list(form.id_documents),
    },
  };
}

export default function EmployeesPage() {
  const user = useUser();
  const guard = useGuard();
  const canEdit = !user.readOnly;
  const [employees, setEmployees] = useState(null);
  const [filter, setFilter] = useState("");
  const [modal, setModal] = useState(null); // null | { mode: "add" } | { mode: "edit", id }
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user.role !== "admin") return;
    api("/api/data")
      .then(setEmployees)
      .catch((e) => setNotice({ type: "error", text: e.message }));
  }, [user.role]);

  if (user.role !== "admin") return <AdminOnly />;
  if (!employees) return notice ? <div className="p-6"><Notice notice={notice} /></div> : <Spinner />;

  const departments = Array.from(new Set(employees.map((e) => e.profile?.department).filter(Boolean))).sort();

  function openAdd() {
    setForm(emptyForm);
    setFormError("");
    setModal({ mode: "add" });
  }

  function openEdit(emp) {
    setForm(toForm(emp));
    setFormError("");
    setModal({ mode: "edit", id: emp.id });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      if (modal.mode === "add") {
        const created = await api("/api/data", { method: "POST", body: toPayload(form) });
        setEmployees((list) => [...list, created]);
        setNotice({ type: "success", text: `${created.profile.first_name} ${created.profile.last_name} was added.` });
      } else {
        const updated = await api("/api/data", { method: "PUT", body: { id: modal.id, ...toPayload(form) } });
        setEmployees((list) => list.map((emp) => (emp.id === updated.id ? updated : emp)));
        setNotice({ type: "success", text: "Changes saved." });
      }
      setModal(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(emp) {
    const name = `${emp.profile?.first_name} ${emp.profile?.last_name}`;
    if (!window.confirm(`Delete ${name}? This can't be undone.`)) return;
    try {
      await api("/api/data", { method: "DELETE", body: { id: emp.id } });
      setEmployees((list) => list.filter((e) => e.id !== emp.id));
      setNotice({ type: "success", text: `${name} was deleted.` });
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  }

  const search = filter.toLowerCase();
  const filteredEmployees = employees.filter((emp) =>
    [emp.profile?.first_name, emp.profile?.last_name, emp.profile?.email, emp.profile?.department, emp.profile?.role, emp.profile?.job_title]
      .join(" ")
      .toLowerCase()
      .includes(search)
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Employees Management</h1>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <input
          type="text"
          placeholder="Search by name, email, department or role"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-80 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {canEdit && (
          <button
            onClick={guard(openAdd)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition"
          >
            <UserPlusIcon className="w-5 h-5" /> Add Employee
          </button>
        )}
      </div>

      {modal && (
        <EmployeeModal
          title={modal.mode === "add" ? "Add New Employee" : "Edit Employee"}
          isEdit={modal.mode === "edit"}
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          error={formError}
          saving={saving}
          departments={departments}
        />
      )}

      <div className="bg-white rounded-2xl shadow hover:shadow-md transition p-5 border border-gray-100">
        <h2 className="text-lg font-medium text-gray-700 mb-4">
          Employees List <span className="text-sm text-gray-400">({filteredEmployees.length})</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Job Title</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Contract</th>
                <th className="px-6 py-3">Hire Date</th>
                <th className="px-6 py-3 text-right">Salary</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="border-b border-gray-200 hover:bg-blue-50/30 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 shrink-0 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs">
                        {initials(emp.profile?.first_name, emp.profile?.last_name)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {emp.profile?.first_name} {emp.profile?.last_name}
                          {emp.profile?.role === "admin" && (
                            <span className="ml-2 text-[10px] uppercase bg-blue-600 text-white rounded px-1.5 py-0.5">admin</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{emp.profile?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{emp.profile?.job_title || "-"}</td>
                  <td className="px-6 py-4">{emp.profile?.department || "-"}</td>
                  <td className="px-6 py-4">{emp.profile?.contract || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{emp.profile?.hire_date || "-"}</td>
                  <td className="px-6 py-4 font-medium text-gray-800 text-right whitespace-nowrap">
                    {formatMoney(emp.payroll?.salary_amount)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={`/auth/employees/${emp.id}`}
                        className="p-1.5 hover:bg-blue-100 rounded-lg border-2 border-blue-50"
                        title="View profile"
                      >
                        <EyeIcon className="w-5 h-5 text-blue-600" />
                      </Link>
                      {canEdit && (
                      <button
                        className="p-1.5 hover:bg-blue-100 rounded-lg border-2 border-blue-50"
                        onClick={guard(() => openEdit(emp))}
                        title="Edit"
                      >
                        <PencilIcon className="w-5 h-5 text-blue-600" />
                      </button>
                      )}
                      {canEdit && emp.id !== user.id && (
                        <button
                          className="p-1.5 hover:bg-red-100 border-2 border-red-50 rounded-lg"
                          onClick={guard(() => handleDelete(emp))}
                          title="Delete"
                        >
                          <TrashIcon className="w-5 h-5 text-red-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-gray-500">No employees found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Modal -------------------- */

const inputClass =
  "border border-gray-300 rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white";

function Field({ label, id, children }) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="text-gray-700 font-medium mb-1 text-sm">{label}</label>
      {children}
    </div>
  );
}

function EmployeeModal({ title, isEdit, form, setForm, onSubmit, onClose, error, saving, departments }) {
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const updateProject = (index, key, value) =>
    setForm((f) => {
      const projects = [...f.current_projects];
      projects[index] = { ...projects[index], [key]: value };
      return { ...f, current_projects: projects };
    });

  const addProject = () =>
    setForm((f) => ({
      ...f,
      current_projects: [...f.current_projects, { project_id: Date.now(), name: "", start_date: "", status: "ongoing" }],
    }));

  const removeProject = (index) =>
    setForm((f) => ({ ...f, current_projects: f.current_projects.filter((_, i) => i !== index) }));

  const text = (label, key, props = {}) => (
    <Field label={label} id={key} key={key}>
      <input id={key} value={form[key]} onChange={set(key)} className={inputClass} {...props} />
    </Field>
  );

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex justify-center items-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl" aria-label="Close">✕</button>
        </div>

        <form className="grid grid-cols-1 md:grid-cols-3 gap-6" onSubmit={onSubmit}>
          <SectionTitle>General Information</SectionTitle>
          {text("First Name *", "first_name", { required: true })}
          {text("Last Name *", "last_name", { required: true })}
          {text("Email *", "email", { type: "email", required: true })}
          {text(isEdit ? "New password (leave empty to keep)" : "Password *", "password", {
            type: "password",
            required: !isEdit,
            minLength: 4,
            autoComplete: "new-password",
          })}
          <Field label="Role" id="role">
            <select id="role" value={form.role} onChange={set("role")} className={inputClass}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          {text("Job Title", "job_title")}
          <Field label="Department" id="department">
            <input id="department" list="departments" value={form.department} onChange={set("department")} className={inputClass} />
            <datalist id="departments">
              {departments.map((d) => <option key={d} value={d} />)}
            </datalist>
          </Field>
          <Field label="Contract" id="contract">
            <select id="contract" value={form.contract} onChange={set("contract")} className={inputClass}>
              {CONTRACT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          {text("Hire Date", "hire_date", { type: "date" })}
          {text("Work Days Per Year", "work_days_per_year", { type: "number", min: 1, max: 366 })}

          <SectionTitle>Payroll &amp; Leave</SectionTitle>
          {text("Monthly salary (gross)", "salary_amount", { type: "number", min: 0, step: "0.01" })}
          {text("Overtime hours (this month)", "overtime_hours", { type: "number", min: 0, step: "0.5" })}
          {text("Bonuses", "bonuses", { type: "number", min: 0, step: "0.01" })}
          {text("Deductions", "deductions", { type: "number", min: 0, step: "0.01" })}
          {text("Leave balance (days)", "leave_balance", { type: "number", min: 0, step: "0.5" })}

          <SectionTitle>Documents</SectionTitle>
          {text("Contracts (comma-separated URLs)", "contracts")}
          {text("Certificates (comma-separated URLs)", "certificates")}
          {text("ID documents (comma-separated URLs)", "id_documents")}

          <div className="md:col-span-3">
            <h3 className="text-lg font-medium text-gray-700 border-b pb-2 mb-4">Current Projects</h3>
            <div className="space-y-3">
              {form.current_projects.map((project, index) => (
                <div
                  key={project.project_id}
                  className="flex flex-col md:flex-row gap-3 items-start md:items-end bg-blue-50 p-4 rounded-xl border border-blue-100"
                >
                  <div className="flex-1 flex flex-col w-full">
                    <label className="text-gray-700 text-sm font-medium mb-1">Project name</label>
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) => updateProject(index, "name", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col w-full md:w-44">
                    <label className="text-gray-700 text-sm font-medium mb-1">Start date</label>
                    <input
                      type="date"
                      value={project.start_date}
                      onChange={(e) => updateProject(index, "start_date", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col w-full md:w-36">
                    <label className="text-gray-700 text-sm font-medium mb-1">Status</label>
                    <select
                      value={project.status}
                      onChange={(e) => updateProject(index, "status", e.target.value)}
                      className={inputClass}
                    >
                      {["ongoing", "on hold", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProject(index)}
                    className="text-red-600 border border-red-600 font-bold px-4 py-2 rounded-lg hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" onClick={addProject} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                + Add Project
              </button>
            </div>
          </div>

          {error && (
            <div className="md:col-span-3">
              <Notice notice={{ type: "error", text: error }} />
            </div>
          )}

          <div className="md:col-span-3 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="md:col-span-3">
      <h3 className="text-lg font-medium text-gray-700 border-b pb-2">{children}</h3>
    </div>
  );
}
