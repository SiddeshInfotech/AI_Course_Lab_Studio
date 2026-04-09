"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Loader,
  BookOpen,
  Target,
  Menu,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import VideoPlayer, { AudioTrack } from "./VideoPlayer";
import QuizSection, { QuizQuestion } from "./QuizSection";
import LessonButton from "./LessonButton";
import { useLearningState } from "./useLearningState";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api$/, "") ||
  "http://localhost:5001";

interface CurrentLesson {
  id: number;
  title: string;
  type: string;
  duration: string | null;
  description: string | null;
  content: string | null;
  videoUrl: string | null;
  unifiedVideoUrl?: string | null;
  audioTracks?: Array<{
    language: string;
    label: string;
    url: string;
  }> | null;
  objectives: string[];
  orderIndex: number;
  hasQuiz: boolean;
  videoCompleted: boolean;
  quizCompleted: boolean;
  quizScore: number | null;
  quizStarted: boolean;
  completed: boolean;
}

interface LessonItem {
  id: number;
  title: string;
  type: string;
  duration: string | null;
  completed: boolean;
  active: boolean;
  hasQuiz: boolean;
  videoCompleted: boolean;
  quizCompleted: boolean;
  orderIndex: number;
}

interface CurriculumSection {
  id: string;
  day: string;
  title: string;
  items: LessonItem[];
}

const parseQuizQuestions = (content: string | null): QuizQuestion[] => {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    const rawQuestions = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.questions)
      ? parsed.questions
      : [];

    return rawQuestions
      .map((q: any, idx: number) => {
        const options = Array.isArray(q?.options)
          ? q.options.filter((opt: unknown) => typeof opt === "string")
          : [];
        if (options.length < 2) return null;

        let answerIndex = -1;
        if (typeof q?.answerIndex === "number") {
          answerIndex = q.answerIndex;
        } else if (typeof q?.correctOptionIndex === "number") {
          answerIndex = q.correctOptionIndex;
        } else if (typeof q?.answer === "string") {
          answerIndex = options.findIndex(
            (opt: string) => opt.trim().toLowerCase() === q.answer.trim().toLowerCase()
          );
        } else if (typeof q?.correctAnswer === "string") {
          answerIndex = options.findIndex(
            (opt: string) => opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
          );
        }
        if (answerIndex < 0 || answerIndex >= options.length) return null;

        return {
          id: q?.id ?? idx + 1,
          question: typeof q?.question === "string" ? q.question : `Question ${idx + 1}`,
          options,
          answerIndex,
          explanation: typeof q?.explanation === "string" ? q.explanation : null,
        } as QuizQuestion;
      })
      .filter(Boolean) as QuizQuestion[];
  } catch {
    return [];
  }
};

export default function LearningPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const courseId = searchParams.get("courseId");
  const lessonId = searchParams.get("lessonId");
  const lessonOrderIndex = searchParams.get("lessonOrderIndex");
  const watermarkTimeRef = useRef<string>(new Date().toLocaleString());

  const [curriculum, setCurriculum] = useState<CurriculumSection[]>([]);
  const [currentLesson, setCurrentLesson] = useState<CurrentLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 });
  const [courseTitle, setCourseTitle] = useState("");

  const {
    videoCompleted,
    quizCompleted,
    quizScore,
    quizSubmitted,
    isUpdatingProgress,
    updateVideoProgress,
    submitQuiz,
    resetQuiz,
    setVideoCompleted,
    setQuizCompleted,
    setQuizScore,
    setQuizSubmitted,
  } = useLearningState();

  useEffect(() => {
    const interval = setInterval(() => {
      watermarkTimeRef.current = new Date().toLocaleString();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCurriculum = useCallback(async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const data = await api.learning.getCurriculum(Number(courseId));
      setCurriculum(data.curriculum);
      setProgress(data.progress);
      setCourseTitle(data.courseTitle || "");
      
      // If lessonOrderIndex is provided, find and load that specific lesson
      if (lessonOrderIndex) {
        const allLessons = data.curriculum.flatMap((section: any) => section.items);
        const targetLesson = allLessons.find((lesson: any) => lesson.orderIndex === parseInt(lessonOrderIndex));
        
        if (targetLesson) {
          const lessonData = await api.learning.getLesson(targetLesson.id);
          setCurrentLesson(lessonData as CurrentLesson);
          setVideoCompleted(lessonData.videoCompleted || false);
          setQuizCompleted(lessonData.quizCompleted || false);
          setQuizScore(lessonData.quizScore);
          setQuizSubmitted(lessonData.quizCompleted || false);
        } else if (data.currentLesson) {
          setCurrentLesson(data.currentLesson as CurrentLesson);
          setVideoCompleted(data.currentLesson.videoCompleted || false);
          setQuizCompleted(data.currentLesson.quizCompleted || false);
          setQuizScore(data.currentLesson.quizScore);
          setQuizSubmitted(data.currentLesson.quizCompleted || false);
        }
      } else if (data.currentLesson) {
        setCurrentLesson(data.currentLesson as CurrentLesson);
        setVideoCompleted(data.currentLesson.videoCompleted || false);
        setQuizCompleted(data.currentLesson.quizCompleted || false);
        setQuizScore(data.currentLesson.quizScore);
        setQuizSubmitted(data.currentLesson.quizCompleted || false);
      }
    } catch (err) {
      console.error("Failed to fetch curriculum:", err);
      setError("Failed to load curriculum");
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonOrderIndex, setVideoCompleted, setQuizCompleted, setQuizScore, setQuizSubmitted]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      if (!isAuthenticated && !authLoading) {
        router.push("/login");
      }
      return;
    }
    if (courseId) {
      fetchCurriculum();
    }
  }, [isAuthenticated, authLoading, courseId, fetchCurriculum, router]);

  const handleVideoComplete = useCallback(async () => {
    console.log("📹 handleVideoComplete called, currentLesson:", currentLesson?.id, "videoCompleted:", videoCompleted);
    if (!currentLesson || videoCompleted) {
      console.log("⏭️ Skipping - no current lesson or already completed");
      return;
    }
    try {
      console.log("📡 Calling updateVideoProgress API for lesson:", currentLesson.id);
      await updateVideoProgress(currentLesson.id);
      setVideoCompleted(true);
      console("✅ Video progress updated, refreshing curriculum...");
      await fetchCurriculum();
      console.log("✅ Curriculum refreshed");
    } catch (err) {
      console.error("❌ Failed to update video progress:", err);
    }
  }, [currentLesson, videoCompleted, updateVideoProgress, setVideoCompleted, fetchCurriculum]);

  const handleQuizSubmit = useCallback(async (answers: Record<number, number>, score: { correct: number; total: number }) => {
    if (!currentLesson) return;
    try {
      await submitQuiz(currentLesson.id, answers, score.correct);
      setQuizCompleted(true);
      setQuizScore(score.correct);
      setQuizSubmitted(true);
      await fetchCurriculum();
    } catch (err) {
      console.error("Failed to submit quiz:", err);
    }
  }, [currentLesson, submitQuiz, setQuizCompleted, setQuizScore, setQuizSubmitted, fetchCurriculum]);

  const handleQuizReset = useCallback(async () => {
    if (!currentLesson) return;
    try {
      await resetQuiz(currentLesson.id);
      setQuizCompleted(false);
      setQuizScore(null);
      setQuizSubmitted(false);
    } catch (err) {
      console.error("Failed to reset quiz:", err);
    }
  }, [currentLesson, resetQuiz, setQuizCompleted, setQuizScore, setQuizSubmitted]);

  const handleLessonSelect = useCallback(async (selectedLessonId: number) => {
    if (!courseId) return;

    const allLessons = curriculum.flatMap((section) => section.items);
    const lesson = allLessons.find((l) => l.id === selectedLessonId);
    if (!lesson) return;

    try {
      await api.learning.setCurrentLesson(Number(courseId), lesson.orderIndex);
      const lessonData = await api.learning.getLesson(selectedLessonId);
      const hasQuiz = parseQuizQuestions(lessonData.content).length > 0;
      
      setCurrentLesson({
        ...lessonData,
        hasQuiz,
        videoCompleted: lesson.videoCompleted,
        quizCompleted: lesson.quizCompleted,
        quizScore: null,
        quizStarted: false,
        completed: lesson.completed,
      } as CurrentLesson);
      setVideoCompleted(lesson.videoCompleted);
      setQuizCompleted(lesson.quizCompleted);
      setQuizScore(null);
      setQuizSubmitted(false);

      router.replace(`/learning?courseId=${courseId}&lessonOrderIndex=${lesson.orderIndex}`);
    } catch (err) {
      console.error("Failed to load lesson:", err);
    }
  }, [courseId, curriculum, setVideoCompleted, setQuizCompleted, setQuizScore, setQuizSubmitted, router]);

  const handleGoToNextLesson = useCallback(async () => {
    if (!courseId || !currentLesson) return;

    const allLessons = curriculum.flatMap((section) => section.items);
    const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
    
    if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1];
      await handleLessonSelect(nextLesson.id);
    }
  }, [courseId, currentLesson, curriculum, handleLessonSelect]);

  const handleGoToPreviousLesson = useCallback(async () => {
    if (!courseId || !currentLesson) return;

    const allLessons = curriculum.flatMap((section) => section.items);
    const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
    
    if (currentIndex > 0) {
      const prevLesson = allLessons[currentIndex - 1];
      await handleLessonSelect(prevLesson.id);
    }
  }, [currentLesson, curriculum, handleLessonSelect]);

  const isLessonLocked = useCallback((lessonId: number): boolean => {
    const allLessons = curriculum.flatMap((section) => section.items);
    const currentIndex = allLessons.findIndex((l) => l.id === currentLesson?.id);
    const lessonIndex = allLessons.findIndex((l) => l.id === lessonId);
    
    if (lessonIndex <= currentIndex) return false;
    
    const previousLesson = allLessons[lessonIndex - 1];
    if (!previousLesson) return false;
    
    return !(previousLesson.videoCompleted && previousLesson.quizCompleted);
  }, [curriculum, currentLesson]);

  const getAllLessons = useCallback((): LessonItem[] => {
    return curriculum.flatMap((section) => section.items);
  }, [curriculum]);

  const isLastLesson = currentLesson
    ? getAllLessons().findIndex((l) => l.id === currentLesson.id) === getAllLessons().length - 1
    : false;

  const isFirstLesson = currentLesson
    ? getAllLessons().findIndex((l) => l.id === currentLesson.id) === 0
    : false;

  const quizQuestions = parseQuizQuestions(currentLesson?.content || null);
  const hasQuiz = quizQuestions.length > 0;

  const getButtonState = (): "video" | "quiz" | "completed" => {
    if (!currentLesson) return "video";
    if (videoCompleted && quizCompleted) return "completed";
    if (!videoCompleted) return "video";
    if (hasQuiz && !quizCompleted) return "quiz";
    return "video";
  };

  const handleTakeQuiz = () => {
    const quizSection = document.getElementById("quiz-section");
    if (quizSection) {
      quizSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchCurriculum}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const videoUrl = currentLesson?.unifiedVideoUrl || currentLesson?.videoUrl || "";
  const watermarkText = `${user?.email || user?.username || "Protected"} | ${watermarkTimeRef.current}`;
  
  // Audio tracks from lesson - already parsed by backend
  const audioTracks: AudioTrack[] = currentLesson?.audioTracks || [];

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 overflow-hidden">
      <header className="h-16 bg-white border-b border-slate-200/80 flex items-center px-4 md:px-6 gap-3 shrink-0 z-30 shadow-sm relative">
        <button
          onClick={() => router.push("/ai-dashboard")}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors group shrink-0"
          title="Go back to dashboard"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-colors" />
        </button>

        <div className="h-6 w-px bg-slate-200 hidden md:block" />

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

        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center">
          <span className="text-[9px] font-semibold text-indigo-500 uppercase tracking-[0.15em]">
            Course
          </span>
          <h1 className="text-sm font-semibold text-slate-800 leading-tight tracking-tight whitespace-nowrap">
            {courseTitle || "Loading..."}
          </h1>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
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

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {curriculum.map((section, sectionIndex) => {
                    const dayLocked = sectionIndex > 0 && 
                      !curriculum[sectionIndex - 1].items.every((item) => item.completed);

                    return (
                      <div key={section.id}>
                        <button
                          onClick={() => {
                            const current = [...document.querySelectorAll("[data-section]")];
                            const el = current.find((e) => e.getAttribute("data-section") === section.id);
                            if (el) {
                              const isExpanded = el.getAttribute("data-expanded") === "true";
                              el.setAttribute("data-expanded", String(!isExpanded));
                            }
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <span className="font-medium text-slate-800 text-sm">
                            {section.title || section.day}
                          </span>
                          {section.items.every((item) => item.completed) && (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}
                        </button>

                        <div className="ml-2 space-y-1">
                          {section.items.map((lesson) => {
                            const isLocked = isLessonLocked(lesson.id);
                            const isActive = lesson.id === currentLesson?.id;

                            return (
                              <button
                                key={lesson.id}
                                onClick={() => !isLocked && handleLessonSelect(lesson.id)}
                                disabled={isLocked}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                                  isActive
                                    ? "bg-indigo-50 border border-indigo-200"
                                    : isLocked
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex-shrink-0">
                                  {isLocked ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                                  ) : lesson.completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  ) : isActive ? (
                                    <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-indigo-500" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm truncate block ${isActive ? "font-semibold text-indigo-700" : "text-slate-700"}`}>
                                    {lesson.title}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {lesson.duration && (
                                      <span className="text-xs text-slate-400">{lesson.duration}</span>
                                    )}
                                    {lesson.hasQuiz && (
                                      <span className="text-xs text-orange-600">Quiz</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {lesson.videoCompleted && !lesson.completed && (
                                    <span className="text-[10px] text-blue-600">✓</span>
                                  )}
                                  {lesson.quizCompleted && (
                                    <span className="text-[10px] text-green-600">✓</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="fixed top-20 left-4 z-10 p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Menu className="w-4 h-4 text-slate-600" />
            </button>
          )}

          <div className="max-w-4xl mx-auto p-6">
            {currentLesson && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                    {currentLesson.orderIndex}. {currentLesson.title}
                  </h1>
                  <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">
                    {currentLesson.type || "Video"} · {currentLesson.duration || "N/A"}
                  </p>
                </div>

                {currentLesson.objectives && currentLesson.objectives.length > 0 && (
                  <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-semibold text-indigo-900">Learning Objectives</h3>
                    </div>
                    <ul className="space-y-1">
                      {currentLesson.objectives.map((obj, idx) => (
                        <li key={idx} className="text-sm text-indigo-800 flex items-start gap-2">
                          <span className="text-indigo-400 mt-1">•</span>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {videoUrl && (
                  <div className="mb-6">
                    <VideoPlayer
                      videoUrl={videoUrl}
                      title={currentLesson.title}
                      watermarkText={watermarkText}
                      audioTracks={audioTracks}
                      onVideoComplete={handleVideoComplete}
                      className="mb-4"
                    />
                    {!videoCompleted && (
                      <p className="text-center text-amber-600 text-sm font-medium">
                        Watch the video completely to unlock the quiz
                      </p>
                    )}
                  </div>
                )}

                {hasQuiz && (
                  <div id="quiz-section" className="mb-6">
                    <QuizSection
                      questions={quizQuestions}
                      onSubmit={handleQuizSubmit}
                      onReset={handleQuizReset}
                      isLocked={!videoCompleted}
                      isCompleted={quizCompleted}
                      previousScore={quizScore}
                      lockedMessage="Watch the video first to unlock the quiz"
                    />
                  </div>
                )}

                <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-200">
                  <button
                    onClick={handleGoToPreviousLesson}
                    disabled={isFirstLesson}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isFirstLesson
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <LessonButton
                    state={getButtonState()}
                    videoCompleted={videoCompleted}
                    quizCompleted={quizCompleted}
                    hasQuiz={hasQuiz}
                    isLastLesson={isLastLesson}
                    onTakeQuiz={handleTakeQuiz}
                    onNextLesson={handleGoToNextLesson}
                  />

                  <button
                    onClick={handleGoToNextLesson}
                    disabled={isLastLesson || !(videoCompleted && (quizCompleted || !hasQuiz))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isLastLesson || !(videoCompleted && (quizCompleted || !hasQuiz))
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {currentLesson.description && (
                  <div className="mt-8 p-4 bg-white rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-5 h-5 text-slate-600" />
                      <h3 className="font-semibold text-slate-900">About this lesson</h3>
                    </div>
                    <p className="text-slate-600">{currentLesson.description}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}