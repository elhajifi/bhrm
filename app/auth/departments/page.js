"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserIcon,
  BriefcaseIcon,
  CalendarIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

export default function DepartmentsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [departments, setDepartments] = useState({});
  const [filter, setFilter] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

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
      setProfiles(data);

      const grouped = data.reduce((acc, employee) => {
        const dept = employee.profile.department || "Unassigned";
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(employee);
        return acc;
      }, {});

      setDepartments(grouped);
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

  // filter employees
  const filteredDepartments = Object.keys(departments).reduce((acc, dept) => {
    const filteredEmps = departments[dept].filter((emp) => {
      const fullName = `${emp.profile.first_name} ${emp.profile.last_name}`.toLowerCase();
      return (
        fullName.includes(filter.toLowerCase()) ||
        dept.toLowerCase().includes(filter.toLowerCase())
      );
    });
    if (filteredEmps.length > 0) acc[dept] = filteredEmps;
    return acc;
  }, {});

  const employeesToShow =
    selectedDept === "all"
      ? Object.values(filteredDepartments).flat()
      : filteredDepartments[selectedDept] || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Departments Overview</h1>

      {/* Filter */}
      <div>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search by name or department..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* Departments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.keys(filteredDepartments).map((dept) => (
          <div key={dept} className="bg-white rounded-2xl shadow hover:shadow-md transition p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-blue-700">{dept}</h2>
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                {filteredDepartments[dept].length} Employees
              </span>
            </div>

            {/* Employees in Department */}
            <div className="space-y-3">
              {filteredDepartments[dept].map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-blue-50 transition">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                    {emp.profile.first_name[0]}{emp.profile.last_name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{emp.profile.first_name} {emp.profile.last_name}</p>
                    <p className="text-sm text-blue-700">{emp.profile.job_title}</p>
                    <p className="text-sm text-gray-500">{emp.profile.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
