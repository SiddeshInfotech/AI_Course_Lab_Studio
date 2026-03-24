/* eslint-disable react/no-unknown-property */
"use client";

import { useState, useEffect, Suspense } from "react";
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  FileText,
  Video,
  Target,
  ChevronRight,
  Clock,
  BookOpen,
  Code,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ExternalLink,
  Menu,
  Sparkles,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import { useVideoProtection } from "@/hooks/useVideoProtection";
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

  // Enable video protection on this page
  useVideoProtection();

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({
    day1: true,
  });

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

  // Helper: Find the current day index (the day containing the active lesson)
  const getCurrentDayIndex = (): number => {
    if (!currentLesson) return 0;
    const dayIndex = curriculum.findIndex((section) =>
      section.items.some((item) => item.id === currentLesson.id),
    );
    return dayIndex >= 0 ? dayIndex : 0;
  };

  // Helper: Check if a day is locked (all days after current day are locked)
  const isDayLocked = (dayIndex: number): boolean => {
    const currentDayIndex = getCurrentDayIndex();
    return dayIndex > currentDayIndex;
  };

  // Helper: Check if a lesson is locked
  const isLessonLocked = (
    _lesson: LessonItem,
    sectionIndex: number,
  ): boolean => {
    return isDayLocked(sectionIndex);
  };
  const toggleDay = (dayId: string) => {
    setExpandedDays((prev) => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  const handleLessonClick = async (lesson: LessonItem) => {
    if (!courseId) return;

    // Find which section/day this lesson belongs to
    const sectionIndex = curriculum.findIndex((section) =>
      section.items.some((item) => item.id === lesson.id),
    );

    // Prevent clicking on locked lessons
    if (isLessonLocked(lesson, sectionIndex)) {
      return;
    }

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
          title="Go back to dashboard"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-colors" />
        </button>

        <div className="h-6 w-px bg-slate-200 hidden md:block" />

        {/* Logo */}
        <div className="hidden md:flex items-center gap-3 pr-4 shrink-0">
          <div className="relative w-28 h-7">
            <Image
              src="/logo.png"
              alt="Logo"
              fill
              sizes="112px"
              className="object-contain"

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
                  {curriculum.map((section, sectionIndex) => {
                    const dayLocked = isDayLocked(sectionIndex);
                    return (
                      <div
                        key={section.id}
                        className={`rounded-xl border overflow-hidden transition-all ${
                          dayLocked
                            ? "border-slate-200 bg-slate-50"
                            : "border-slate-100 bg-white"
                        }`}
                      >
                        <button
                          onClick={() => !dayLocked && toggleDay(section.id)}
                          disabled={dayLocked}
                          className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                            dayLocked
                              ? "cursor-not-allowed opacity-60"
                              : "hover:bg-slate-50 cursor-pointer"
                          }`}
                          title={
                            dayLocked ? "Complete previous days to unlock" : ""
                          }
                        >
                          <div className="flex flex-col items-start text-left">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                dayLocked ? "text-slate-400" : "text-indigo-500"
                              }`}
                            >
                              {section.day}
                            </span>
                            <span
                              className={`text-xs font-semibold mt-0.5 ${
                                dayLocked ? "text-slate-500" : "text-slate-800"
                              }`}
                            >
                              {section.title}
                            </span>
                          </div>
                          {dayLocked ? (
                            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : expandedDays[section.id] ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                        </button>

                        <AnimatePresence>
                          {expandedDays[section.id] && !dayLocked && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: "auto" }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-2 pb-2 space-y-0.5 border-t border-slate-100">
                                {section.items.map((item) => {
                                  const itemLocked = isLessonLocked(
                                    item,
                                    sectionIndex,
                                  );
                                  return (
                                    <div
                                      key={item.id}
                                      onClick={() =>
                                        !itemLocked && handleLessonClick(item)
                                      }
                                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-all ${
                                        itemLocked
                                          ? "cursor-not-allowed opacity-50"
                                          : "cursor-pointer"
                                      } ${
                                        item.active
                                          ? "bg-indigo-50 border border-indigo-100"
                                          : itemLocked
                                          ? "border border-transparent"
                                          : "hover:bg-slate-50 border border-transparent"
                                      }`}
                                    >
                                      <div className="mt-0.5 shrink-0">
                                        {itemLocked ? (
                                          <Lock className="w-4 h-4 text-slate-300" />
                                        ) : item.completed ? (
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
                                            itemLocked
                                              ? "text-slate-400"
                                              : item.active
                                              ? "text-indigo-900"
                                              : "text-slate-700"
                                          }`}
                                        >
                                          {item.title}
                                        </span>
                                        <span
                                          className={`text-[10px] font-medium flex items-center gap-1 mt-1 ${
                                            itemLocked
                                              ? "text-slate-300"
                                              : item.active
                                              ? "text-indigo-500"
                                              : "text-slate-400"
                                          }`}
                                        >
                                          <Clock className="w-3 h-3" />{" "}
                                          {item.duration}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
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
            {/* Video Player Container - Protected */}
            {currentLesson?.videoUrl ? (
              <div
                className="w-full aspect-video bg-slate-900 rounded-2xl shadow-xl relative overflow-hidden border border-slate-800 mb-6"
                onContextMenu={(e) => {
                  e.preventDefault();
                  return false;
                }}
              >
                {/* Protected YouTube iframe embed */}
                <div className="w-full h-full flex items-center justify-center bg-black">
                  {(() => {
                    // Extract video ID from YouTube URL
                    const getYouTubeId = (url: string) => {
                      let videoId = "";
                      if (url.includes("youtube.com/embed/")) {
                        videoId = url.match(/embed\/([^?&]+)/)?.[1] || "";
                      } else if (url.includes("youtube.com/watch")) {
                        videoId = url.match(/v=([^&]+)/)?.[1] || "";
                      } else if (url.includes("youtu.be/")) {
                        videoId = url.match(/youtu\.be\/([^?&]+)/)?.[1] || "";
                      }
                      return videoId;
                    };

                    const videoId = getYouTubeId(currentLesson.videoUrl);

                    if (!videoId) {
                      return (
                        <div className="text-center">
                          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                          <p className="text-red-400 text-sm">
                            Invalid video URL
                          </p>
                        </div>
                      );
                    }

                    return (
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&modestbranding=1&rel=0&fs=1`}
                        title={currentLesson.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    );
                  })()}
                </div>

                {/* Screenshot Prevention Canvas */}
                <canvas
                  id="screenshotCanvas"
                  className="hidden"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    return false;
                  }}
                />
              </div>
            ) : (
              <div className="w-full aspect-video bg-slate-200 rounded-2xl shadow-xl border border-slate-300 mb-6 flex flex-col items-center justify-center gap-3">
                <AlertCircle className="w-12 h-12 text-slate-400" />
                <p className="text-slate-600 font-medium">
                  No video available for this lesson
                </p>
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
