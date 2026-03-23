"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  FileText,
  Video,
  Target,
  ChevronRight,
  Clock,
  Pause,
  Volume2,
  Maximize,
  Settings,
  BookOpen,
  Code,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ExternalLink,
  Menu,
  Sparkles,
  Volume1,
  AlertCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import ReactPlayer from "react-player";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

interface LessonItem {
  id: number;
  title: string;
  type: string;
  duration: string | null;
  completed: boolean;
  active: boolean;
  description: string | null;
  content: string | null;
  videoUrl: string | null;
  objectives: string[];
  orderIndex: number;
}

interface CurriculumSection {
  id: string;
  day: string;
  title: string;
  items: LessonItem[];
}

interface CurrentLesson {
  id: number;
  title: string;
  type: string;
  duration: string | null;
  description: string | null;
  content: string | null;
  videoUrl: string | null;
  objectives: string[];
  orderIndex: number;
}

function LearningPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const playerRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({
    day1: true,
  });
  const [duration, setDuration] = useState(0);
  const [watched, setWatched] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [curriculum, setCurriculum] = useState<CurriculumSection[]>([]);
  const [currentLesson, setCurrentLesson] = useState<CurrentLesson | null>(
    null,
  );
  const [progress, setProgress] = useState({
    completed: 0,
    total: 0,
    percentage: 0,
  });
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(true);
  const [courseTitle, setCourseTitle] = useState("Advanced Neural Networks");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  // Get courseId from URL or default to first enrolled course
  useEffect(() => {
    const fetchCourseId = async () => {
      const courseIdParam = searchParams.get("courseId");
      if (courseIdParam) {
        setCourseId(parseInt(courseIdParam));
      } else {
        // Default to first enrolled course
        try {
          const enrolledCourses = await api.courses.getEnrolled();
          if (enrolledCourses.length > 0) {
            setCourseId(enrolledCourses[0].id);
            setCourseTitle(enrolledCourses[0].title);
          }
        } catch (error) {
          console.error("Failed to fetch enrolled courses:", error);
        }
      }
    };

    if (isAuthenticated) {
      fetchCourseId();
    }
  }, [isAuthenticated, searchParams]);

  // Fetch curriculum when courseId is available
  useEffect(() => {
    const fetchCurriculum = async () => {
      if (!courseId) return;

      setIsLoadingCurriculum(true);
      try {
        const data = await api.learning.getCurriculum(courseId);
        setCurriculum(data.curriculum);
        setCurrentLesson(data.currentLesson);
        setProgress(data.progress);

        // Auto-expand the section containing the current lesson
        if (data.currentLesson) {
          const currentSection = data.curriculum.find((section) =>
            section.items.some((item) => item.id === data.currentLesson?.id),
          );
          if (currentSection) {
            setExpandedDays({ [currentSection.id]: true });
          }
        }
      } catch (error) {
        console.error("Failed to fetch curriculum:", error);
      } finally {
        setIsLoadingCurriculum(false);
      }
    };

    fetchCurriculum();
  }, [courseId]);

  const toggleDay = (dayId: string) => {
    setExpandedDays((prev) => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  const handleLessonClick = async (lesson: LessonItem) => {
    if (!courseId) return;

    try {
      // Update current lesson in course progress
      await api.learning.setCurrentLesson(courseId, lesson.orderIndex);
      setCurrentLesson(lesson);
    } catch (error) {
      console.error("Failed to set current lesson:", error);
    }
  };

  const handleMarkComplete = async () => {
    if (!currentLesson || !courseId) return;

    try {
      await api.learning.completeLesson(currentLesson.id);

      // Refresh curriculum to update completion status
      const data = await api.learning.getCurriculum(courseId);
      setCurriculum(data.curriculum);
      setProgress(data.progress);

      // Move to next lesson
      const allLessons = curriculum.flatMap((section) => section.items);
      const currentIndex = allLessons.findIndex(
        (l) => l.id === currentLesson.id,
      );
      if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
        const nextLesson = allLessons[currentIndex + 1];
        setCurrentLesson(nextLesson);
        await api.learning.setCurrentLesson(courseId, nextLesson.orderIndex);
      }
    } catch (error) {
      console.error("Failed to mark lesson complete:", error);
    }
  };

  if (isLoading || !isAuthenticated || isLoadingCurriculum) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* ── Header ── */}
      <header className="h-16 bg-white border-b border-slate-200/80 flex items-center px-4 md:px-6 gap-3 shrink-0 z-30 shadow-sm relative">
        {/* Back button */}
        <button
          onClick={() => router.push("/ai-dashboard")}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors group shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-colors" />
        </button>

        <div className="h-6 w-px bg-slate-200 hidden md:block" />

        {/* Logo */}
        <div className="hidden md:flex items-center gap-3 pr-4 shrink-0">
          <div className="relative w-28 h-7">
            <Image
              src="/logo.png?v=2"
              alt="Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Course title — centered absolutely */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center">
          <span className="text-[9px] font-semibold text-indigo-500 uppercase tracking-[0.15em]">
            Course
          </span>
          <h1 className="text-sm font-semibold text-slate-800 leading-tight tracking-tight whitespace-nowrap">
            {courseTitle}
          </h1>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ── LEFT Sidebar: Course Content ── */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.aside
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="shrink-0 bg-white border-r border-slate-200/80 flex flex-col overflow-hidden z-20 shadow-sm"
            >
              <div className="w-80 flex flex-col h-full">
                {/* Sidebar header */}
                <div className="px-4 py-3 border-b border-slate-100 shrink-0 flex items-center gap-3">
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                    title="Close Course Content"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                  <div className="flex-1">
                    <h2 className="font-semibold text-slate-800 text-sm tracking-tight">
                      Course Content
                    </h2>
                    <div className="flex items-center mt-1.5">
                      <div className="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden mr-2">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-600 shrink-0">
                        {progress.completed} / {progress.total}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Curriculum list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {curriculum.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-xl border border-slate-100 overflow-hidden bg-white"
                    >
                      <button
                        onClick={() => toggleDay(section.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex flex-col items-start text-left">
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                            {section.day}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 mt-0.5">
                            {section.title}
                          </span>
                        </div>
                        {expandedDays[section.id] ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      <AnimatePresence>
                        {expandedDays[section.id] && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-2 pb-2 space-y-0.5 border-t border-slate-100">
                              {section.items.map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => handleLessonClick(item)}
                                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                                    item.active
                                      ? "bg-indigo-50 border border-indigo-100"
                                      : "hover:bg-slate-50 border border-transparent"
                                  }`}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    {item.completed ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    ) : item.active ? (
                                      <Play
                                        className="w-4 h-4 text-indigo-600"
                                        fill="currentColor"
                                      />
                                    ) : item.type === "reading" ? (
                                      <FileText className="w-4 h-4 text-slate-400" />
                                    ) : item.type === "exercise" ? (
                                      <Code className="w-4 h-4 text-slate-400" />
                                    ) : item.type === "quiz" ? (
                                      <HelpCircle className="w-4 h-4 text-orange-400" />
                                    ) : (
                                      <Video className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <span
                                      className={`text-xs font-semibold block leading-tight ${
                                        item.active
                                          ? "text-indigo-900"
                                          : "text-slate-700"
                                      }`}
                                    >
                                      {item.title}
                                    </span>
                                    <span
                                      className={`text-[10px] font-medium flex items-center gap-1 mt-1 ${
                                        item.active
                                          ? "text-indigo-500"
                                          : "text-slate-400"
                                      }`}
                                    >
                                      <Clock className="w-3 h-3" />{" "}
                                      {item.duration}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>

                {/* AI Tool button — minimalist professional */}
                <div className="p-4 border-t border-slate-100 shrink-0">
                  <button
                    onClick={() => window.open("https://chatgpt.com", "_blank")}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium transition-all group"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-500 group-hover:rotate-12 transition-transform" />
                    <span>Open AI Tool</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-auto text-indigo-400" />
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Floating open-sidebar button — only when closed */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-30 p-2 bg-white rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all"
            title="Open Course Content"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* ── RIGHT: Main content (video + simplified below) ── */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-4xl mx-auto p-6 md:p-8">
            {/* Video Player Container */}
            {currentLesson?.videoUrl ? (
              <div className="w-full aspect-video bg-slate-900 rounded-2xl shadow-xl relative overflow-hidden group border border-slate-800 mb-6">
                {/* React Player */}
                <div className="w-full h-full flex items-center justify-center bg-black">
                  {(() => {
                    const Player = ReactPlayer as any;
                    return (
                      <Player
                        ref={playerRef}
                        url={currentLesson.videoUrl}
                        playing={isPlaying}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onDuration={setDuration}
                        onProgress={(state: any) => setWatched(state.played)}
                        onBuffer={() => {}}
                        onSeek={(time: number) => setWatched(time)}
                        width="100%"
                        height="100%"
                        controls={false}
                        light={false}
                        volume={volume}
                        muted={false}
                      />
                    );
                  })()}
                </div>

                {/* Custom Controls Overlay */}
                <div className="absolute inset-0 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/80 to-transparent">
                  {/* Top Controls */}
                  <div className="p-4 flex items-center justify-end gap-3">
                    <button
                      onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                      title={volume === 0 ? "Unmute" : "Mute"}
                    >
                      {volume === 0 ? (
                        <Volume2 className="w-4 h-4 line-through" />
                      ) : (
                        <Volume1 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                      title="Fullscreen"
                    >
                      <Maximize className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="px-4 py-2 space-y-2">
                    {/* Timeline scrubber */}
                    <div
                      className="w-full h-1 bg-slate-600/50 rounded-full overflow-hidden cursor-pointer hover:h-1.5 transition-all group/scrub"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        playerRef.current?.seekTo(percent, "fraction");
                      }}
                    >
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${watched * 100}%` }}
                      />
                    </div>

                    {/* Time display and controls */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-indigo-600 text-white transition-all active:scale-95"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" fill="currentColor" />
                        )}
                      </button>

                      <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
                        {Math.floor(watched * duration)}:{String(Math.floor((watched * duration) % 60)).padStart(2, "0")} /{" "}
                        {Math.floor(duration)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
                      </span>

                      <div className="flex-1 flex items-center gap-2">
                        <Volume1 className="w-3 h-3 text-slate-300" />
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="flex-1 h-1 bg-slate-600/50 rounded-full cursor-pointer accent-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center Play Button (when not playing) */}
                {!isPlaying && (
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsPlaying(true)}
                    className="absolute inset-0 flex items-center justify-center z-10"
                  >
                    <div className="w-16 h-16 bg-white/10 hover:bg-indigo-600 rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-white/20 shadow-2xl">
                      <Play
                        className="w-7 h-7 text-white ml-1"
                        fill="currentColor"
                      />
                    </div>
                  </motion.button>
                )}
              </div>
            ) : (
              <div className="w-full aspect-video bg-slate-200 rounded-2xl shadow-xl border border-slate-300 mb-6 flex flex-col items-center justify-center gap-3">
                <AlertCircle className="w-12 h-12 text-slate-400" />
                <p className="text-slate-600 font-medium">No video available for this lesson</p>
              </div>
            )}

            {/* ── Below Video: Lesson Title + Next Button + Overview only ── */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                  {currentLesson?.orderIndex}.{" "}
                  {currentLesson?.title || "No lesson selected"}
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">
                  {currentLesson?.type || "Unknown"} ·{" "}
                  {currentLesson?.duration || "N/A"}
                </p>
              </div>
              <button
                onClick={handleMarkComplete}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-indigo-500/25 active:scale-[0.97] shrink-0"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Overview section */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Overview
                </h3>
              </div>
              <p className="text-slate-600 leading-relaxed mb-5">
                {currentLesson?.description ||
                  currentLesson?.content ||
                  "No description available."}
              </p>
              {currentLesson?.objectives &&
                currentLesson.objectives.length > 0 && (
                  <div className="bg-indigo-50/60 rounded-xl p-5 border border-indigo-100">
                    <h4 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-600" />
                      Learning Objectives
                    </h4>
                    <ul className="space-y-3 text-sm text-indigo-800/80">
                      {currentLesson.objectives.map((objective, index) => (
                        <li key={index} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          {objective}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function LearningPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      }
    >
      <LearningPageContent />
    </Suspense>
  );
}
