'use client';

import { useState, useRef } from 'react';
import {
  LayoutDashboard, Users, Video, BookOpen, Settings,
  Upload, Search, Bell, LogOut, MoreHorizontal,
  TrendingUp, UserCheck, PlayCircle, AlertCircle,
  ChevronDown, CheckCircle2, Clock, Trash2, Edit2,
  Eye, X, FileVideo, ArrowUpRight, Filter
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ── Mock Data ──────────────────────────────────────────────────────────────────
const STUDENTS = [
  { id: 'STU-001', name: 'Priya Sharma',    email: 'priya@example.com',   course: 'Advanced Neural Networks', progress: 72, status: 'Active',    joined: '12 Jan 2026' },
  { id: 'STU-002', name: 'Rahul Verma',     email: 'rahul@example.com',   course: 'Web Development Basics',   progress: 45, status: 'Active',    joined: '18 Jan 2026' },
  { id: 'STU-003', name: 'Ananya Patel',    email: 'ananya@example.com',  course: 'Data Science 101',         progress: 90, status: 'Completed', joined: '05 Feb 2026' },
  { id: 'STU-004', name: 'Vikram Singh',    email: 'vikram@example.com',  course: 'Advanced Neural Networks', progress: 30, status: 'Active',    joined: '20 Feb 2026' },
  { id: 'STU-005', name: 'Meera Iyer',      email: 'meera@example.com',   course: 'Machine Learning Pro',     progress: 60, status: 'Inactive',  joined: '02 Mar 2026' },
  { id: 'STU-006', name: 'Arjun Nair',      email: 'arjun@example.com',   course: 'Data Science 101',         progress: 15, status: 'Active',    joined: '10 Mar 2026' },
  { id: 'STU-007', name: 'Deepika Rao',     email: 'deepika@example.com', course: 'Web Development Basics',   progress: 80, status: 'Active',    joined: '14 Mar 2026' },
  { id: 'STU-008', name: 'Karthik Menon',   email: 'karthik@example.com', course: 'Machine Learning Pro',     progress: 55, status: 'Inactive',  joined: '16 Mar 2026' },
];

const VIDEOS = [
  { id: 'VID-001', title: 'Introduction to Neural Networks',  course: 'Advanced Neural Networks', duration: '12:34', size: '245 MB', uploaded: '10 Jan 2026', views: 1240 },
  { id: 'VID-002', title: 'Backpropagation Deep Dive',        course: 'Advanced Neural Networks', duration: '24:10', size: '498 MB', uploaded: '12 Jan 2026', views: 980  },
  { id: 'VID-003', title: 'Loss Functions & Optimizers',      course: 'Advanced Neural Networks', duration: '18:22', size: '367 MB', uploaded: '15 Jan 2026', views: 750  },
  { id: 'VID-004', title: 'HTML & CSS Fundamentals',          course: 'Web Development Basics',   duration: '30:05', size: '612 MB', uploaded: '18 Jan 2026', views: 2100 },
  { id: 'VID-005', title: 'JavaScript Essentials',            course: 'Web Development Basics',   duration: '45:00', size: '900 MB', uploaded: '20 Jan 2026', views: 1875 },
  { id: 'VID-006', title: 'Exploratory Data Analysis',        course: 'Data Science 101',         duration: '20:15', size: '410 MB', uploaded: '01 Feb 2026', views: 630  },
];

const COURSES = [
  { id: 'CRS-001', title: 'Advanced Neural Networks', students: 2, videos: 3, status: 'Published' },
  { id: 'CRS-002', title: 'Web Development Basics',   students: 2, videos: 2, status: 'Published' },
  { id: 'CRS-003', title: 'Data Science 101',         students: 2, videos: 1, status: 'Published' },
  { id: 'CRS-004', title: 'Machine Learning Pro',     students: 2, videos: 0, status: 'Draft'     },
];

type Section = 'overview' | 'students' | 'videos' | 'courses' | 'settings';

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, trend }: { label: string; value: string; sub?: string; icon: React.ElementType; trend?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-900 leading-none mb-1">{value}</p>
        {sub && <p className="text-xs text-slate-500 font-medium">{sub}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600">{trend}</span>
          </div>
        )}
      </div>
      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-slate-500" />
      </div>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-indigo-500' : 'bg-amber-400';
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-500 w-7 text-right">{value}%</span>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active:    'bg-emerald-50 text-emerald-700 border-emerald-100',
    Completed: 'bg-blue-50 text-blue-700 border-blue-100',
    Inactive:  'bg-slate-50 text-slate-500 border-slate-200',
    Published: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Draft:     'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${map[status] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
      {status}
    </span>
  );
}


// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [section, setSection] = useState<Section>('overview');
  const [search, setSearch] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCourse, setUploadCourse] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredStudents = STUDENTS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.course.toLowerCase().includes(search.toLowerCase())
  );

  const filteredVideos = VIDEOS.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.course.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = () => {
    if (!uploadFile || !uploadTitle || !uploadCourse) return;
    setUploading(true);
    setTimeout(() => { setUploading(false); setUploadDone(true); }, 2000);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('video/')) setUploadFile(f);
  };

  const navItems = [
    { id: 'overview',  label: 'Overview',  icon: LayoutDashboard },
    { id: 'students',  label: 'Students',  icon: Users },
    { id: 'videos',    label: 'Videos',    icon: Video },
    { id: 'courses',   label: 'Courses',   icon: BookOpen },
    { id: 'settings',  label: 'Settings',  icon: Settings },
  ] as const;

  return (
    <div className="h-screen flex bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
        {/* Logo area */}
        <div className="h-14 flex items-center px-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">Admin</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">Control Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setSection(id); setSearch(''); setUploadDone(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                section === id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold shrink-0">A</div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">Administrator</p>
              <p className="text-[10px] text-slate-400 truncate">admin@system</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/welcome')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0">
          <h1 className="text-sm font-bold text-slate-900 capitalize">
            {section === 'overview' ? 'Dashboard Overview' : section.charAt(0).toUpperCase() + section.slice(1)}
          </h1>
          <div className="flex-1" />
          {(section === 'students' || section === 'videos') && (
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
          {section === 'overview' && (
            <div className="space-y-6">
              {/* Stats grid */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard label="Total Students"  value="8"    sub="Enrolled"    icon={Users}      trend="+2 this week" />
                <StatCard label="Active Courses"  value="4"    sub="3 published" icon={BookOpen}                       />
                <StatCard label="Total Videos"    value="6"    sub="7.2 GB used" icon={PlayCircle} trend="+1 today"     />
                <StatCard label="Avg. Progress"   value="56%"  sub="Across all"  icon={TrendingUp}                      />
              </div>

              {/* Recent students + top videos */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Recent Students */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">Recent Students</h2>
                    <button onClick={() => setSection('students')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">View all</button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {STUDENTS.slice(0, 5).map(s => (
                      <div key={s.id} className="px-5 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                          {s.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{s.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{s.course}</p>
                        </div>
                        <ProgressBar value={s.progress} />
                        <Badge status={s.status} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Course progress overview */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">Courses</h2>
                    <button onClick={() => setSection('courses')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">View all</button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {COURSES.map(c => (
                      <div key={c.id} className="px-5 py-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{c.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{c.students} students · {c.videos} videos</p>
                        </div>
                        <Badge status={c.status} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick alerts */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">2 students are inactive</p>
                  <p className="text-xs text-amber-700 mt-0.5">Meera Iyer and Karthik Menon have not logged in for over 7 days.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STUDENTS ── */}
          {section === 'students' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">All Students</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{filteredStudents.length} records</p>
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
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-6 py-3">Student</th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Course</th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Progress</th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Joined</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStudents.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                              {s.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{s.name}</p>
                              <p className="text-[10px] text-slate-400">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-slate-600">{s.course}</span>
                        </td>
                        <td className="px-4 py-3.5 w-36">
                          <ProgressBar value={s.progress} />
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge status={s.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-slate-400">{s.joined}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="View">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Remove">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredStudents.length === 0 && (
                  <div className="py-16 text-center text-sm text-slate-400">No students found.</div>
                )}
              </div>
            </div>
          )}

          {/* ── VIDEOS ── */}
          {section === 'videos' && (
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
                    <p className="text-sm font-semibold text-slate-900">Video uploaded successfully!</p>
                    <button onClick={() => { setUploadDone(false); setUploadFile(null); setUploadTitle(''); setUploadCourse(''); }} className="text-xs text-indigo-600 font-medium hover:underline">Upload another</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                        dragOver ? 'border-indigo-400 bg-indigo-50' : uploadFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                      {uploadFile ? (
                        <>
                          <FileVideo className="w-8 h-8 text-emerald-500 mb-2" />
                          <p className="text-xs font-semibold text-emerald-700 text-center truncate max-w-full">{uploadFile.name}</p>
                          <p className="text-[10px] text-emerald-600 mt-1">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
                          <button onClick={(e) => { e.stopPropagation(); setUploadFile(null); }} className="mt-2 flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600">
                            <X className="w-3 h-3" /> Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-300 mb-3" />
                          <p className="text-xs font-semibold text-slate-600">Drop video here or click to browse</p>
                          <p className="text-[10px] text-slate-400 mt-1">MP4, MOV, AVI — max 2 GB</p>
                        </>
                      )}
                    </div>

                    {/* Meta fields */}
                    <div className="space-y-4 flex flex-col justify-center">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Video Title</label>
                        <input
                          type="text"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          placeholder="e.g. Introduction to Neural Networks"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all placeholder-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Course</label>
                        <div className="relative">
                          <select
                            value={uploadCourse}
                            onChange={(e) => setUploadCourse(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all appearance-none bg-white"
                          >
                            <option value="">Select a course...</option>
                            {COURSES.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                      <button
                        onClick={handleUpload}
                        disabled={!uploadFile || !uploadTitle || !uploadCourse || uploading}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-2.5 rounded-lg transition-all"
                      >
                        {uploading ? (
                          <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading...</>
                        ) : (
                          <><Upload className="w-3.5 h-3.5" />Upload Video</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Video library table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900">Video Library</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{filteredVideos.length} videos</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-6 py-3">Title</th>
                        <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Course</th>
                        <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Duration</th>
                        <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Size</th>
                        <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Views</th>
                        <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Uploaded</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredVideos.map(v => (
                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                <PlayCircle className="w-4 h-4 text-slate-500" />
                              </div>
                              <span className="text-xs font-semibold text-slate-800">{v.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5"><span className="text-xs text-slate-500">{v.course}</span></td>
                          <td className="px-4 py-3.5"><span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{v.duration}</span></td>
                          <td className="px-4 py-3.5"><span className="text-xs text-slate-500">{v.size}</span></td>
                          <td className="px-4 py-3.5"><span className="text-xs font-semibold text-slate-700">{v.views.toLocaleString()}</span></td>
                          <td className="px-4 py-3.5"><span className="text-xs text-slate-400">{v.uploaded}</span></td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1">
                              <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── COURSES ── */}
          {section === 'courses' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">All Courses</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{COURSES.length} courses</p>
                </div>
                <button className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors">
                  + New Course
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {COURSES.map(c => (
                  <div key={c.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{c.students} students enrolled · {c.videos} videos</p>
                    </div>
                    <Badge status={c.status} />
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {section === 'settings' && (
            <div className="space-y-5 max-w-2xl">
              {/* Platform settings */}
              {[
                {
                  title: 'Platform Information',
                  fields: [
                    { label: 'Platform Name', value: 'AI Lab Studio', type: 'text' },
                    { label: 'Support Email', value: 'support@ailabstudio.com', type: 'email' },
                  ]
                },
                {
                  title: 'Admin Account',
                  fields: [
                    { label: 'Admin ID', value: 'admin', type: 'text' },
                    { label: 'Current Password', value: '', type: 'password', placeholder: 'Enter new password...' },
                  ]
                }
              ].map(group => (
                <div key={group.title} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900">{group.title}</h2>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    {group.fields.map(f => (
                      <div key={f.label}>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
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
                  <h2 className="text-sm font-bold text-red-600">Danger Zone</h2>
                </div>
                <div className="px-6 py-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Reset all student data</p>
                    <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone.</p>
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

// local Shield import for sidebar
function Shield(props: React.SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={props.strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
