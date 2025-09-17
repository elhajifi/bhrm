"use client";
import Link from "next/link";

export default function Sidebar({ user }) {
  if (!user) return null;

  const adminLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Departments", href: "/departments" },
    { name: "Employees", href: "/employees" },
    { name: "Leave Requests", href: "/leave" },
    { name: "Messages", href: "/messages" },
    { name: "Payroll", href: "/payroll" },
  ];

  const employeeLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "My Profile", href: `/employees/${user.id}` },
    { name: "Messages", href: "/messages" },
    { name: "Payroll", href: "/payroll" },
  ];

  const links = user.role === "admin" ? adminLinks : employeeLinks;

  return (
    <aside
      style={{
        width: "220px",
        minHeight: "100vh",
        backgroundColor: "#1e1e1e",
        color: "#fff",
        padding: "2rem 1rem",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRight: "1px solid #2c2c2c",
      }}
    >
      <div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "2rem", color: "#00f0ff" }}>
          Menu
        </h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {links.map((link) => (
            <li key={link.href} style={{ margin: "1rem 0" }}>
              <Link
                href={link.href}
                style={{
                  textDecoration: "none",
                  color: "#ccc",
                  fontWeight: 500,
                  transition: "color 0.2s",
                }}
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: "2rem", fontSize: "0.85rem", color: "#555" }}>
        Logged in as: <br />
        <span style={{ color: "#00f0ff", fontWeight: "bold" }}>{user.email}</span>
      </div>
    </aside>
  );
}
