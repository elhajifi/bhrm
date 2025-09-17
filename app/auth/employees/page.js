"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UserPlusIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

export default function EmployeesPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const emptyForm = {
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "employee",
    contract: "CDI",
    job_title: "",
    department: "",
    hire_date: "",
    work_days_per_year: 220,
    current_projects: [],
    salary_amount: 0,
    overtime_hours: 0,
    bonuses: 0,
    deductions: 0,
    leave_balance: 0,
    contracts: [],
    certificates: [],
    id_documents: [],
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    async function init() {
      const userRes = await fetch("/api/me");
      const { user } = await userRes.json();
      setUser(user);

      if (!user || user.role !== "admin") {
        alert("Access denied. Only admins can access this page.");
        router.push("/dashboard");
        return;
      }

      const res = await fetch("/api/data");
      const data = await res.json();
      setEmployees(data);
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

  // Add employee
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
            work_days_per_year: form.work_days_per_year,
            current_projects: form.current_projects,
          },
          attendance_leave: { leave_balance: form.leave_balance },
          payroll: {
            salary_amount: form.salary_amount,
            overtime_hours: form.overtime_hours,
            bonuses: form.bonuses,
            deductions: form.deductions,
          },
          documents: {
            contracts: form.contracts,
            certificates: form.certificates,
            id_documents: form.id_documents,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to add employee");

      const newEmployee = await res.json();
      setEmployees([...employees, newEmployee]);
      setForm(emptyForm);
      setShowAddModal(false);
    } catch (error) {
      console.error(error);
      alert("Error adding employee");
    }
  }

  // Edit employee
  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      const res = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEmployee.id,
          profile: {
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email,
            role: form.role,
            contract: form.contract,
            job_title: form.job_title,
            department: form.department,
            hire_date: form.hire_date,
            work_days_per_year: form.work_days_per_year,
            current_projects: form.current_projects,
          },
          attendance_leave: { leave_balance: form.leave_balance },
          payroll: {
            salary_amount: form.salary_amount,
            overtime_hours: form.overtime_hours,
            bonuses: form.bonuses,
            deductions: form.deductions,
          },
          documents: {
            contracts: form.contracts,
            certificates: form.certificates,
            id_documents: form.id_documents,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to update employee");

      const updatedEmployee = await res.json();
      setEmployees(
        employees.map((emp) =>
          emp.id === updatedEmployee.id ? updatedEmployee : emp
        )
      );
      setForm(emptyForm);
      setShowEditModal(false);
    } catch (error) {
      console.error(error);
      alert("Error updating employee");
    }
  }

  // Delete employee
  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      const res = await fetch("/api/data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error("Failed to delete employee");

      setEmployees(employees.filter((emp) => emp.id !== id));
    } catch (error) {
      console.error(error);
      alert("Error deleting employee");
    }
  }

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const firstName = emp.profile?.first_name?.toLowerCase() || "";
    const lastName = emp.profile?.last_name?.toLowerCase() || "";
    const department = emp.profile?.department?.toLowerCase() || "";
    const role = emp.profile?.role?.toLowerCase() || "";

    const search = filter.toLowerCase();
    return (
      firstName.includes(search) ||
      lastName.includes(search) ||
      department.includes(search) ||
      role.includes(search)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Employees Management
      </h1>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <input
          type="text"
          placeholder="Search by name, department or role"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-72 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition"
        >
          <UserPlusIcon className="w-5 h-5" /> Add Employee
        </button>
      </div>

      {showAddModal && (
        <EmployeeModal
          title="Add New Employee"
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {showEditModal && (
        <EmployeeModal
          title="Edit Employee"
          form={form}
          setForm={setForm}
          onSubmit={handleEditSubmit}
          onClose={() => setShowEditModal(false)}
        />
      )}

      <div className="bg-white rounded-2xl shadow hover:shadow-md transition p-5 border border-gray-100">
        <h2 className="text-lg font-medium text-gray-700 mb-4">
          Employees List
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
                <th className="px-6 py-3">Salary</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-b border-gray-200 hover:bg-blue-50/30 transition"
                >
                  <td className="px-6 py-4 flex items-center gap-3">
                    <UserIcon className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="font-semibold text-gray-800">
                        {emp.profile?.first_name || "-"}{" "}
                        {emp.profile?.last_name || "-"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {emp.profile?.email}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">{emp.profile?.job_title || "-"}</td>
                  <td className="px-6 py-4">{emp.profile?.department || "-"}</td>
                  <td className="px-6 py-4">{emp.profile?.contract || "-"}</td>
                  <td className="px-6 py-4">{emp.profile?.hire_date || "-"}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {emp.payroll?.salary_amount || 0}$
                  </td>
                  <td className="px-6 py-4 flex gap-3 justify-end">
                    <button
                      className="p-1.5 hover:bg-blue-100 rounded-lg border-2 border-blue-50 cursor-pointer"
                      onClick={() => router.push(`/auth/employees/${emp.id}`)}
                    >
                      <EyeIcon className="w-5 h-5 text-blue-600" />
                    </button>
                    <button
                      className="p-1.5 hover:bg-blue-100 rounded-lg border-2 border-blue-50 cursor-pointer"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setForm({
                          ...emp.profile,
                          salary_amount: emp.payroll?.salary_amount || 0,
                          overtime_hours: emp.payroll?.overtime_hours || 0,
                          bonuses: emp.payroll?.bonuses || 0,
                          deductions: emp.payroll?.deductions || 0,
                          leave_balance: emp.attendance_leave?.leave_balance || 0,
                          current_projects: emp.profile?.current_projects || [],
                          contracts: emp.documents?.contracts || [],
                          certificates: emp.documents?.certificates || [],
                          id_documents: emp.documents?.id_documents || [],
                        });
                        setShowEditModal(true);
                      }}
                    >
                      <PencilIcon className="w-5 h-5 text-blue-600" />
                    </button>
                    <button
                      className="p-1.5 hover:bg-red-100 border-2 border-red-50 rounded-lg cursor-pointer"
                      onClick={() => handleDelete(emp.id)}
                    >
                      <TrashIcon className="w-5 h-5 text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-gray-500">
                    No employees found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
// Modal Component
function EmployeeModal({ title, form, setForm, onSubmit, onClose }) {
  const updateProject = (index, key, value) => {
    const projects = [...form.current_projects];
    projects[index] = { ...projects[index], [key]: value };
    setForm({ ...form, current_projects: projects });
  };

  const addProject = () => {
    const newProject = { project_id: Date.now(), name: "", start_date: "", status: "" };
    setForm({ ...form, current_projects: [...form.current_projects, newProject] });
  };

  const removeProject = (index) => {
    const projects = form.current_projects.filter((_, i) => i !== index);
    setForm({ ...form, current_projects: projects });
  };

  return (
    <div className="fixed inset-0 bg-gray-200 h-full bg-opacity-30 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh]  overflow-y-auto animate-fadeIn my-6 p-6 space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>

        <form className="grid grid-cols-1 md:grid-cols-3 gap-6" onSubmit={onSubmit}>

          {/* --- General Info Section --- */}
          <div className="md:col-span-3">
            <h3 className="text-lg font-medium text-gray-700 border-b pb-2 mb-4">General Information</h3>
          </div>
          {[
            { label: "First Name", key: "first_name" },
            { label: "Last Name", key: "last_name" },
            { label: "Email", key: "email", type: "email" },
            { label: "Password", key: "password", type: "password" },
            { label: "Role", key: "role" },
            { label: "Job Title", key: "job_title" },
            { label: "Department", key: "department" },
            { label: "Contract", key: "contract" },
            { label: "Hire Date", key: "hire_date", type: "date" },
            { label: "Work Days Per Year", key: "work_days_per_year", type: "number" },
          ].map((field) => (
            <div key={field.key} className="flex flex-col">
              <label htmlFor={field.key} className="text-gray-700 font-medium mb-1">{field.label}</label>
              <input
                id={field.key}
                type={field.type || "text"}
                placeholder={field.label}
                value={Array.isArray(form[field.key]) ? form[field.key].join(", ") : form[field.key]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [field.key]:
                      field.key.includes("contracts") ||
                        field.key.includes("certificates") ||
                        field.key.includes("id_documents")
                        ? e.target.value.split(",").map((v) => v.trim())
                        : e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>
          ))}

          {/* --- Payroll Section --- */}
          <div className="md:col-span-3 mt-6">
            <h3 className="text-lg font-medium text-gray-700 border-b pb-2 mb-4">Payroll</h3>
          </div>
          {[
            { label: "Salary ($)", key: "salary_amount", type: "number" },
            { label: "Overtime Hours", key: "overtime_hours", type: "number" },
            { label: "Bonuses", key: "bonuses", type: "number" },
            { label: "Deductions", key: "deductions", type: "number" },
            { label: "Leave Balance", key: "leave_balance", type: "number" },
          ].map((field) => (
            <div key={field.key} className="flex flex-col">
              <label htmlFor={field.key} className="text-gray-700 font-medium mb-1">{field.label}</label>
              <input
                id={field.key}
                type={field.type || "text"}
                placeholder={field.label}
                value={Array.isArray(form[field.key]) ? form[field.key].join(", ") : form[field.key]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [field.key]:
                      field.key.includes("contracts") ||
                        field.key.includes("certificates") ||
                        field.key.includes("id_documents")
                        ? e.target.value.split(",").map((v) => v.trim())
                        : e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>
          ))}

          {/* --- Documents Section --- */}
          <div className="md:col-span-3 mt-6">
            <h3 className="text-lg font-medium text-gray-700 border-b pb-2 mb-4">Documents</h3>
          </div>
          {[
            { label: "Contracts (comma-separated URLs)", key: "contracts" },
            { label: "Certificates (comma-separated URLs)", key: "certificates" },
            { label: "ID Documents (comma-separated URLs)", key: "id_documents" },
          ].map((field) => (
            <div key={field.key} className="flex flex-col">
              <label htmlFor={field.key} className="text-gray-700 font-medium mb-1">{field.label}</label>
              <input
                id={field.key}
                type="text"
                placeholder={field.label}
                value={Array.isArray(form[field.key]) ? form[field.key].join(", ") : form[field.key]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [field.key]: e.target.value.split(",").map((v) => v.trim()),
                  })
                }
                className="border border-gray-300 rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>
          ))}

          {/* --- Current Projects Section --- */}
<div className="md:col-span-3 mt-6">
  <h3 className="text-lg font-medium text-gray-700 border-b pb-2 mb-4">
    Current Projects
  </h3>

  <div className="space-y-3">
    {form.current_projects.map((project, index) => (
      <div
        key={project.project_id}
        className="flex flex-col  md:flex-row gap-3 items-start md:items-end bg-blue-50 p-4 rounded-xl border border-blue-100"
      >
        <div className="flex-1 flex flex-col">
          <label className="text-gray-700 text-sm font-medium mb-1">
            Project Name
          </label>
          <input
            type="text"
            placeholder="Project Name"
            value={project.name}
            onChange={(e) => updateProject(index, "name", e.target.value)}
            className="border border-gray-300 rounded-2xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col w-full md:w-40">
          <label className="text-gray-700 text-sm font-medium mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={project.start_date}
            onChange={(e) => updateProject(index, "start_date", e.target.value)}
            className="border border-gray-300 rounded-2xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col w-full md:w-32">
          <label className="text-gray-700 text-sm font-medium mb-1">
            Status
          </label>
          <input
            type="text"
            placeholder="Status"
            value={project.status}
            onChange={(e) => updateProject(index, "status", e.target.value)}
            className="border border-gray-300 rounded-2xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="button"
          onClick={() => removeProject(index)}
          className="text-red-600 border border-red-600 font-bold px-4 py-2 mt-2 md:mt-0 rounded-lg hover:bg-red-100 cursor-pointer"
        >
          Remove
        </button>
      </div>
    ))}

    <button
      type="button"
      onClick={addProject}
      className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
    >
      + Add Project
    </button>
  </div>
</div>


          {/* --- Form Actions --- */}
          <div className="md:col-span-3 flex justify-end gap-3 mt-6">
            <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">
              Save
            </button>
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300">
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>

  );
}
