"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.user.role === "admin") router.push("/auth/dashboard");
      else router.push(`/auth/employees/${data.user.id}`);
    } else {
      setError(data.error || "Login failed");
    }
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-white overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-blue-400 via-blue-300/40 to-transparent rounded-full w-[150%] h-[150%] left-1/2 bottom-0 -translate-x-1/2 translate-y-1/4 opacity-40 blur-3xl"></div>

      <div className="w-full max-w-xs p-[2px] rounded-xl bg-gradient-to-r from-blue-300 via-blue-400 to-blue-500 shadow-lg">
        <div className="bg-white rounded-lg p-6">
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold p-2 rounded-md transition"
            >
              Login
            </button>
            {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
