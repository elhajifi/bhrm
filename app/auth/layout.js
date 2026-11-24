"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  HomeIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
  UserIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  BanknotesIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { UserProvider } from "@/components/UserContext";
import { Spinner, initials } from "@/components/ui";

export default function AuthLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchUser() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!data.user) {
          router.replace("/");
          return;
        }
        setUser(data.user);
      } catch {
        router.replace("/");
      }
    }
    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Unread message counter (refreshed when the page changes)
  useEffect(() => {
    if (!user) return;
    fetch("/api/messages", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((msgs) => setUnread(msgs.filter((m) => !m.read && !m.deleted && m.to === String(user.id)).length))
      .catch(() => {});
  }, [user, pathname]);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (!user) return <Spinner />;

  const adminLinks = [
    { name: "Dashboard", href: "/auth/dashboard", icon: HomeIcon },
    { name: "Departments", href: "/auth/departments", icon: BuildingOffice2Icon },
    { name: "Employees", href: "/auth/employees", icon: UserGroupIcon },
    { name: "Leave Requests", href: "/auth/leave", icon: CalendarDaysIcon },
    { name: "Messages", href: "/auth/messages", icon: EnvelopeIcon },
    { name: "Payroll", href: "/auth/payroll", icon: BanknotesIcon },
  ];

  const employeeLinks = [
    { name: "Dashboard", href: "/auth/dashboard", icon: HomeIcon },
    { name: "My Profile", href: `/auth/employees/${user.id}`, icon: UserIcon },
    { name: "Messages", href: "/auth/messages", icon: EnvelopeIcon },
    { name: "Payroll", href: "/auth/payroll", icon: BanknotesIcon },
  ];

  const links = user.role === "admin" ? adminLinks : employeeLinks;

  const isActive = (href) => {
    // "Employees" shouldn't light up when an admin views their own profile link, etc.
    if (href === "/auth/employees") return pathname === href || (pathname.startsWith(href + "/") && pathname !== `/auth/employees/${user.id}`);
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  };

  return (
    <UserProvider user={user}>
      <div className="flex flex-col min-h-screen bg-white text-gray-900 font-sans">
        {/* Header */}
        <header className="no-print sticky top-0 z-40 flex justify-between items-center mx-2 mt-1 px-4 py-2.5 bg-blue-600 shadow-md rounded-lg">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden text-white"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <Link href="/auth/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-base">
                B
              </div>
              <span className="text-white font-bold text-lg hover:text-blue-200 transition-colors">
                Berbou HRM
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/messages"
              className="relative text-white hover:text-blue-200 transition-colors"
              title="Messages"
            >
              <EnvelopeIcon className="w-6 h-6" />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                  {unread}
                </span>
              )}
            </Link>

            <Link
              href={`/auth/employees/${user.id}`}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-medium text-blue-600 text-sm shadow hover:scale-105 transition-transform"
              title={user.name}
            >
              {initials(user.first_name, user.last_name)}
            </Link>

            <button
              onClick={handleLogout}
              className="text-white transition-colors text-sm font-medium bg-blue-500 hover:bg-blue-700 px-2.5 py-1 rounded-lg shadow-sm"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <aside
            className={`no-print ${menuOpen ? "block" : "hidden"} md:block w-52 bg-white shadow-lg flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-auto border-r border-blue-200`}
          >
            <nav className="px-2 py-4">
              <ul className="list-none p-0 m-0 mt-2.5 space-y-2">
                {links.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded font-medium transition-colors ${
                          active ? "bg-blue-600 text-white shadow-md" : "hover:bg-blue-100 text-blue-900"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {link.name}
                        {link.href === "/auth/messages" && unread > 0 && (
                          <span className={`ml-auto text-xs rounded-full px-2 ${active ? "bg-white text-blue-600" : "bg-blue-600 text-white"}`}>
                            {unread}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="px-4 py-3 text-xs text-gray-500 border-t">
              Logged in as
              <div className="font-medium text-blue-700 truncate">{user.email}</div>
              <div className="capitalize">{user.role}</div>
            </div>
          </aside>

          <main className="flex-1 overflow-auto min-h-0">{children}</main>
        </div>
      </div>
    </UserProvider>
  );
}
