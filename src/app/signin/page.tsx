"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Login failed");

      // store in localStorage/session
      localStorage.setItem("user", JSON.stringify(data.data.user));
      localStorage.setItem("token", data.data.token || data.data.accessToken);

      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950">
      <form
        onSubmit={handleLogin}
        className="bg-white/10 backdrop-blur p-8 rounded-xl shadow-lg space-y-4 w-full max-w-md"
      >
        <h1 className="text-2xl font-bold text-white">Sign in to HR Portal</h1>
        <input
          type="string"
          placeholder="Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 rounded bg-white/20 text-white"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded bg-white/20 text-white"
        />
        {error && <p className="text-red-400">{error}</p>}
        <button
          type="submit"
          className="w-full p-3 rounded bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
