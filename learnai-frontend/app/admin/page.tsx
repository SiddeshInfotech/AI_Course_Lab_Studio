"use client";

import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Video,
  BookOpen,
  Settings,
  Upload,
  Search,
  Bell,
  LogOut,
  MoreHorizontal,
  TrendingUp,
  UserCheck,
  PlayCircle,
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Eye,
  X,
  FileVideo,
  ArrowUpRight,
  Filter,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

type Section = "overview" | "students" | "videos" | "courses" | "settings";

interface DashboardData {
  stats: {
    totalUsers: number;
    totalCourses: number;
    totalLessons: number;
    totalEnrollments: number;
  };
  recentUsers: Array<{
    id: number;
    name: string;
    username: string;
    email: string;
    created_at: string;
  }>;
  recentEnrollments: Array<{
    enrolledAt: string;
    user: { name: string; username: string; email: string };
    course: { title: string };
  }>;
}

interface DashboardStats {
  stats: {
    totalUsers: number;
    totalCourses: number;
    totalLessons: number;
    totalEnrollments: number;
  };
  recentUsers: Array<{
    id: number;
    name: string;
    username: string;
    email: string;
    created_at: string;
  }>;
  recentEnrollments: Array<{
    enrolledAt: string;
    user: { name: string; username: string; email: string };
    course: { title: string };
  }>;
}

interface UserData {
  id: number;
  name: string;
  username: string;
  email: string;
  isAdmin: boolean;
  created_at: string;
  _count?: { enrollments: number };
}

interface CourseData {
  id: number;
  title: string;
  description: string;
  category: string;
  level: string;
  instructor: string;
  duration: string;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-2xl font-black text-slate-900 leading-none mb-1">
          {value}
        </p>
        {sub && <p className="text-xs text-slate-500 font-medium">{sub}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600">
              {trend}
            </span>
          </div>
        )}
      </div>
      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-slate-500" />
      </div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const color =
    value >= 80
      ? "bg-emerald-500"
      : value >= 50
      ? "bg-indigo-500"
      : "bg-amber-400";
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-500 w-7 text-right">
        {value}%
      </span>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Completed: "bg-blue-50 text-blue-700 border-blue-100",
    Inactive: "bg-slate-50 text-slate-500 border-slate-200",
    Published: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Draft: "bg-amber-50 text-amber-700 border-amber-100",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
        map[status] ?? "bg-slate-50 text-slate-500 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

function Shield(
  props: React.SVGProps<SVGSVGElement> & { strokeWidth?: number },
) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={props.strokeWidth ?? 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [section, setSection] = useState<Section>("overview");
  const [search, setSearch] = useState("");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [users, setUsers] = useState<UserData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCourse, setUploadCourse] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, section]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.admin.dashboard();
      setDashboardData(data);
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.admin.users();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await api.admin.courses();
      setCourses(data);
    } catch (err) {
      console.error("Failed to load courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (section === "students" && users.length === 0) {
      loadUsers();
    }
    if (section === "courses" && courses.length === 0) {
      loadCourses();
    }
  }, [section]);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredCourses = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()),
  );

  const handleLogout = async () => {
    await logout();
  };

  const handleUpload = () => {
    if (!uploadFile || !uploadTitle || !uploadCourse) return;
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setUploadDone(true);
    }, 2000);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) setUploadFile(f);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "students", label: "Students", icon: Users },
    { id: "videos", label: "Videos", icon: Video },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  const avgProgress =
    dashboardData && dashboardData.stats.totalEnrollments > 0
      ? Math.round(
          (dashboardData.stats.totalLessons /
            (dashboardData.stats.totalEnrollments * 10)) *
            100,
        )
      : 0;

  return (
    <div className="h-screen flex bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
        {/* Logo area */}
        <div className="h-14 flex items-center px-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">
                Admin
              </p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                Control Panel
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setSection(id);
                setSearch("");
                setUploadDone(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                section === id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Admin info + logout */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.name || "Administrator"}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email || "admin@system"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0">
          <h1 className="text-sm font-bold text-slate-900 capitalize">
            {section === "overview"
              ? "Dashboard Overview"
              : section.charAt(0).toUpperCase() + section.slice(1)}
          </h1>
          <div className="flex-1" />
          {(section === "students" ||
            section === "videos" ||
            section === "courses") && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${section}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all w-52"
              />
            </div>
          )}
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <Bell className="w-4 h-4" />
          </button>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* ── OVERVIEW ── */}
          {section === "overview" && (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                  label="Total Students"
                  value={dashboardData?.stats.totalUsers?.toString() || "0"}
                  sub="Registered users"
                  icon={Users}
                  trend={
                    (dashboardData?.stats.totalUsers ?? 0) > 0
                      ? `+${dashboardData?.recentUsers.length ?? 0} new`
                      : undefined
                  }
                />
                <StatCard
                  label="Active Courses"
                  value={dashboardData?.stats.totalCourses?.toString() || "0"}
                  sub={`${dashboardData?.stats.totalLessons || 0} lessons`}
                  icon={BookOpen}
                />
                <StatCard
                  label="Total Videos"
                  value={dashboardData?.stats.totalLessons?.toString() || "0"}
                  sub={`${
                    dashboardData?.stats.totalEnrollments || 0
                  } enrollments`}
                  icon={PlayCircle}
                  trend={
                    (dashboardData?.stats.totalLessons ?? 0) > 0
                      ? "Active"
                      : undefined
                  }
                />
                <StatCard
                  label="Avg. Progress"
                  value={`${avgProgress}%`}
                  sub="Enrolled courses"
                  icon={TrendingUp}
                />
              </div>

              {/* Recent students + top videos */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Recent Students */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">
                      Recent Students
                    </h2>
                    <button
                      onClick={() => setSection("students")}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      View all
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {(dashboardData?.recentUsers?.length ?? 0) > 0 ? (
                      dashboardData?.recentUsers.map((u) => (
                        <div
                          key={u.id}
                          className="px-5 py-3 flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                            {u.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("") || u.username[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {u.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {u.email || u.username}
                            </p>
                          </div>
                          <Badge status="Active" />
                        </div>
                      ))
                    ) : (
                      <div className="px-5 py-8 text-center text-sm text-slate-400">
                        No students yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Course progress overview */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">
                      Recent Enrollments
                    </h2>
                    <button
                      onClick={() => setSection("courses")}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      View all
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {(dashboardData?.recentEnrollments?.length ?? 0) > 0 ? (
                      dashboardData?.recentEnrollments.map((e, i) => (
                        <div
                          key={i}
                          className="px-5 py-4 flex items-center gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {e.user.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              enrolled in {e.course.title}
                            </p>
                          </div>
                          <Badge status="Active" />
                        </div>
                      ))
                    ) : (
                      <div className="px-5 py-8 text-center text-sm text-slate-400">
                        No enrollments yet
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick alerts */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Welcome to Learn AI Admin
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Start by creating courses and adding lessons to get started.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── STUDENTS ── */}
          {section === "students" && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    All Students
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {filteredUsers.length} records
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    <Filter className="w-3.5 h-3.5" /> Filter
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-6 py-3">
                        Student
                      </th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">
                        Course
                      </th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">
                        Progress
                      </th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">
                        Status
                      </th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">
                        Joined
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                              {u.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("") || u.username[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800">
                                {u.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                ID: {u.username}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-slate-600">
                            Introduction to AI
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1 overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: "65%" }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-600">
                              65%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge status="Active" />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-slate-400">
                            {new Date(u.created_at).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            <button
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="View"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {u.id !== user?.id && (
                              <button
                                className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="py-16 text-center text-sm text-slate-400">
                    No students found.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── VIDEOS ── */}
          {section === "videos" && (
            <div className="space-y-5">
              {/* Upload Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-slate-500" />
                  Upload New Video
                </h2>

                {uploadDone ? (
                  <div className="flex flex-col items-center py-8 gap-3">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      Video uploaded successfully!
                    </p>
                    <button
                      onClick={() => {
                        setUploadDone(false);
                        setUploadFile(null);
                        setUploadTitle("");
                        setUploadCourse("");
                      }}
                      className="text-xs text-indigo-600 font-medium hover:underline"
                    >
                      Upload another
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                        dragOver
                          ? "border-indigo-400 bg-indigo-50"
                          : uploadFile
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) =>
                          setUploadFile(e.target.files?.[0] || null)
                        }
                      />
                      {uploadFile ? (
                        <>
                          <FileVideo className="w-8 h-8 text-emerald-500 mb-2" />
                          <p className="text-xs font-semibold text-emerald-700 text-center truncate max-w-full">
                            {uploadFile.name}
                          </p>
                          <p className="text-[10px] text-emerald-600 mt-1">
                            {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadFile(null);
                            }}
                            className="mt-2 flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" /> Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-300 mb-3" />
                          <p className="text-xs font-semibold text-slate-600">
                            Drop video here or click to browse
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            MP4, MOV, AVI — max 2 GB
                          </p>
                        </>
                      )}
                    </div>

                    {/* Meta fields */}
                    <div className="space-y-4 flex flex-col justify-center">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          Video Title
                        </label>
                        <input
                          type="text"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          placeholder="e.g. Introduction to Neural Networks"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all placeholder-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          Course
                        </label>
                        <div className="relative">
                          <select
                            value={uploadCourse}
                            onChange={(e) => setUploadCourse(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all appearance-none bg-white"
                          >
                            <option value="">Select a course...</option>
                            {courses.map((c) => (
                              <option key={c.id} value={c.title}>
                                {c.title}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                      <button
                        onClick={handleUpload}
                        disabled={
                          !uploadFile ||
                          !uploadTitle ||
                          !uploadCourse ||
                          uploading
                        }
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-2.5 rounded-lg transition-all"
                      >
                        {uploading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            Upload Video
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Video library table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900">
                    Video Library
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {dashboardData?.stats.totalLessons || 0} videos
                  </p>
                </div>
                <div className="px-6 py-8 text-center text-sm text-slate-400">
                  No videos uploaded yet. Upload your first video above.
                </div>
              </div>
            </div>
          )}

          {/* ── COURSES ── */}
          {section === "courses" && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    All Courses
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {filteredCourses.length} courses
                  </p>
                </div>
                <button className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors">
                  <Plus className="w-3.5 h-3.5" /> New Course
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((c) => (
                    <div
                      key={c.id}
                      className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {c.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {c.instructor} · {c.level} · {c.duration}
                        </p>
                      </div>
                      <Badge status="Published" />
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-sm text-slate-500">
                      No courses created yet
                    </p>
                    <button className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold mx-auto transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Create First Course
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {section === "settings" && (
            <div className="space-y-5 max-w-2xl">
              {/* Platform settings */}
              {[
                {
                  title: "Platform Information",
                  fields: [
                    { label: "Platform Name", value: "Learn AI", type: "text" },
                    {
                      label: "Support Email",
                      value: "support@learnai.com",
                      type: "email",
                    },
                  ],
                },
                {
                  title: "Admin Account",
                  fields: [
                    {
                      label: "Admin Name",
                      value: user?.name || "",
                      type: "text",
                    },
                    {
                      label: "Admin Email",
                      value: user?.email || "",
                      type: "email",
                    },
                    {
                      label: "Current Password",
                      value: "",
                      type: "password",
                      placeholder: "Enter new password...",
                    },
                  ],
                },
              ].map((group) => (
                <div
                  key={group.title}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900">
                      {group.title}
                    </h2>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    {group.fields.map((f) => (
                      <div key={f.label}>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          {f.label}
                        </label>
                        <input
                          type={f.type}
                          defaultValue={f.value}
                          placeholder={f.placeholder}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                        />
                      </div>
                    ))}
                    <div className="pt-2">
                      <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors">
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Danger zone */}
              <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-red-50">
                  <h2 className="text-sm font-bold text-red-600">
                    Danger Zone
                  </h2>
                </div>
                <div className="px-6 py-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Reset all student data
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      This action cannot be undone.
                    </p>
                  </div>
                  <button className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors">
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
