"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already logged in? Go straight to the app.
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(({ user }) => {
        if (user) router.replace("/auth/dashboard");
      })
      .catch(() => {});
  }, [router]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/auth/dashboard");
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-white overflow-hidden px-4">
      <div className="absolute -z-10 bg-gradient-to-t from-blue-400 via-blue-300/40 to-transparent rounded-full w-[150%] h-[150%] left-1/2 bottom-0 -translate-x-1/2 translate-y-1/4 opacity-40 blur-3xl" />

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow">
            B
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Berbou HRM</h1>
          <p className="text-sm text-gray-500">Understand. Empower. Grow.</p>
        </div>

        <div className="p-[2px] rounded-xl bg-gradient-to-r from-blue-300 via-blue-400 to-blue-500 shadow-lg">
          <div className="bg-white rounded-lg p-6">
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <label className="text-sm font-medium text-gray-700" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                placeholder="you@bhrm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
              <label className="text-sm font-medium text-gray-700" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold p-2 rounded-md transition"
              >
                {submitting ? "Signing in…" : "Login"}
              </button>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </form>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Demo admin: <span className="font-mono">guest@bhrm.com</span> / <span className="font-mono">guest</span>
        </p>
      </div>
    </div>
  );
}
