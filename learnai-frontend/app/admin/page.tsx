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
  TrendingUp,
  PlayCircle,
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  FileVideo,
  ArrowUpRight,
  Plus,
  Copy,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ApiResponseError, api } from "@/lib/api";

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
  approvalStatus?: "accepted" | "rejected";
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
  status?: "Published" | "Draft";
}

interface VideoMediaData {
  id: number;
  filename: string;
  mimeType: string;
  size: number;
  entityType: string | null;
  entityId: number | null;
  createdAt: string;
  url: string;
}

interface StudentFormState {
  fullName: string;
  rollNumber: string;
  dob: string;
  email: string;
}

interface CourseFormState {
  title: string;
  description: string;
  category: string;
  level: string;
  instructor: string;
  duration: string;
}

const emptyStudentForm: StudentFormState = {
  fullName: "",
  rollNumber: "",
  dob: "",
  email: "",
};

const emptyCourseForm: CourseFormState = {
  title: "",
  description: "",
  category: "",
  level: "",
  instructor: "",
  duration: "",
};

const getInitials = (fullName: string) =>
  fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "STD";

const normalizeRollNumber = (rollNumber: string) =>
  rollNumber.trim().toUpperCase().replace(/\s+/g, "");

const generateStudentIdFromProfile = (fullName: string, rollNumber: string) => {
  const initials = getInitials(fullName);
  const roll = normalizeRollNumber(rollNumber);
  const suffix = Math.floor(100 + Math.random() * 900);
  return `STU-${initials}-${roll || "ROLL"}-${suffix}`;
};

const formatDobPassword = (dob: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return "";
  const [year, month, day] = dob.split("-");
  return `${day}${month}${year}`;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getAvatarInitial = (name?: string | null, username?: string | null) => {
  const fromName = (name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  if (fromName) return fromName.slice(0, 2);
  const fromUsername = (username || "").trim().charAt(0).toUpperCase();
  return fromUsername || "S";
};

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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-start justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
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
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-slate-600" />
      </div>
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
  const [settingsFullName, setSettingsFullName] = useState("");
  const [settingsRollNumber, setSettingsRollNumber] = useState("");
  const [settingsDob, setSettingsDob] = useState("");
  const [settingsStudentId, setSettingsStudentId] = useState("");
  const [copiedField, setCopiedField] = useState<"id" | "password" | null>(
    null,
  );

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCourse, setUploadCourse] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [videos, setVideos] = useState<VideoMediaData[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [studentModalMode, setStudentModalMode] = useState<"add" | "edit">(
    "add",
  );
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [studentForm, setStudentForm] = useState<StudentFormState>(
    emptyStudentForm,
  );
  const [studentGeneratedId, setStudentGeneratedId] = useState("");

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [courseModalMode, setCourseModalMode] = useState<"add" | "edit">(
    "add",
  );
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [courseForm, setCourseForm] = useState<CourseFormState>(emptyCourseForm);

  const [deleteDialog, setDeleteDialog] = useState<{
    type: "student" | "course";
    id: number;
    name: string;
  } | null>(null);
  const [courseStatus, setCourseStatus] = useState<"Published" | "Draft">(
    "Published",
  );

  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPasswordForm, setAdminPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

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
      if (err instanceof ApiResponseError && err.status === 401) {
        await logout();
        return;
      }
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
      setUsers(
        data
          .filter((u) => !u.isAdmin)
          .map((u) => ({
            ...u,
            approvalStatus: "accepted" as const,
          })),
      );
    } catch (err) {
      if (err instanceof ApiResponseError && err.status === 401) {
        await logout();
        return;
      }
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await api.admin.courses();
      setCourses(
        data.map((c) => ({
          ...c,
          status: "Published" as const,
        })),
      );
    } catch (err) {
      if (err instanceof ApiResponseError && err.status === 401) {
        await logout();
        return;
      }
      console.error("Failed to load courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMedia = async () => {
    setLoading(true);
    try {
      const data = await api.admin.listMedia(200, 0);
      const onlyVideos = data.media.filter((m) =>
        m.mimeType.startsWith("video/"),
      );
      setVideos(onlyVideos);
    } catch (err) {
      if (err instanceof ApiResponseError && err.status === 401) {
        await logout();
        return;
      }
      console.error("Failed to load media:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (section === "students" && users.length === 0) {
      loadUsers();
    }
    if (section === "videos") {
      if (courses.length === 0) loadCourses();
      loadMedia();
    }
    if (section === "courses" && courses.length === 0) {
      loadCourses();
    }
  }, [section]);

  const query = search.toLowerCase();
  const mediaBaseUrl = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api"
  ).replace(/\/api$/, "");
  const filteredUsers = users.filter((u) => {
    const name = (u.name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const username = (u.username || "").toLowerCase();
    return name.includes(query) || email.includes(query) || username.includes(query);
  });

  const filteredCourses = courses.filter((c) => {
    const title = (c.title || "").toLowerCase();
    const category = (c.category || "").toLowerCase();
    return title.includes(query) || category.includes(query);
  });

  const handleLogout = async () => {
    await logout();
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle || !uploadCourse) return;
    setUploading(true);

    try {
      await api.admin.uploadMedia({
        file: uploadFile,
        title: uploadTitle.trim(),
        entityType: "course",
        entityId: Number(uploadCourse),
      });
      setUploading(false);
      setUploadDone(true);
      await loadMedia();
    } catch (err) {
      setUploading(false);
      window.alert(
        err instanceof Error ? err.message : "Failed to upload video.",
      );
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) setUploadFile(f);
  };

  const openVideo = (video: VideoMediaData) => {
    const fullUrl = `${mediaBaseUrl}${video.url}`;
    window.open(fullUrl, "_blank");
  };

  const deleteVideo = async (video: VideoMediaData) => {
    const confirmed = window.confirm(`Delete "${video.filename}"?`);
    if (!confirmed) return;
    try {
      await api.admin.deleteMedia(video.id);
      await loadMedia();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete video.");
    }
  };

  const openAddStudentModal = () => {
    setStudentModalMode("add");
    setEditingStudentId(null);
    setStudentForm(emptyStudentForm);
    setStudentGeneratedId("");
    setStudentModalOpen(true);
  };

  const openEditStudentModal = (student: UserData) => {
    setStudentModalMode("edit");
    setEditingStudentId(student.id);
    setStudentGeneratedId(student.username);
    setStudentForm({
      fullName: student.name,
      rollNumber: "",
      dob: "",
      email: student.email || "",
    });
    setStudentModalOpen(true);
  };

  const handleGenerateStudentId = () => {
    setStudentGeneratedId(
      generateStudentIdFromProfile(studentForm.fullName, studentForm.rollNumber),
    );
  };

  const saveStudentModal = () => {
    const fullName = studentForm.fullName.trim();
    const email = studentForm.email.trim();
    const password = formatDobPassword(studentForm.dob);
    const generatedId =
      studentGeneratedId ||
      generateStudentIdFromProfile(fullName, studentForm.rollNumber);

    if (!fullName) {
      window.alert("Full name is required.");
      return;
    }
    if (studentModalMode === "add" && !studentForm.rollNumber.trim()) {
      window.alert("Roll number is required.");
      return;
    }
    if (studentModalMode === "add" && !studentForm.dob) {
      window.alert("DOB is required.");
      return;
    }

    if (studentModalMode === "add") {
      const newUser: UserData = {
        id: Date.now(),
        name: fullName,
        username: generatedId,
        email,
        isAdmin: false,
        created_at: new Date().toISOString(),
      };
      setUsers((prev) => [newUser, ...prev]);
      window.alert(
        `Student created.\nStudent ID: ${generatedId}\nPassword (DOB): ${
          password || "N/A"
        }`,
      );
    } else if (editingStudentId !== null) {
      setUsers((prev) =>
        prev.map((student) =>
          student.id === editingStudentId
            ? {
                ...student,
                name: fullName,
                email,
                username: generatedId,
              }
            : student,
        ),
      );
      window.alert("Student updated.");
    }

    setStudentModalOpen(false);
  };

  const openAddCourseModal = () => {
    setCourseModalMode("add");
    setEditingCourseId(null);
    setCourseForm(emptyCourseForm);
    setCourseStatus("Published");
    setCourseModalOpen(true);
  };

  const openEditCourseModal = (course: CourseData) => {
    setCourseModalMode("edit");
    setEditingCourseId(course.id);
    setCourseForm({
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      instructor: course.instructor,
      duration: course.duration,
    });
    setCourseStatus(course.status ?? "Published");
    setCourseModalOpen(true);
  };

  const saveCourseModal = () => {
    const payload = {
      title: courseForm.title.trim(),
      description: courseForm.description.trim(),
      category: courseForm.category.trim(),
      level: courseForm.level.trim(),
      instructor: courseForm.instructor.trim(),
      duration: courseForm.duration.trim(),
      status: courseStatus,
    };
    if (
      !payload.title ||
      !payload.description ||
      !payload.category ||
      !payload.level ||
      !payload.instructor ||
      !payload.duration
    ) {
      window.alert("Please complete all course fields.");
      return;
    }

    if (courseModalMode === "edit" && editingCourseId !== null) {
      setCourses((prev) =>
        prev.map((course) =>
          course.id === editingCourseId ? { ...course, ...payload } : course,
        ),
      );
    } else {
      setCourses((prev) => [
        {
          id: Date.now(),
          title: payload.title,
          description: payload.description,
          category: payload.category,
          level: payload.level,
          instructor: payload.instructor,
          duration: payload.duration,
          status: payload.status,
        },
        ...prev,
      ]);
    }
    setCourseModalOpen(false);
  };

  const openDeleteDialog = (
    type: "student" | "course",
    id: number,
    name: string,
  ) => {
    setDeleteDialog({ type, id, name });
  };

  const confirmDelete = () => {
    if (!deleteDialog) return;
    if (deleteDialog.type === "student") {
      setUsers((prev) => prev.filter((student) => student.id !== deleteDialog.id));
    } else {
      setCourses((prev) => prev.filter((course) => course.id !== deleteDialog.id));
    }
    setDeleteDialog(null);
  };

  const copyText = async (value: string, field: "id" | "password") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      window.alert("Copy failed. Please copy manually.");
    }
  };

  const createStudentFromCredentials = () => {
    const fullName = settingsFullName.trim();
    const rollNumber = settingsRollNumber.trim();
    const password = formatDobPassword(settingsDob);
    const generatedId =
      settingsStudentId || generateStudentIdFromProfile(fullName, rollNumber);

    if (!fullName || !rollNumber || !settingsDob) {
      window.alert("Please fill full name, roll number, and DOB first.");
      return;
    }

    setUsers((prev) => [
      {
        id: Date.now(),
        name: fullName,
        username: generatedId,
        email: "",
        isAdmin: false,
        approvalStatus: "accepted",
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);

    setSettingsStudentId(generatedId);
    window.alert(
      `Student added.\nStudent ID: ${generatedId}\nPassword: ${password}`,
    );
    setSection("students");
  };

  const handleAdminResetPassword = () => {
    const { currentPassword, newPassword, confirmPassword } = adminPasswordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      window.alert("Please fill all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      window.alert("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      window.alert("New password and confirm password do not match.");
      return;
    }

    setAdminPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setAdminModalOpen(false);
    window.alert("Password reset request submitted.");
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
    { id: "settings", label: "Credentials", icon: Settings },
  ] as const;

  const avgProgress =
    dashboardData && dashboardData.stats.totalEnrollments > 0
      ? Math.round(
          (dashboardData.stats.totalLessons /
            (dashboardData.stats.totalEnrollments * 10)) *
            100,
        )
      : 0;
  const settingsPassword = formatDobPassword(settingsDob);
  const adminDisplayName = (user?.name || "Administrator").trim();
  const adminDisplayEmail = (user?.email || "admin@learnai.com").trim();
  const adminInitial = adminDisplayName.charAt(0).toUpperCase() || "A";

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 bg-slate-950 text-slate-100 border-r border-slate-800 flex flex-col h-full">
        {/* Logo area */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/15">
              <Shield className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">
                Admin
              </p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                Control Panel
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
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
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Admin info + logout */}
        <div className="p-4 border-t border-slate-800 shrink-0">
          <button
            onClick={() => setAdminModalOpen(true)}
            className="w-full flex items-center gap-2.5 mb-3 rounded-lg px-2 py-2 hover:bg-white/10 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {adminInitial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {adminDisplayName}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {adminDisplayEmail}
              </p>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center px-6 gap-4 shrink-0">
          <h1 className="text-sm font-bold text-slate-900 capitalize">
            {section === "overview"
              ? "Dashboard Overview"
              : section === "settings"
              ? "Student Credentials"
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
                className="pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all w-56"
              />
            </div>
          )}
          <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <Bell className="w-4 h-4" />
          </button>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-7">
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
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
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
                    {(dashboardData?.recentUsers?.filter((u) => u.username !== "admin")
                      ?.length ?? 0) > 0 ? (
                      dashboardData?.recentUsers
                        ?.filter((u) => u.username !== "admin")
                        .map((u) => (
                        <div
                          key={u.id}
                          className="px-5 py-3 flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                            {getAvatarInitial(u.name, u.username)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {u.name || "Student"}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {u.email || u.username || "N/A"}
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
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
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

            </div>
          )}

          {/* ── STUDENTS ── */}
          {section === "students" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
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
                  <button
                    onClick={() => {
                      setSection("settings");
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Student
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider px-6 py-3">
                        Student
                      </th>
                      <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">
                        Course
                      </th>
                      <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">
                        Progress
                      </th>
                      <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">
                        Status
                      </th>
                      <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">
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
                              {getAvatarInitial(u.name, u.username)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800">
                                {u.name || "Student"}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                ID: {u.username || "N/A"}
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
                          <Badge
                            status={
                              (u.approvalStatus ?? "accepted") === "accepted"
                                ? "Active"
                                : "Inactive"
                            }
                          />
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
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => openEditStudentModal(u)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors text-xs font-semibold"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            {u.id !== user?.id && (
                              <button
                                onClick={() =>
                                  openDeleteDialog("student", u.id, u.name)
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors text-xs font-semibold"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
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
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-slate-500" />
                    Upload New Video
                  </h2>
                </div>

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
                              <option key={c.id} value={String(c.id)}>
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
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">
                    Video Library
                  </h2>
                  <p className="text-xs text-slate-500">{videos.length} videos</p>
                </div>
                {videos.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-slate-400">
                    No videos uploaded yet. Upload your first video above.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {videos.map((video) => (
                      <div
                        key={video.id}
                        className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                          <FileVideo className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {video.filename}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatFileSize(video.size)} |{" "}
                            {new Date(video.createdAt).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openVideo(video)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-xs font-semibold"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => deleteVideo(video)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── COURSES ── */}
          {section === "courses" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    All Courses
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {filteredCourses.length} courses
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openAddCourseModal}
                    className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Course
                  </button>
                </div>
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
                          {c.instructor} | {c.level} | {c.duration}
                        </p>
                      </div>
                      <Badge status={c.status ?? "Published"} />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditCourseModal(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors text-xs font-semibold"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteDialog("course", c.id, c.title)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors text-xs font-semibold"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
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
                    <button
                      onClick={openAddCourseModal}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold mx-auto transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create First Course
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {section === "settings" && (
            <div className="space-y-5 max-w-3xl">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900">
                    Student ID & Password Generator
                  </h2>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <p className="text-xs text-slate-500">
                    Generate credentials using full name, roll number, and DOB.
                    Password format is `DDMMYYYY`.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={settingsFullName}
                      onChange={(e) => setSettingsFullName(e.target.value)}
                      placeholder="e.g. Rohan Sharma"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Roll Number
                    </label>
                    <input
                      type="text"
                      value={settingsRollNumber}
                      onChange={(e) => setSettingsRollNumber(e.target.value)}
                      placeholder="e.g. BTECH24CS045"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Student ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={settingsStudentId}
                        readOnly
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50"
                      />
                      <button
                        onClick={() =>
                          setSettingsStudentId(
                            generateStudentIdFromProfile(
                              settingsFullName,
                              settingsRollNumber,
                            ),
                          )
                        }
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Generate
                      </button>
                      <button
                        onClick={() => copyText(settingsStudentId, "id")}
                        disabled={!settingsStudentId}
                        className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold rounded-lg transition-colors"
                      >
                        {copiedField === "id" ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={settingsDob}
                      onChange={(e) => setSettingsDob(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Password Preview (DOB)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={settingsPassword || "DDMMYYYY"}
                        readOnly
                        className="w-full px-3.5 py-2.5 border border-emerald-200 rounded-lg text-xs bg-emerald-50 text-emerald-700 font-semibold"
                      />
                      <button
                        onClick={() => copyText(settingsPassword, "password")}
                        disabled={!settingsPassword}
                        className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold rounded-lg transition-colors"
                      >
                        {copiedField === "password" ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      Generated Preview
                    </p>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <p className="text-slate-600">
                        <span className="font-semibold text-slate-800">
                          Student ID:
                        </span>{" "}
                        {settingsStudentId || "-"}
                      </p>
                      <p className="text-slate-600">
                        <span className="font-semibold text-slate-800">
                          Password:
                        </span>{" "}
                        {settingsPassword || "-"}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={createStudentFromCredentials}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Create Student
                      </button>
                      <button
                        onClick={() => {
                          setSettingsFullName("");
                          setSettingsRollNumber("");
                          setSettingsDob("");
                          setSettingsStudentId("");
                          setCopiedField(null);
                        }}
                        className="px-3.5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {studentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  {studentModalMode === "add" ? "Add Student" : "Edit Student"}
                </h2>
                <button
                  onClick={() => setStudentModalOpen(false)}
                  className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={studentForm.fullName}
                    onChange={(e) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Roll Number
                    </label>
                    <input
                      type="text"
                      value={studentForm.rollNumber}
                      onChange={(e) =>
                        setStudentForm((prev) => ({
                          ...prev,
                          rollNumber: e.target.value,
                        }))
                      }
                      placeholder="e.g. BTECH24CS045"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      DOB
                    </label>
                    <input
                      type="date"
                      value={studentForm.dob}
                      onChange={(e) =>
                        setStudentForm((prev) => ({
                          ...prev,
                          dob: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={(e) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Generated Student ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={studentGeneratedId}
                      readOnly
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50"
                    />
                    <button
                      onClick={handleGenerateStudentId}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Generate
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Password Preview (DOB)
                  </label>
                  <input
                    type="text"
                    value={formatDobPassword(studentForm.dob) || "DDMMYYYY"}
                    readOnly
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setStudentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveStudentModal}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {studentModalMode === "add" ? "Create Student" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {courseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  {courseModalMode === "add" ? "Create New Course" : "Edit Course"}
                </h2>
                <button
                  onClick={() => setCourseModalOpen(false)}
                  className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Title
                    </label>
                    <input
                      type="text"
                      value={courseForm.title}
                      onChange={(e) =>
                        setCourseForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Category
                    </label>
                    <input
                      type="text"
                      value={courseForm.category}
                      onChange={(e) =>
                        setCourseForm((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) =>
                      setCourseForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Level
                    </label>
                    <input
                      type="text"
                      value={courseForm.level}
                      onChange={(e) =>
                        setCourseForm((prev) => ({ ...prev, level: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Instructor
                    </label>
                    <input
                      type="text"
                      value={courseForm.instructor}
                      onChange={(e) =>
                        setCourseForm((prev) => ({
                          ...prev,
                          instructor: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={courseForm.duration}
                      onChange={(e) =>
                        setCourseForm((prev) => ({
                          ...prev,
                          duration: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Course Status
                  </label>
                  <select
                    value={courseStatus}
                    onChange={(e) =>
                      setCourseStatus(e.target.value as "Published" | "Draft")
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all bg-white"
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setCourseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCourseModal}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl">
              <div className="px-6 py-5">
                <h2 className="text-base font-bold text-slate-900">
                  Confirm Delete
                </h2>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-700">
                    {deleteDialog.name}
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteDialog(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {adminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Administrator Settings
                </h2>
                <button
                  onClick={() => setAdminModalOpen(false)}
                  className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={adminPasswordForm.currentPassword}
                    onChange={(e) =>
                      setAdminPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={adminPasswordForm.newPassword}
                    onChange={(e) =>
                      setAdminPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={adminPasswordForm.confirmPassword}
                    onChange={(e) =>
                      setAdminPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setAdminModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdminResetPassword}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
