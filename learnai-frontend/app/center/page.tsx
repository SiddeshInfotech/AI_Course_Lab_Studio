"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, LogOut, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { ApiResponseError, api } from "@/lib/api";

interface CenterAuth {
  centerId: string;
  centerCode: string;
  centerName: string;
  schoolName: string;
  adminId: string;
}

interface CenterStudentRecord {
  id: number;
  name: string;
  username: string;
  email: string;
  rollNumber: string | null;
  dob: string | null;
  createdAt: string;
  centerId: number | null;
  enrolledCourses: Array<{
    id: number;
    title: string;
    enrolledAt: string;
  }>;
  totalCourses: number;
  completedCourses: number;
  avgProgress: number;
  progress: Array<{
    courseId: number;
    completed: boolean;
    currentLessonId: number | null;
    lastAccessedAt: string | null;
  }>;
  lastActivity: string | null;
  dailyUsageLast7Days: number;
}

const CENTER_SESSION_KEY = "centerSession";
const CENTER_AUTH_KEY = "centerAuth";
const CENTER_TOKEN_KEY = "centerToken";

export default function CenterAdminDashboardPage() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [centerAuth, setCenterAuth] = useState<CenterAuth | null>(null);
  const [allStudents, setAllStudents] = useState<CenterStudentRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCenterStudents = async () => {
    if (!centerAuth) return;
    
    try {
      const token = localStorage.getItem(CENTER_TOKEN_KEY);
      console.log("Fetching students with token:", token ? "exists" : "missing");
      
      const response = await fetch(`http://localhost:5001/api/center/students`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      console.log("Students response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Center students data:", data);
        
        // Handle the { students: [...] } response format
        let studentsArray = [];
        if (data.students && Array.isArray(data.students)) {
          studentsArray = data.students;
        } else if (Array.isArray(data)) {
          studentsArray = data;
        }
        
        console.log("Students array:", studentsArray.length);
        
        // Map the API data to our format with progress
        const mappedStudents: CenterStudentRecord[] = studentsArray.map((s: any) => ({
          id: s.id,
          name: s.name || s.username || "Unknown",
          username: s.username || "",
          email: s.email || "",
          rollNumber: s.rollNumber || null,
          dob: s.dob || null,
          createdAt: s.createdAt || s.created_at || new Date().toISOString(),
          centerId: s.centerId || null,
          enrolledCourses: s.enrolledCourses || [],
          totalCourses: s.totalCourses || 0,
          completedCourses: s.completedCourses || 0,
          avgProgress: s.avgProgress || 0,
          progress: s.progress || [],
          lastActivity: s.lastActivity || null,
          dailyUsageLast7Days: s.dailyUsageLast7Days || 0,
        }));
        
        console.log("Mapped students:", mappedStudents.length);
        setAllStudents(mappedStudents);
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch students:", response.status, errorText);
      }
    } catch (err) {
      console.error("Failed to fetch center students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasSession = localStorage.getItem(CENTER_SESSION_KEY) === "true";
    if (!hasSession) {
      router.replace("/");
      return;
    }

    try {
      const rawAuth = localStorage.getItem(CENTER_AUTH_KEY);
      if (!rawAuth) {
        router.replace("/");
        return;
      }

      const parsedAuth = JSON.parse(rawAuth) as CenterAuth;
      setCenterAuth(parsedAuth);
    } catch (err) {
      console.error("Failed to initialize center dashboard:", err);
      router.replace("/");
      return;
    }

    setIsReady(true);
  }, [router]);

  useEffect(() => {
    if (centerAuth && isReady) {
      fetchCenterStudents();
    }
  }, [centerAuth, isReady]);

  const centerStudents = useMemo(() => {
    if (!centerAuth) return [];
    // Data restriction: center admin sees only students for their own center_id.
    return allStudents.filter(
      (student) => String(student.centerId) === String(centerAuth.centerId),
    );
  }, [allStudents, centerAuth]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return centerStudents;

    return centerStudents.filter((student) =>
      [
        student.name,
        student.username,
        student.email,
        student.rollNumber,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [centerStudents, search]);

  const courseProgress = useMemo(() => {
    const total = centerStudents.length || 1;
    
    // Calculate progress distribution
    const inProgress = centerStudents.filter(s => s.avgProgress > 0 && s.avgProgress < 100).length;
    const completed = centerStudents.filter(s => s.avgProgress >= 100 || s.completedCourses > 0).length;
    const notStarted = centerStudents.filter(s => s.avgProgress === 0 && s.totalCourses === 0).length;
    
    return [
      {
        courseClass: "Completed",
        count: completed,
        progressPercent: Math.round((completed / total) * 100),
        color: "bg-green-500",
      },
      {
        courseClass: "In Progress",
        count: inProgress,
        progressPercent: Math.round((inProgress / total) * 100),
        color: "bg-blue-500",
      },
      {
        courseClass: "Not Started",
        count: notStarted,
        progressPercent: Math.round((notStarted / total) * 100),
        color: "bg-slate-300",
      },
    ];
  }, [centerStudents]);

  const handleLogout = () => {
    localStorage.removeItem(CENTER_SESSION_KEY);
    localStorage.removeItem(CENTER_AUTH_KEY);
    router.push("/");
  };

  if (!isReady || !centerAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-700 text-white p-6 md:p-7 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200 font-bold">
                Center Admin
              </p>
              <h1 className="text-2xl md:text-3xl font-black mt-1">
                Student Details & Course Progress
              </h1>
              <p className="text-indigo-100 text-sm mt-2">
                {centerAuth.centerName} - {centerAuth.schoolName}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Student Details
                </h2>
                <p className="text-xs text-slate-500">
                  Showing students for center code {centerAuth.centerCode}.
                </p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student, email, phone, class..."
                  className="w-full sm:w-72 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              ) : (
              <table className="w-full min-w-[1000px]">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">
                      Student
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">
                      Courses
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500 text-center">
                      Progress
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500 text-center">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">
                      Enrolled Courses
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {student.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {student.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm font-semibold text-slate-700">
                          {student.totalCourses}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">courses</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                student.avgProgress >= 100 ? 'bg-green-500' :
                                student.avgProgress > 0 ? 'bg-blue-500' : 'bg-slate-300'
                              }`}
                              style={{ width: `${Math.min(student.avgProgress, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">
                            {student.avgProgress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {student.avgProgress >= 100 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                            Completed
                          </span>
                        ) : student.avgProgress > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full">
                            Not Started
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {student.enrolledCourses.slice(0, 2).map((course) => (
                            <span key={course.id} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded">
                              {course.title.length > 20 ? course.title.substring(0, 20) + '...' : course.title}
                            </span>
                          ))}
                          {student.enrolledCourses.length > 2 && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">
                              +{student.enrolledCourses.length - 2} more
                            </span>
                          )}
                          {student.enrolledCourses.length === 0 && (
                            <span className="text-xs text-slate-400">No courses</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs text-slate-500">
                          {new Date(student.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredStudents.length === 0 && (
                    <tr className="border-t border-slate-100">
                      <td
                        colSpan={6}
                        className="px-5 py-8 text-center text-sm text-slate-500"
                      >
                        No students found for this center.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Progress Overview
                </h3>
                <p className="text-xs text-slate-500">
                  Student progress summary
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="px-5 py-4 space-y-4">
              {courseProgress.length === 0 ? (
                <div className="text-sm text-slate-500 py-4 text-center">
                  No course progress to display.
                </div>
              ) : (
                courseProgress.map((course) => (
                  <div key={course.courseClass}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-slate-700">
                        {course.courseClass}
                      </p>
                      <p className="text-xs font-bold text-slate-900">
                        {course.count} students
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${course.color}`}
                        style={{ width: `${course.progressPercent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" />
              Total Students: {centerStudents.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
