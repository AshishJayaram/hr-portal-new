"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingSignIn() {
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
        body: JSON.stringify({ username: username, password }), // 👈 adjust field
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");

        // ✅ Store JWT
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("userId", data.data.userId);
        localStorage.setItem("role", data.data.role);

        router.push("/dashboard");
    } catch (err: any) {
        setError(err.message);
    }
    };


  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-pink-500 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-2xl px-6 text-center">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-pink-400 to-yellow-400 bg-clip-text text-transparent">
          Welcome to HR Portal
        </h1>
        <p className="mt-4 text-lg text-gray-200">
          Manage your leaves, salary slips, and official documents with ease.  
          Stay connected with your team and track your growth within the organisation.
        </p>

        <form
          onSubmit={handleLogin}
          className="mt-10 w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-xl"
        >
          <h2 className="text-2xl font-bold mb-6">Sign in to Continue</h2>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full mb-4 p-3 rounded-lg bg-white/20 text-white focus:ring-2 focus:ring-pink-400 outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-4 p-3 rounded-lg bg-white/20 text-white focus:ring-2 focus:ring-pink-400 outline-none"
          />

          {error && <p className="text-red-400 mb-4">{error}</p>}

          <button
            type="submit"
            className="w-full p-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-md hover:shadow-lg"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
