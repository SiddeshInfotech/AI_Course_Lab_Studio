"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  PlayCircle,
  Cpu,
  LogOut,
  User,
  Flame,
  CheckCircle,
  Target,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getDashboardData } from "../../lib/api";

interface DashboardData {
  user: {
    id: number;
    name: string;
    email: string;
    created_at: string;
  };
  stats: {
    streak: number;
    modulesCompleted: number;
    modulesEnrolled: number;
    accuracy: number;
  };
  courses: Array<{
    id: number;
    title: string;
    description: string;
    imageUrl?: string;
    progress: {
      percentComplete: number;
      status: "not_started" | "in_progress" | "completed";
    };
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token =
          localStorage.getItem("accessToken") || localStorage.getItem("token");
        if (!token) {
          console.warn("No token found, redirecting to login");
          router.push("/");
          return;
        }

        console.log("Fetching dashboard data...");
        const data = await getDashboardData();
        console.log("Dashboard data received:", data);
        setDashboardData(data);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [router]);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      const token =
        localStorage.getItem("accessToken") || localStorage.getItem("token");

      if (token) {
        await fetch(
          `${
            process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api"
          }/auth/logout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ refreshToken: refreshToken || token }),
          },
        );
      }

      localStorage.removeItem("accessToken");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("sessionId");
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || "Failed to load dashboard"}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-4 py-2 bg-[#4F46E5] text-white rounded-lg"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const { user, stats } = dashboardData;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#0F172A]">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push("/dashboard")}
          >
            <div className="relative w-32 h-10">
              <Image
                src="/logo.svg"
                alt="सिध्देश Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Profile & Logout */}
          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-400 hover:text-[#4F46E5] hover:bg-indigo-50 rounded-full transition-all">
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in duration-700">
        {/* Top Section: Greeting & Stats */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-playfair">
              Welcome back, {user.name}
            </h1>
            <p className="text-slate-500 font-medium">
              Here&apos;s an overview of your learning progress.
            </p>
          </div>

          {/* Small Progress Stats */}
          <div className="flex flex-wrap items-center gap-4 lg:gap-6">
            {/* Streak */}
            <div className="bg-white rounded-xl px-5 py-4 border border-slate-100 shadow-sm flex items-center gap-4 min-w-[160px] hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-orange-400 to-[#F59E0B] shadow-inner group-hover:scale-110 transition-transform duration-300">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Streak
                </p>
                <p className="text-xl font-bold text-slate-900 leading-none">
                  {stats.streak} Days
                </p>
              </div>
            </div>

            {/* Modules */}
            <div className="bg-white rounded-xl px-5 py-4 border border-slate-100 shadow-sm flex items-center gap-4 min-w-[160px] hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-green-400 to-[#22C55E] shadow-inner group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Modules
                </p>
                <p className="text-xl font-bold text-slate-900 leading-none">
                  {stats.modulesCompleted}
                </p>
              </div>
            </div>

            {/* Accuracy */}
            <div className="bg-white rounded-xl px-5 py-4 border border-slate-100 shadow-sm flex items-center justify-center gap-4 min-w-[160px] hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-blue-400 to-cyan-500 shadow-inner group-hover:scale-110 transition-transform duration-300">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Accuracy
                </p>
                <p className="text-xl font-bold text-slate-900 leading-none">
                  {stats.accuracy}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Center: 3 Main Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Start Learning */}
          <div
            onClick={() => router.push("/learning")}
            className="group relative bg-white rounded-[1.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:scale-[1.03] hover:border-indigo-500/30 transition-all duration-300 cursor-pointer flex flex-col h-full overflow-hidden"
          >
            {/* Gradient Glow Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-500"></div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="w-14 h-14 bg-gradient-to-br from-[#4F46E5] to-purple-600 rounded-full flex items-center justify-center text-white mb-6 shadow-md group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Start Learning
              </h3>
              <p className="text-sm text-slate-500 flex-grow leading-relaxed mb-8">
                Begin a new module and explore fresh topics in your personalized
                curriculum.
              </p>
              <div className="mt-auto">
                <button className="inline-flex items-center justify-center gap-2 w-full bg-slate-50 text-[#4F46E5] border border-[#4F46E5]/30 font-semibold rounded-xl px-4 py-3 group-hover:bg-[#4F46E5] group-hover:text-white transition-colors duration-300">
                  Start <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Resume Learning */}
          <div
            onClick={() => router.push("/learning")}
            className="group relative bg-white rounded-[1.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.03] hover:border-blue-500/30 transition-all duration-300 cursor-pointer flex flex-col h-full overflow-hidden"
          >
            {/* Gradient Glow Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/5 group-hover:to-cyan-500/5 transition-all duration-500"></div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white mb-6 shadow-md group-hover:scale-110 transition-transform duration-300">
                <PlayCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Resume Learning
              </h3>
              <p className="text-sm text-slate-500 flex-grow leading-relaxed mb-8">
                Pick up exactly where you left off in{" "}
                <span className="font-semibold text-slate-700">
                  &quot;Advanced Neural Networks&quot;
                </span>
                .
              </p>
              <div className="mt-auto">
                <button className="inline-flex items-center justify-center gap-2 w-full bg-slate-50 text-blue-600 border border-blue-600/30 font-semibold rounded-xl px-4 py-3 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* AI Dashboard */}
          <div
            onClick={() => router.push("/dashboard")}
            className="group relative bg-white rounded-[1.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:scale-[1.03] hover:border-emerald-500/30 transition-all duration-300 cursor-pointer flex flex-col h-full overflow-hidden"
          >
            {/* Gradient Glow Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-green-500/0 group-hover:from-emerald-500/5 group-hover:to-green-500/5 transition-all duration-500"></div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="w-14 h-14 bg-gradient-to-br from-[#22C55E] to-emerald-600 rounded-full flex items-center justify-center text-white mb-6 shadow-md group-hover:scale-110 transition-transform duration-300">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                AI Dashboard
              </h3>
              <p className="text-sm text-slate-500 flex-grow leading-relaxed mb-8">
                View your AI-generated insights, performance analytics, and
                personalized recommendations.
              </p>
              <div className="mt-auto">
                <button className="inline-flex items-center justify-center gap-2 w-full bg-slate-50 text-[#22C55E] border border-[#22C55E]/30 font-semibold rounded-xl px-4 py-3 group-hover:bg-[#22C55E] group-hover:text-white transition-colors duration-300">
                  Open Dashboard <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
