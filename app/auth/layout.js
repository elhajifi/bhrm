"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  HomeIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

export default function AuthLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname(); // 👈 get current path
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      const res = await fetch("/api/me");
      const data = await res.json();
      setUser(data.user);
      setLoading(false);
    }
    fetchUser();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent border-solid rounded-full animate-spin"></div>
      </div>
    );

  const adminLinks = [
    { name: "Dashboard", href: "/auth/dashboard", icon: HomeIcon },
    { name: "Departments", href: "/auth/departments", icon: BuildingOffice2Icon },
    { name: "Employees", href: "/auth/employees", icon: UserGroupIcon },
    { name: "Leave Requests", href: "/auth/leave", icon: CalendarDaysIcon },
    { name: "Messages", href: "/auth/messages", icon: EnvelopeIcon },
    { name: "Payroll", href: "/auth/payroll", icon: BanknotesIcon },
  ];

  const employeeLinks = [
    { name: "My Profile", href: `/auth/employees/${user.id}`, icon: UserGroupIcon },
    { name: "Messages", href: "/auth/messages", icon: EnvelopeIcon },
    { name: "Payroll", href: "/auth/payroll", icon: BanknotesIcon },
  ];

  const links = user.role === "admin" ? adminLinks : employeeLinks;

  const initials =
    user?.first_name && user?.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`
      : "U";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center mx-2 mt-1 px-4 py-2.5 bg-blue-600 shadow-md rounded-lg top-0 z-50">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() =>
            router.push(
              user.role === "admin"
                ? "/auth/employees"
                : `/auth/employees/${user.id}`
            )
          }
        >
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-base">
            B
          </div>
          <span className="text-white font-bold text-lg hover:text-blue-200 transition-colors">
            Berbou HRM
          </span>
        </div>

        {/* Right Section: Messages + Profile + Logout */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/messages"
            className="relative text-white text-xl hover:text-blue-200 transition-colors"
            title="Messages"
          >
            💬
          </Link>

          <Link
            href={`/auth/employees/${user.id}`}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-medium text-blue-600 text-sm no-underline shadow hover:scale-105 transition-transform"
            title="Profile"
          >
            {initials}
          </Link>

          <button
            onClick={handleLogout}
            className="text-white hover:text-blue-200 transition-colors text-sm font-medium bg-blue-500 hover:bg-blue-500/80 px-2.5 py-1 rounded-lg shadow-sm"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-52 bg-white shadow-lg flex-shrink-0 sticky top-0 h-screen overflow-auto border-r border-blue-200">
          <nav className="px-2 py-4">
            <ul className="list-none p-0 m-0 mt-2.5 space-y-2">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href; // 👈 check active route
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded font-medium transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md"
                          : "hover:bg-blue-100 text-blue-900"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto min-h-0">{children}</main>
      </div>
    </div>
  );
}
