"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toCanonicalRole } from "@/lib/api";

export default function SignInPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Login failed");

      // handle multiple backend response shapes
      // Expected shapes:
      // 1) { data: { role, token, userId }, success }
      // 2) { data: { user: { ...role }, token } }
      const payload = data?.data || {};
      const token = payload.token || payload.accessToken || data?.token;
      const role = toCanonicalRole(payload.role || payload.user?.role);
      const user = payload.user || {
        id: payload.userId?.toString?.() || payload.id?.toString?.() || "",
        email: payload.email || username,
        name: payload.name || username,
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // persist
      localStorage.setItem("user", JSON.stringify({ ...user, role }));
      if (token) localStorage.setItem("token", token);

      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950">
      <form
        onSubmit={handleLogin}
        className="bg-white/10 backdrop-blur p-8 rounded-xl shadow-2xl shadow-purple-900/30 space-y-4 w-full max-w-md border border-white/10"
      >
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Sign in to HR Portal</h1>
        <input
          type="string"
          placeholder="Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 rounded bg-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded bg-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
        />
        {error && <p className="text-red-400">{error}</p>}
        <button
          type="submit"
          className="w-full p-3 rounded bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-shadow"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
