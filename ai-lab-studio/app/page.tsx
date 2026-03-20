"use client";

import { useState } from "react";
import { EyeOff, Eye, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loginUser } from "../lib/api";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      alert("Please enter your email address first.");
      return;
    }
    alert(`Password reset link would be sent to ${email}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const auth = await loginUser({ email, password });
      const accessToken = auth.accessToken || auth.token;

      if (accessToken) {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("token", accessToken);
      }

      if (auth.refreshToken) {
        localStorage.setItem("refreshToken", auth.refreshToken);
      }

      if (auth.sessionId) {
        localStorage.setItem("sessionId", auth.sessionId);
      }

      router.push("/welcome");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative font-sans">
      {/* Main Card */}
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-200">
        {/* Header with New Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex flex-col items-center text-center">
            {/* Logo Image */}
            <div className="relative w-48 h-20 mb-2">
              <Image
                src="/logo.svg"
                alt="सिध्देश Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <p className="text-slate-500 text-sm font-medium mt-6">
              Continue your journey into the world of AI
            </p>
          </div>
        </div>

        {/* Form */}
        <form className="space-y-6" onSubmit={handleLogin}>
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-[11px] font-bold text-slate-500 tracking-wider uppercase"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all disabled:opacity-50"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-[11px] font-bold text-slate-500 tracking-wider uppercase"
              >
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isLoading}
                className="text-[11px] font-bold text-[#4F46E5] hover:text-indigo-600 transition-colors disabled:opacity-50"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all pr-12 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                {showPassword ? (
                  <Eye className="w-5 h-5" />
                ) : (
                  <EyeOff className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#4F46E5] hover:bg-indigo-600 disabled:bg-slate-400 text-white font-semibold rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing In..." : "Sign In"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
