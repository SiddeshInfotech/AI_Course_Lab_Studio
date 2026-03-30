"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  BookOpen,
  TrendingUp,
  Clock,
  LogOut,
  Search,
  ChevronRight,
  Award,
  Activity,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const CENTER_SESSION_KEY = "centerSession";
const CENTER_AUTH_KEY = "centerAuth";
const CENTER_TOKEN_KEY = "centerToken";
const CENTER_REFRESH_TOKEN_KEY = "centerRefreshToken";

interface CenterInfo {
  id: number;
  centerName: string;
  schoolName: string;
  centerCode: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  status: string;
  totalStudents?: number;
}

interface DashboardStats {
  totalStudents: number;
  enrolledCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalLearningHours: number;
  averageProgress: number;
  activeToday: number;
}

interface Student {
  id: number;
  name: string;
  username: string;
  email: string | null;
  rollNumber: string | null;
  createdAt: string;
  enrolledCourses: Array<{ id: number; title: string; enrolledAt: string }>;
  totalCourses: number;
  completedCourses: number;
  avgProgress: number;
  lastActivity: string | null;
  dailyUsageLast7Days: number;
}

interface Course {
  id: number;
  title: string;
  category: string;
  level: string;
  instructor: string;
  duration: string;
  totalLessons: number;
  enrolledStudents: number;
  completedStudents: number;
  inProgressStudents: number;
  completionRate: number;
}

interface Activity {
  type: "lesson_complete" | "course_complete";
  userId: number;
  userName: string;
  timestamp: string;
  data: Record<string, unknown>;
}

type TabType = "overview" | "students" | "courses" | "activity";

export default function CenterDashboardPage() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [center, setCenter] = useState<CenterInfo | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Check authentication
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasSession = localStorage.getItem(CENTER_SESSION_KEY) === "true";
    const token = localStorage.getItem(CENTER_TOKEN_KEY);
    
    if (!hasSession || !token) {
      router.replace("/");
      return;
    }

    const storedCenter = localStorage.getItem(CENTER_AUTH_KEY);
    if (storedCenter) {
      try {
        setCenter(JSON.parse(storedCenter));
      } catch {
        router.replace("/");
        return;
      }
    }

    setIsReady(true);
  }, [router]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    const token = localStorage.getItem(CENTER_TOKEN_KEY);
    if (!token) return;

    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch stats
      const statsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api"}/center/dashboard/stats`,
        { headers }
      );
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }

      // Fetch students
      const studentsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api"}/center/students?page=1&limit=20`,
        { headers }
      );
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData.students);
        setPagination({
          page: studentsData.pagination.page,
          totalPages: studentsData.pagination.totalPages,
          total: studentsData.pagination.total,
        });
      }

      // Fetch courses
      const coursesRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api"}/center/courses`,
        { headers }
      );
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData.courses);
      }

      // Fetch activities
      const activityRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api"}/center/activity?limit=20`,
        { headers }
      );
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivities(activityData.activities);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch students with search
  const fetchStudents = useCallback(async (page = 1, searchTerm = "") => {
    const token = localStorage.getItem(CENTER_TOKEN_KEY);
    if (!token) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api"}/center/students?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        setStudents(data.students);
        setPagination({
          page: data.pagination.page,
          totalPages: data.pagination.totalPages,
          total: data.pagination.total,
        });
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isReady) {
      fetchDashboardData();
    }
  }, [isReady, fetchDashboardData]);

  // Handle logout
  const handleLogout = async () => {
    const refreshToken = localStorage.getItem(CENTER_REFRESH_TOKEN_KEY);
    const token = localStorage.getItem(CENTER_TOKEN_KEY);

    try {
      // Call logout API
      if (refreshToken) {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api"}/center/logout`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          }
        );
      }
    } catch (err) {
      console.error("Logout error:", err);
    }

    // Clear local storage
    localStorage.removeItem(CENTER_SESSION_KEY);
    localStorage.removeItem(CENTER_AUTH_KEY);
    localStorage.removeItem(CENTER_TOKEN_KEY);
    localStorage.removeItem(CENTER_REFRESH_TOKEN_KEY);

    router.push("/");
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents(1, search);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="relative w-28 h-7">
                <Image src="/logo.png" alt="Logo" fill className="object-contain" />
              </div>
              <div className="h-6 w-px bg-slate-200 hidden md:block" />
              <div>
                <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">
                  Center Dashboard
                </p>
                <h1 className="text-sm font-semibold text-slate-800 leading-tight">
                  {center?.centerName || "Center"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 hidden sm:block">
                {center?.schoolName}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {[
              { id: "overview", label: "Overview", icon: TrendingUp },
              { id: "students", label: "Students", icon: Users },
              { id: "courses", label: "Courses", icon: BookOpen },
              { id: "activity", label: "Activity", icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Users}
                label="Total Students"
                value={stats?.totalStudents || 0}
                color="blue"
              />
              <StatCard
                icon={BookOpen}
                label="Enrolled Courses"
                value={stats?.enrolledCourses || 0}
                color="purple"
              />
              <StatCard
                icon={Award}
                label="Completed"
                value={stats?.completedCourses || 0}
                color="green"
              />
              <StatCard
                icon={Clock}
                label="Learning Hours"
                value={stats?.totalLearningHours || 0}
                color="amber"
                suffix="hrs"
              />
            </div>

            {/* Progress Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Average Progress */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                  Average Progress
                </h3>
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="12"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="12"
                        strokeDasharray={`${(stats?.averageProgress || 0) * 3.52} 352`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-slate-900">
                        {stats?.averageProgress || 0}%
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-slate-500 mt-4">
                  {stats?.inProgressCourses || 0} courses in progress
                </p>
              </div>

              {/* Active Today */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                  Active Today
                </h3>
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 mb-4">
                    <span className="text-4xl font-bold text-indigo-600">
                      {stats?.activeToday || 0}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    students active in last 7 days
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Recent Activity
                </h3>
                <button
                  onClick={() => setActiveTab("activity")}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  View All
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {activities.slice(0, 5).map((activity, i) => (
                  <div key={i} className="px-6 py-3 flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      activity.type === "course_complete" ? "bg-green-100" : "bg-indigo-100"
                    }`}>
                      {activity.type === "course_complete" ? (
                        <Award className="w-4 h-4 text-green-600" />
                      ) : (
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 truncate">
                        <span className="font-medium">{activity.userName}</span>
                        {" "}
                        {activity.type === "course_complete" ? "completed" : "completed lesson in"}{" "}
                        <span className="font-medium">
                          {activity.type === "course_complete"
                            ? String(activity.data.courseTitle || "a course")
                            : String(activity.data.courseId || "a course")}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="px-6 py-8 text-center text-sm text-slate-500">
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === "students" && (
          <div className="space-y-6">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search students by name, email, or roll number..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  fetchStudents(1, "");
                }}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Clear
              </button>
            </form>

            {/* Students Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Enrolled Courses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Last Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Learning (7d)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {student.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {student.email || student.username}
                              {student.rollNumber && ` • ${student.rollNumber}`}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-900">
                            {student.totalCourses} courses
                          </p>
                          <p className="text-xs text-slate-500">
                            {student.completedCourses} completed
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full transition-all"
                                style={{ width: `${student.avgProgress}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600">
                              {student.avgProgress}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {student.lastActivity
                            ? formatRelativeTime(student.lastActivity)
                            : "No activity"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {Math.round(student.dailyUsageLast7Days / 3600 * 10) / 10}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Showing {((pagination.page - 1) * 20) + 1} to{" "}
                    {Math.min(pagination.page * 20, pagination.total)} of{" "}
                    {pagination.total} students
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchStudents(pagination.page - 1, search)}
                      disabled={pagination.page === 1}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => fetchStudents(pagination.page + 1, search)}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {students.length === 0 && !isLoading && (
                <div className="px-6 py-12 text-center">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No students found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === "courses" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">
                        {course.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {course.category} • {course.level}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {course.completionRate}% completion
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Enrolled</span>
                      <span className="font-medium text-slate-900">
                        {course.enrolledStudents}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Completed</span>
                      <span className="font-medium text-green-600">
                        {course.completedStudents}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">In Progress</span>
                      <span className="font-medium text-amber-600">
                        {course.inProgressStudents}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{course.totalLessons} lessons</span>
                      <span>{course.instructor}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {courses.length === 0 && !isLoading && (
              <div className="bg-white rounded-xl border border-slate-200 px-6 py-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No courses available</p>
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Activity Feed
              </h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {activities.map((activity, i) => (
                <div key={i} className="px-6 py-4 flex items-start gap-4">
                  <div className={`p-2.5 rounded-full shrink-0 ${
                    activity.type === "course_complete" ? "bg-green-100" : "bg-indigo-100"
                  }`}>
                    {activity.type === "course_complete" ? (
                      <Award className="w-5 h-5 text-green-600" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">
                      <span className="font-semibold">{activity.userName}</span>
                      {" "}
                      {activity.type === "course_complete" ? "completed the course" : "completed a lesson"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDate(activity.timestamp)} at{" "}
                      {new Date(activity.timestamp).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && !isLoading && (
                <div className="px-6 py-12 text-center">
                  <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  suffix,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: "blue" | "purple" | "green" | "amber";
  suffix?: string;
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-600",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900">
            {value}
            {suffix && <span className="text-sm font-normal text-slate-500 ml-1">{suffix}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
