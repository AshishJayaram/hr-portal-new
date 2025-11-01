"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword, forgotPassword } from "@/lib/api";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingOTP, setIsResendingOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem("theme");
      setIsDarkMode(savedTheme === "dark");
    };
    checkTheme();

    // Get email from URL query parameter if available
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      setOtpSent(true); // Assume OTP was already sent
    }
  }, [searchParams]);

  const handleResendOTP = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setIsResendingOTP(true);
    setError("");
    
    try {
      await forgotPassword(email);
      setOtpSent(true);
      setSuccess(false);
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      if (err.message) {
        setError(err.message);
      } else {
        setError("Failed to resend OTP. Please try again.");
      }
    } finally {
      setIsResendingOTP(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Email is required");
      return;
    }

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(email, otp, newPassword);
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
              Enter your email, the OTP sent to your email, and your new password.
            </p>
            
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={otpSent && email !== ""}
              className={`w-full p-3 rounded focus:outline-none focus:ring-2 ${
                isDarkMode 
                  ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60 disabled:opacity-50" 
                  : "bg-white/60 text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50 disabled:opacity-50"
              }`}
            />

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                required
                className={`w-full p-3 rounded focus:outline-none focus:ring-2 ${
                  isDarkMode 
                    ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60" 
                    : "bg-white/60 text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50"
                }`}
              />
              {otpSent && (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isResendingOTP}
                  className={`w-full text-sm underline ${
                    isDarkMode 
                      ? "text-indigo-400 hover:text-indigo-300 disabled:opacity-50" 
                      : "text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                  }`}
                >
                  {isResendingOTP ? "Sending..." : "Resend OTP"}
                </button>
              )}
            </div>
            
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
