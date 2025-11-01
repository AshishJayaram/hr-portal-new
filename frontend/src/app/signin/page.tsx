"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toCanonicalRole, sendOTP, verifyOTP, forgotPassword, resetPassword } from "@/lib/api";

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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordOTP, setForgotPasswordOTP] = useState("");
  const [forgotPasswordOTPSent, setForgotPasswordOTPSent] = useState(false);
  const [showPasswordResetForm, setShowPasswordResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setForgotPasswordLoading(true);

    try {
      await forgotPassword(forgotPasswordEmail);
      setSuccess("If an account with that email exists, a password reset OTP has been sent to your email address.");
      setForgotPasswordOTPSent(true);
      setShowPasswordResetForm(true);
      setForgotPasswordOTP("");
    } catch (err: any) {
      console.error("Forgot password error:", err);
      if (err.message) {
        setError(err.message);
      } else {
        setError("Failed to send password reset OTP. Please try again.");
      }
    } finally {
      setForgotPasswordLoading(false);
    }
  };


  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Validate password length
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setResetPasswordLoading(true);

    try {
      await resetPassword(forgotPasswordEmail, forgotPasswordOTP, newPassword);
      setSuccess("Password reset successfully! Redirecting to login...");
      // Reset all states
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordEmail("");
        setForgotPasswordOTP("");
        setForgotPasswordOTPSent(false);
        setShowPasswordResetForm(false);
        setNewPassword("");
        setConfirmPassword("");
        setError("");
        setSuccess("");
        router.push("/signin");
      }, 2000);
    } catch (err: any) {
      console.error("Reset password error:", err);
      if (err.message) {
        setError(err.message);
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } finally {
      setResetPasswordLoading(false);
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

        {loginMode === "password" && !showForgotPassword && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setError("");
                setSuccess("");
                setForgotPasswordEmail("");
              }}
              className={`text-sm underline ${isDarkMode ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-700"}`}
            >
              Forgot Password?
            </button>
          </div>
        )}

        {showForgotPassword && (
          <div className={`p-4 rounded-lg border ${isDarkMode ? "bg-white/10 border-white/20" : "bg-indigo-50 border-indigo-200"}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                Reset Password
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail("");
                  setForgotPasswordOTP("");
                  setForgotPasswordOTPSent(false);
                  setShowPasswordResetForm(false);
                  setNewPassword("");
                  setConfirmPassword("");
                  setError("");
                  setSuccess("");
                }}
                className={`text-lg ${isDarkMode ? "text-white/70 hover:text-white" : "text-gray-600 hover:text-gray-800"}`}
              >
                ×
              </button>
            </div>

            {!forgotPasswordOTPSent && !showPasswordResetForm ? (
              <>
                <p className={`text-xs mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Enter your email address and we'll send you an OTP to reset your password.
                </p>
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                    className={`w-full p-2 rounded text-sm focus:outline-none focus:ring-2 ${
                      isDarkMode 
                        ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60" 
                        : "bg-white text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className={`w-full p-2 rounded text-sm font-medium shadow transition-shadow ${
                      forgotPasswordLoading 
                        ? "bg-gray-500 cursor-not-allowed" 
                        : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg"
                    }`}
                  >
                    {forgotPasswordLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </div>
                    ) : (
                      "Send Reset OTP"
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className={`text-xs mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Enter the OTP sent to your email and your new password below.
                </p>
                <form onSubmit={handleResetPassword} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={forgotPasswordOTP}
                    onChange={(e) => setForgotPasswordOTP(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    required
                    className={`w-full p-2 rounded text-sm focus:outline-none focus:ring-2 ${
                      isDarkMode 
                        ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60" 
                        : "bg-white text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50"
                    }`}
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className={`w-full p-2 rounded text-sm focus:outline-none focus:ring-2 ${
                      isDarkMode 
                        ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60" 
                        : "bg-white text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50"
                    }`}
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className={`w-full p-2 rounded text-sm focus:outline-none focus:ring-2 ${
                      isDarkMode 
                        ? "bg-white/20 text-white placeholder:text-white/60 focus:ring-indigo-500/60" 
                        : "bg-white text-gray-800 placeholder:text-gray-500 focus:ring-indigo-500/40 border border-gray-300/50"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={resetPasswordLoading}
                    className={`w-full p-2 rounded text-sm font-medium shadow transition-shadow ${
                      resetPasswordLoading 
                        ? "bg-gray-500 cursor-not-allowed" 
                        : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg"
                    }`}
                  >
                    {resetPasswordLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Resetting...
                      </div>
                    ) : (
                      "Reset Password"
                    )}
                  </button>
                </form>
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordOTPSent(false);
                      setForgotPasswordOTP("");
                      setShowPasswordResetForm(false);
                      setSuccess("");
                    }}
                    className={`text-xs underline ${isDarkMode ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-700"}`}
                  >
                    Resend OTP
                  </button>
                </div>
              </>
            )}

            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail("");
                  setForgotPasswordOTP("");
                  setForgotPasswordOTPSent(false);
                  setShowPasswordResetForm(false);
                  setNewPassword("");
                  setConfirmPassword("");
                  setError("");
                  setSuccess("");
                }}
                className={`text-xs underline ${isDarkMode ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-700"}`}
              >
                Back to Sign In
              </button>
            </div>
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
