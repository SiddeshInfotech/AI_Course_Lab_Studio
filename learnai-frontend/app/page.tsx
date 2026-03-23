"use client";

import { useState } from "react";
import {
  EyeOff,
  Eye,
  ArrowRight,
  User,
  Lock,
  Shield,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [showAdmin, setShowAdmin] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(username, password);

    if (result.success) {
      if (result.isAdmin) {
        router.push("/admin");
      } else {
        router.push("/welcome");
      }
    } else {
      setError(result.error || "Login failed");
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);

    const result = await login(adminId, adminPassword);

    if (result.success) {
      if (result.isAdmin) {
        router.push("/admin");
      } else {
        setAdminError("Admin access required");
        setAdminLoading(false);
      }
    } else {
      setAdminError(result.error || "Invalid admin credentials");
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 relative font-sans">
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-br from-indigo-200 via-purple-100 to-indigo-50 p-[1px] shadow-2xl shadow-indigo-500/10">
        <div className="bg-white w-full h-full rounded-[23px] p-8 md:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex flex-col items-center text-center">
              <div className="relative w-48 h-20 sm:w-64 sm:h-28 md:w-80 md:h-32 mb-4 lg:mb-6">
                <Image
                  src="/logo.png?v=2"
                  alt="Learn AI Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-slate-500 text-sm font-medium mt-2">
                Continue your journey into the world of AI
              </p>
            </div>
          </div>

          {!showAdmin ? (
            /* ── Student login ── */
            <form className="space-y-5" onSubmit={handleLogin}>
              {error && (
                <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase ml-1">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-sm"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase ml-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-12 py-3.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#4F46E5] hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl px-4 py-4 flex items-center justify-center gap-2 transition-all hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98] disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>

              {/* Admin login toggle */}
              <div className="border-t border-slate-100 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdmin(true);
                    setAdminError("");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin Login
                </button>
              </div>
            </form>
          ) : (
            /* ── Admin login ── */
            <form className="space-y-5" onSubmit={handleAdminLogin}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-none">
                    Admin Login
                  </p>
                  <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                    Restricted access
                  </p>
                </div>
              </div>

              {adminError && (
                <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium">{adminError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase ml-1">
                  Admin Username
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={adminId}
                    onChange={(e) => {
                      setAdminId(e.target.value);
                      setAdminError("");
                    }}
                    required
                    placeholder="admin"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 transition-all shadow-sm placeholder-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase ml-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showAdminPw ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setAdminError("");
                    }}
                    required
                    placeholder="Enter admin password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-12 py-3.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 transition-all shadow-sm placeholder-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPw(!showAdminPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showAdminPw ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white font-semibold rounded-xl px-4 py-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:cursor-not-allowed"
                >
                  {adminLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In as Admin <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdmin(false);
                    setAdminId("");
                    setAdminPassword("");
                    setAdminError("");
                  }}
                  className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors py-1"
                >
                  ← Back to Student Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
