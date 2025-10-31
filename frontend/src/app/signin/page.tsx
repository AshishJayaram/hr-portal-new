"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toCanonicalRole, sendOTP, verifyOTP } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function SignInPage() {
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem("theme");
      setIsDarkMode(savedTheme === "dark");
    };
    checkTheme();
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

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

      localStorage.setItem("user", JSON.stringify({ ...user, role }));
      if (token) localStorage.setItem("token", token);
      if (user.organizationId) localStorage.setItem("organizationId", user.organizationId);

      router.push("/");
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.message) {
        setError(err.message);
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError("Unable to connect to server. Please check if the backend is running.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await sendOTP(email);
      setOtpSent(true);
      setSuccess("OTP sent to your email. Please check your inbox.");
    } catch (err: any) {
      console.error("Send OTP error:", err);
      if (err.message) {
        setError(err.message);
      } else {
        setError("Failed to send OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await verifyOTP(email, otp);
      // Handle both wrapped and unwrapped responses
      const loginData = response?.data || response;
      const token = loginData?.token;
      const backendUser = loginData?.user;
      
      if (!token || !backendUser) {
        throw new Error("Invalid response from server");
      }

      const role = toCanonicalRole(backendUser?.role);
      const user = {
        id: backendUser?.id?.toString() || "",
        email: backendUser?.email || email,
        name: backendUser?.name || email,
        role,
        designation: backendUser?.designation,
        department: backendUser?.department,
        ctc: backendUser?.ctc,
        organizationId: backendUser?.organization_id?.toString(),
        createdAt: backendUser?.created_at || new Date().toISOString(),
        updatedAt: backendUser?.updated_at || new Date().toISOString(),
      };

      localStorage.setItem("user", JSON.stringify({ ...user, role }));
      if (token) localStorage.setItem("token", token);
      if (user.organizationId) localStorage.setItem("organizationId", user.organizationId);

      router.push("/");
    } catch (err: any) {
      console.error("OTP verification error:", err);
      if (err.message) {
        setError(err.message);
      } else {
        setError("Invalid or expired OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center ${
      isDarkMode 
        ? "bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950" 
        : "bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50"
    }`}>
      <form
        onSubmit={loginMode === "password" ? handlePasswordLogin : (otpSent ? handleOTPLogin : handleSendOTP)}
        className="bg-white/10 backdrop-blur p-8 rounded-xl shadow-2xl shadow-purple-900/30 space-y-4 w-full max-w-md border border-white/10"
      >
        <h1 className={`text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
          isDarkMode 
            ? "from-white to-gray-300"
            : "from-gray-800 to-gray-600"
        }`}>
          Sign in to HR Portal
        </h1>

        {/* Login Mode Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setLoginMode("password");
              setOtpSent(false);
              setError("");
              setSuccess("");
            }}
            className={`flex-1 p-2 rounded text-sm font-medium transition-colors ${
              loginMode === "password"
                ? "bg-indigo-500 text-white"
                : isDarkMode
                ? "bg-white/10 text-white/70 hover:bg-white/20"
                : "bg-white/40 text-gray-700 hover:bg-white/50"
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode("otp");
              setOtpSent(false);
              setError("");
              setSuccess("");
            }}
            className={`flex-1 p-2 rounded text-sm font-medium transition-colors ${
              loginMode === "otp"
                ? "bg-indigo-500 text-white"
                : isDarkMode
                ? "bg-white/10 text-white/70 hover:bg-white/20"
                : "bg-white/40 text-gray-700 hover:bg-white/50"
            }`}
          >
            OTP Login
          </button>
        </div>

        {loginMode === "password" ? (
          <>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full p-3 rounded focus:outline-none focus:ring-2 ${
                isDarkMode 
                  ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60" 
                  : "bg-white/60 text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50"
              }`}
              required
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
              required
            />
          </>
        ) : (
          <>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full p-3 rounded focus:outline-none focus:ring-2 ${
                isDarkMode 
                  ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60" 
                  : "bg-white/60 text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50"
              }`}
              required
              disabled={otpSent}
            />
            {otpSent && (
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className={`w-full p-3 rounded focus:outline-none focus:ring-2 ${
                  isDarkMode 
                    ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60" 
                    : "bg-white/60 text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50"
                }`}
                required
              />
            )}
          </>
        )}

        {error && <p className={`text-sm ${isDarkMode ? "text-red-400" : "text-red-600"}`}>{error}</p>}
        {success && <p className={`text-sm ${isDarkMode ? "text-green-400" : "text-green-600"}`}>{success}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full p-3 rounded font-semibold shadow-lg transition-shadow ${
            isLoading 
              ? "bg-gray-500 cursor-not-allowed" 
              : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-xl"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              {loginMode === "password" ? "Signing In..." : (otpSent ? "Verifying..." : "Sending OTP...")}
            </div>
          ) : (
            loginMode === "password" ? "Sign In" : (otpSent ? "Verify OTP" : "Send OTP")
          )}
        </button>

        {loginMode === "password" && (
          <div className="text-center">
            <Link 
              href="/forgot-password"
              className={`text-sm underline ${isDarkMode ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-700"}`}
            >
              Forgot Password?
            </Link>
          </div>
        )}

        {loginMode === "otp" && otpSent && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setError("");
                setSuccess("");
              }}
              className={`text-sm underline ${isDarkMode ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-700"}`}
            >
              Resend OTP
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
