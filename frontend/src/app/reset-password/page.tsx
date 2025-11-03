"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword, forgotPassword } from "@/lib/api";

function ResetPasswordContent() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingOTP, setIsResendingOTP] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [step, setStep] = useState<"email" | "reset">("email");
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
      setOtpSent(true);
      setStep("reset"); // Skip email step if email is in URL
    }
  }, [searchParams]);

  const handleSendOTP = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSendingOTP(true);
    setError("");
    
    try {
      await forgotPassword(email);
      setOtpSent(true);
      setStep("reset");
      setSuccess(false);
      setError(""); // Clear any previous errors
    } catch (err: any) {
      if (err.message) {
        setError(err.message);
      } else {
        setError("Failed to send OTP. Please try again.");
      }
    } finally {
      setIsSendingOTP(false);
    }
  };

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
      setError(""); // Clear any previous errors - show success message instead
    } catch (err: any) {
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
        onSubmit={(e) => {
          e.preventDefault();
          if (step === "reset") {
            handleSubmit(e);
          }
        }}
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
        ) : step === "email" ? (
          <>
            <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Enter your email address and we'll send you a 6-digit OTP to reset your password.
            </p>
            
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(""); // Clear error when user types
              }}
              required
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
              type="button"
              onClick={handleSendOTP}
              disabled={isSendingOTP || !email}
              className={`w-full p-3 rounded font-semibold shadow-lg transition-shadow ${
                isSendingOTP || !email
                  ? "bg-gray-500 cursor-not-allowed" 
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-xl"
              }`}
            >
              {isSendingOTP ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Sending OTP...
                </div>
              ) : (
                "Send OTP"
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
        ) : (
          <>
            {otpSent && (
              <div className={`p-4 rounded-lg mb-4 border-2 ${
                isDarkMode ? "bg-blue-500/30 border-blue-400/50" : "bg-blue-100 border-blue-400"
              }`}>
                <div className="flex items-start gap-2">
                  <span className="text-xl">✅</span>
                  <div>
                    <p className={`text-sm font-semibold mb-1 ${isDarkMode ? "text-blue-300" : "text-blue-800"}`}>
                      OTP Sent Successfully!
                    </p>
                    <p className={`text-xs ${isDarkMode ? "text-blue-400" : "text-blue-700"}`}>
                      A 6-digit OTP has been sent to <strong>{email}</strong>. 
                      <br />Please check your inbox (and spam folder) and enter the code below.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {!otpSent && (
              <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                Enter the 6-digit OTP sent to your email and your new password.
              </p>
            )}
            
            <div className="space-y-2">
              <div>
                <label className={`text-xs block mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  disabled={otpSent}
                  className={`w-full p-3 rounded focus:outline-none focus:ring-2 ${
                    isDarkMode 
                      ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60 disabled:opacity-50" 
                      : "bg-white/60 text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50 disabled:opacity-50"
                  }`}
                />
              </div>
              
              {!otpSent && (
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={isSendingOTP || !email}
                  className={`w-full p-2 rounded text-sm ${
                    isSendingOTP || !email
                      ? "bg-gray-500/50 cursor-not-allowed" 
                      : `bg-indigo-500/80 hover:bg-indigo-600/80 ${isDarkMode ? "text-white" : "text-white"}`
                  }`}
                >
                  {isSendingOTP ? "Sending..." : "Send OTP"}
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <label className={`text-sm font-semibold block mb-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                  Enter OTP Code (6 digits) 📱
                </label>
                <p className={`text-xs mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Check your email inbox for the 6-digit code sent to <strong>{email}</strong>
                </p>
                <input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  maxLength={6}
                  required
                  autoFocus
                  className={`w-full p-4 rounded-lg focus:outline-none focus:ring-2 text-center text-3xl tracking-[0.5em] font-mono font-bold border-2 ${
                    isDarkMode 
                      ? "bg-white/20 text-white placeholder:text-white/30 focus:ring-indigo-500 border-indigo-500/50" 
                      : "bg-white text-gray-800 placeholder:text-gray-300 focus:ring-indigo-500 border-indigo-400"
                  }`}
                  style={{ letterSpacing: '0.5em' }}
                />
              </div>
              {otpSent && (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isResendingOTP}
                    className={`text-sm ${isDarkMode 
                      ? "text-indigo-400 hover:text-indigo-300 disabled:opacity-50" 
                      : "text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                    }`}
                  >
                    {isResendingOTP ? "Sending..." : "Resend OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setError("");
                    }}
                    className={`text-sm ${isDarkMode 
                      ? "text-gray-400 hover:text-gray-300" 
                      : "text-gray-600 hover:text-gray-700"
                    }`}
                  >
                    Change Email
                  </button>
                </div>
              )}
            </div>
            
            <div>
              <label className={`text-xs block mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                New Password
              </label>
              <input
                type="password"
                placeholder="New Password (min. 8 characters)"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
                required
                minLength={8}
                className={`w-full p-3 rounded focus:outline-none focus:ring-2 ${
                  isDarkMode 
                    ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60" 
                    : "bg-white/60 text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50"
                }`}
              />
            </div>
            
            <div>
              <label className={`text-xs block mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                required
                minLength={8}
                className={`w-full p-3 rounded focus:outline-none focus:ring-2 ${
                  isDarkMode 
                    ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60" 
                    : "bg-white/60 text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50"
                }`}
              />
            </div>
            
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
