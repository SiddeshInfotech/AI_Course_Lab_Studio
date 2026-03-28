"use client";

import { useState } from "react";
import { EyeOff, Eye, ArrowRight, User, Lock, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

const CENTER_SESSION_KEY = "centerSession";
const CENTER_AUTH_STORAGE_KEY = "centerAuth";
const CENTER_TOKEN_KEY = "centerToken";
const CENTER_REFRESH_TOKEN_KEY = "centerRefreshToken";
const CENTER_LIST_STORAGE_KEY = "adminCenters";

const CENTER_ID = "center";
const CENTER_PASSWORD = "center123";

interface CenterLoginRecord {
  id: string;
  centerName: string;
  schoolName: string;
  centerCode: string;
  centerAdminId: string;
  centerAdminPassword: string;
  status: "Active" | "Inactive";
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const normalizedUsername = username.trim().toLowerCase();

    try {
      // Try center login via API first.
      const centerResponse = await api.center.login(username, password);

      if (centerResponse.accessToken) {
        localStorage.setItem(CENTER_SESSION_KEY, "true");
        localStorage.setItem(CENTER_TOKEN_KEY, centerResponse.accessToken);
        localStorage.setItem(
          CENTER_REFRESH_TOKEN_KEY,
          centerResponse.refreshToken,
        );
        localStorage.setItem(
          CENTER_AUTH_STORAGE_KEY,
          JSON.stringify(centerResponse.center),
        );

        router.push("/center");
        return;
      }
    } catch (centerError) {
      // Fallback to local center credentials when API auth isn't available.
      const status =
        typeof centerError === "object" &&
        centerError !== null &&
        "status" in centerError
          ? (centerError as { status?: number }).status
          : undefined;
      if (status !== 401 && status !== 400) {
        console.error("Center login error:", centerError);
      }
    }

    try {
      const rawCenters = localStorage.getItem(CENTER_LIST_STORAGE_KEY);
      if (rawCenters) {
        const parsedCenters = JSON.parse(rawCenters) as unknown;
        const centerList = Array.isArray(parsedCenters)
          ? (parsedCenters as Array<Partial<CenterLoginRecord> | null>)
          : [];

        const matchedCenter = centerList.find(
          (center) =>
            typeof center?.centerAdminId === "string" &&
            typeof center?.centerAdminPassword === "string" &&
            center.centerAdminId.trim().toLowerCase() === normalizedUsername &&
            center.centerAdminPassword === password &&
            center.status === "Active",
        );

        if (matchedCenter) {
          localStorage.setItem(CENTER_SESSION_KEY, "true");
          localStorage.setItem(
            CENTER_AUTH_STORAGE_KEY,
            JSON.stringify({
              centerId: matchedCenter.id ?? "legacy-center",
              centerCode: matchedCenter.centerCode ?? "CENTER",
              centerName: matchedCenter.centerName ?? "LearnAI Center",
              schoolName: matchedCenter.schoolName ?? "Sunrise Public School",
              adminId: matchedCenter.centerAdminId,
            }),
          );
          router.push("/center");
          return;
        }
      }
    } catch (err) {
      console.error("Center login lookup failed:", err);
    }

    if (normalizedUsername === CENTER_ID && password === CENTER_PASSWORD) {
      localStorage.setItem(CENTER_SESSION_KEY, "true");
      localStorage.setItem(
        CENTER_AUTH_STORAGE_KEY,
        JSON.stringify({
          centerId: "legacy-center",
          centerCode: "CENTER",
          centerName: "LearnAI Center",
          schoolName: "Sunrise Public School",
          adminId: CENTER_ID,
        }),
      );
      router.push("/center");
      return;
    }

    const result = await login(username, password);

    if (result.success) {
      if (result.isAdmin) {
        router.push("/admin");
      } else {
        router.push("/welcome");
      }
      return;
    }

    setError(result.error || "Invalid credentials");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-indigo-50 flex items-center justify-center p-4 relative font-sans">
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-br from-cyan-200 via-indigo-100 to-slate-100 p-[1px] shadow-2xl shadow-cyan-500/10">
        <div className="bg-white w-full h-full rounded-[23px] p-8 md:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="flex flex-col items-center text-center">
              <div className="relative w-48 h-20 sm:w-64 sm:h-28 md:w-80 md:h-32 mb-4 lg:mb-6">
                <Image
                  src="/logo.png"
                  alt="Learn AI Logo"
                  fill
                  sizes="(max-width: 640px) 192px, (max-width: 768px) 256px, 320px"
                  className="object-contain"
                />
              </div>
              <p className="text-slate-500 text-sm font-medium mt-2">
                Continue your journey into the world of AI
              </p>
            </div>
          </div>

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
          </form>
        </div>
      </div>
    </div>
  );
}
