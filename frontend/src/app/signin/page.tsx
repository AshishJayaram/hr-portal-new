"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toCanonicalRole } from "@/lib/api";

export default function SignInPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode to prevent white flash
  const router = useRouter();

  useEffect(() => {
    // Check system theme preference
    const checkTheme = () => {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark");
      } else {
        setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
      }
    };

    checkTheme();
    
    // Listen for theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkTheme);
    
    return () => mediaQuery.removeEventListener("change", checkTheme);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, organization_id: "3" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Login failed");

      // Backend returns: { user: user, token: token, message: "Login successful" }
      const token = data?.token;
      const backendUser = data?.user;
      const role = toCanonicalRole(backendUser?.role);
      const user = {
        id: backendUser?.id?.toString() || "",
        email: backendUser?.email || username,
        name: backendUser?.name || username,
        role,
        designation: backendUser?.designation,
        department: backendUser?.department,
        ctc: backendUser?.ctc,
        organizationId: backendUser?.organization_id?.toString(),
        createdAt: backendUser?.created_at || new Date().toISOString(),
        updatedAt: backendUser?.updated_at || new Date().toISOString(),
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
    <div className={`min-h-screen w-full flex items-center justify-center ${
      isDarkMode 
        ? "bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950" 
        : "bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50"
    }`}>
      <form
        onSubmit={handleLogin}
        className="bg-white/10 backdrop-blur p-8 rounded-xl shadow-2xl shadow-purple-900/30 space-y-4 w-full max-w-md border border-white/10"
      >
        <h1 className={`text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
          isDarkMode 
            ? "from-white to-gray-300"
            : "from-gray-800 to-gray-600"
        }`}>
          Sign in to HR Portal
        </h1>
        <input
          type="string"
          placeholder="Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={`w-full p-3 rounded focus:outline-none focus:ring-2 ${
            isDarkMode 
              ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60" 
              : "bg-white/60 text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50"
          }`}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`w-full p-3 rounded focus:outline-none focus:ring-2 ${
            isDarkMode 
              ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60" 
              : "bg-white/60 text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50"
          }`}
        />
        {error && <p className={`${isDarkMode ? "text-red-400" : "text-red-600"}`}>{error}</p>}
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
