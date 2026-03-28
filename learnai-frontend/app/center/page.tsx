"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, LogOut, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface CenterAuth {
  centerId: string;
  centerCode: string;
  centerName: string;
  schoolName: string;
  adminId: string;
}

interface CenterStudentRecord {
  id: string;
  centerId: string;
  studentName: string;
  email: string;
  phoneNumber: string;
  courseClass: string;
  address: string;
  enrollmentDate: string;
}

const CENTER_SESSION_KEY = "centerSession";
const CENTER_AUTH_KEY = "centerAuth";
const CENTER_STUDENTS_KEY = "centerStudents";

export default function CenterAdminDashboardPage() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [centerAuth, setCenterAuth] = useState<CenterAuth | null>(null);
  const [allStudents, setAllStudents] = useState<CenterStudentRecord[]>([]);
  const [search, setSearch] = useState("");

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

      const rawStudents = localStorage.getItem(CENTER_STUDENTS_KEY);
      if (rawStudents) {
        const parsedStudents = JSON.parse(rawStudents) as CenterStudentRecord[];
        setAllStudents(Array.isArray(parsedStudents) ? parsedStudents : []);
      }
    } catch (err) {
      console.error("Failed to initialize center dashboard:", err);
      router.replace("/");
      return;
    }

    setIsReady(true);
  }, [router]);

  const centerStudents = useMemo(() => {
    if (!centerAuth) return [];
    // Data restriction: center admin sees only students for their own center_id.
    return allStudents.filter(
      (student) => student.centerId === centerAuth.centerId,
    );
  }, [allStudents, centerAuth]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return centerStudents;

    return centerStudents.filter((student) =>
      [
        student.studentName,
        student.email,
        student.phoneNumber,
        student.courseClass,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [centerStudents, search]);

  const courseProgress = useMemo(() => {
    const total = centerStudents.length || 1;
    const map = new Map<string, number>();

    centerStudents.forEach((student) => {
      map.set(student.courseClass, (map.get(student.courseClass) ?? 0) + 1);
    });

    return Array.from(map.entries())
      .map(([courseClass, count]) => ({
        courseClass,
        count,
        progressPercent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.progressPercent - a.progressPercent);
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
              <table className="w-full min-w-[860px]">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">
                      Student Name
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">
                      Email
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">
                      Phone Number
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">
                      Course / Class
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">
                      Enrollment Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-5 py-3 text-sm font-semibold text-slate-800">
                        {student.studentName}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        {student.email}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        {student.phoneNumber}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        {student.courseClass}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        {new Date(student.enrollmentDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}

                  {filteredStudents.length === 0 && (
                    <tr className="border-t border-slate-100">
                      <td
                        colSpan={5}
                        className="px-5 py-8 text-center text-sm text-slate-500"
                      >
                        No students found for this center.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Course Progress
                </h3>
                <p className="text-xs text-slate-500">
                  Based on student distribution
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
                        {course.progressPercent}% ({course.count})
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500"
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
