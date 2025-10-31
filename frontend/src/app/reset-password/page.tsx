"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/api";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem("theme");
      setIsDarkMode(savedTheme === "dark");
    };
    checkTheme();

    const tokenParam = searchParams.get("token");
    setToken(tokenParam);
    
    if (!tokenParam) {
      setError("Invalid or missing reset token. Please request a new password reset.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      
      setTimeout(() => {
        router.push("/signin");
      }, 3000);
    } catch (err: any) {
      console.error("Reset password error:", err);
      if (err.message) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
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
        onSubmit={handleSubmit}
        className="bg-white/10 backdrop-blur p-8 rounded-xl shadow-2xl shadow-purple-900/30 space-y-4 w-full max-w-md border border-white/10"
      >
        <h1 className={`text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
          isDarkMode 
            ? "from-white to-gray-300"
            : "from-gray-800 to-gray-600"
        }`}>
          Reset Password
        </h1>
        
        {success ? (
          <div className={`p-4 rounded-lg ${
            isDarkMode ? "bg-green-500/20 border border-green-500/30" : "bg-green-100 border border-green-300"
          }`}>
            <p className={`text-sm ${isDarkMode ? "text-green-400" : "text-green-700"}`}>
              Your password has been successfully reset! You will be redirected to the sign in page shortly.
            </p>
            <div className="mt-4">
              <Link 
                href="/signin"
                className={`text-sm underline ${isDarkMode ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-700"}`}
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Enter your new password below.
            </p>
            
            <input
              type="password"
              placeholder="New Password (min. 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className={`w-full p-3 rounded focus:outline-none focus:ring-2 ${
                isDarkMode 
                  ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60" 
                  : "bg-white/60 text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50"
              }`}
            />
            
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className={`w-full p-3 rounded focus:outline-none focus:ring-2 ${
                isDarkMode 
                  ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60" 
                  : "bg-white/60 text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50"
              }`}
            />
            
            {error && (
              <p className={`text-sm ${isDarkMode ? "text-red-400" : "text-red-600"}`}>{error}</p>
            )}
            
            <button
              type="submit"
              disabled={isLoading || !token}
              className={`w-full p-3 rounded font-semibold shadow-lg transition-shadow ${
                isLoading || !token
                  ? "bg-gray-500 cursor-not-allowed" 
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-xl"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Resetting Password...
                </div>
              ) : (
                "Reset Password"
              )}
            </button>
            
            <div className="text-center">
              <Link 
                href="/signin"
                className={`text-sm underline ${isDarkMode ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-700"}`}
              >
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

