"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  FileText,
  HelpCircle,
  Menu,
  Play,
  Video,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiResponseError } from "@/lib/api";
import { useVideoProtection } from "@/hooks/useVideoProtection";

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
  completed?: boolean;
  active?: boolean;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  answerIndex: number;
}

const parseQuizQuestions = (content: string | null): QuizQuestion[] => {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content) as { questions?: QuizQuestion[] };
    return Array.isArray(parsed.questions) ? parsed.questions : [];
  } catch {
    return [];
  }
};

const getYouTubeId = (url: string): string => {
  if (url.includes("youtube.com/embed/"))
    return url.match(/embed\/([^?&]+)/)?.[1] || "";
  if (url.includes("youtube.com/watch"))
    return url.match(/v=([^&]+)/)?.[1] || "";
  if (url.includes("youtu.be/"))
    return url.match(/youtu\.be\/([^?&]+)/)?.[1] || "";
  return "";
};

const SmartVideoPlayer = ({
  videoUrl,
  title,
}: {
  videoUrl: string;
  title: string;
}) => {
  const isYouTube =
    videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");

  if (isYouTube) {
    const id = getYouTubeId(videoUrl);
    if (!id) {
      return (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-300">
          Invalid video URL
        </div>
      );
    }

    return (
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${id}?modestbranding=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    );
  }

  return (
    <video
      className="w-full h-full object-contain"
      src={videoUrl}
      controls
      preload="metadata"
      controlsList="nodownload noplaybackrate"
      disablePictureInPicture
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};

function LearningPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

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
  const [courseTitle, setCourseTitle] = useState("Course");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({
    day1: true,
  });
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const quizQuestions = useMemo(
    () => parseQuizQuestions(currentLesson?.content || null),
    [currentLesson?.id, currentLesson?.content],
  );

  const isQuizLesson = currentLesson?.type?.toLowerCase() === "quiz";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/");
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
  }, [currentLesson?.id]);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const courseIdParam = searchParams.get("courseId");
        const enrolled = await api.courses.getEnrolled();
        const published = enrolled.filter(
          (course) => course.status !== "Draft",
        );
        if (!published.length) {
          setCourseId(null);
          setIsLoadingCurriculum(false);
          return;
        }
        const requestedId = courseIdParam
          ? parseInt(courseIdParam, 10)
          : published[0].id;
        const selected =
          published.find((c) => c.id === requestedId) || published[0];
        setCourseId(selected.id);
        setCourseTitle(selected.title);
      } catch (error) {
        if (error instanceof ApiResponseError && error.status === 401) return;
      }
    };

    if (isAuthenticated) loadCourse();
  }, [isAuthenticated, searchParams]);

  useEffect(() => {
    const loadCurriculum = async () => {
      if (!courseId) return;
      setIsLoadingCurriculum(true);
      try {
        const data = await api.learning.getCurriculum(courseId);
        setCurriculum(data.curriculum);
        setCurrentLesson(data.currentLesson);
        setProgress(data.progress);
      } finally {
        setIsLoadingCurriculum(false);
      }
    };

    loadCurriculum();
  }, [courseId]);

  const handleLessonClick = async (lesson: LessonItem) => {
    if (!courseId) return;
    await api.learning.setCurrentLesson(courseId, lesson.orderIndex);
    setCurrentLesson(lesson);
  };

  const handlePreviousLesson = async () => {
    if (!currentLesson || !courseId) return;
    const allLessons = curriculum.flatMap((s) => s.items);
    const idx = allLessons.findIndex((l) => l.id === currentLesson.id);
    if (idx <= 0) return;
    const prev = allLessons[idx - 1];
    setCurrentLesson(prev);
    await api.learning.setCurrentLesson(courseId, prev.orderIndex);
  };

  const handleMarkComplete = async () => {
    if (!currentLesson || !courseId) return;
    await api.learning.completeLesson(currentLesson.id);
    const data = await api.learning.getCurriculum(courseId);
    setCurriculum(data.curriculum);
    setProgress(data.progress);
    const allLessons = data.curriculum.flatMap((s) => s.items);
    const idx = allLessons.findIndex((l) => l.id === currentLesson.id);
    if (idx >= 0 && idx < allLessons.length - 1) {
      const next = allLessons[idx + 1];
      setCurrentLesson(next);
      await api.learning.setCurrentLesson(courseId, next.orderIndex);
    }
  };

  const handleSelectQuizOption = (q: number, option: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [q]: option }));
  };

  const handleSubmitQuiz = () => {
    if (!quizQuestions.length) return;
    if (Object.keys(selectedAnswers).length < quizQuestions.length) return;
    setQuizSubmitted(true);
  };

  if (isLoading || !isAuthenticated || isLoadingCurriculum) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <header className="h-16 bg-white border-b flex items-center px-4 gap-3">
        <button
          onClick={() => router.push("/ai-dashboard")}
          className="p-2 hover:bg-slate-100 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="h-6 w-px bg-slate-200" />
        <h1 className="text-sm font-semibold">{courseTitle}</h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {isSidebarOpen && (
          <aside className="w-80 bg-white border-r overflow-y-auto">
            <div className="p-3 border-b flex items-center gap-2">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="text-sm font-semibold">
                Course Content ({progress.completed}/{progress.total})
              </div>
            </div>
            <div className="p-3 space-y-2">
              {curriculum.map((section) => (
                <div
                  key={section.id}
                  className="border rounded-xl overflow-hidden"
                >
                  <button
                    className="w-full px-3 py-2 flex justify-between"
                    onClick={() =>
                      setExpandedDays((p) => ({
                        ...p,
                        [section.id]: !p[section.id],
                      }))
                    }
                  >
                    <span className="text-sm font-semibold">
                      {section.day} - {section.title}
                    </span>
                    {expandedDays[section.id] ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {expandedDays[section.id] && (
                    <div className="px-2 pb-2 space-y-1">
                      {section.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleLessonClick(item)}
                          className="w-full text-left p-2 rounded hover:bg-slate-50 flex gap-2"
                        >
                          {item.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                          ) : item.type === "quiz" ? (
                            <HelpCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                          ) : item.type === "reading" ? (
                            <FileText className="w-4 h-4 mt-0.5" />
                          ) : (
                            <Play className="w-4 h-4 mt-0.5" />
                          )}
                          <span className="text-xs">{item.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}

        {!isSidebarOpen && (
          <button
            className="absolute left-3 top-20 p-2 bg-white rounded border"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <main className="flex-1 overflow-y-auto p-6">
          {currentLesson?.videoUrl ? (
            <div className="w-full aspect-video rounded-xl bg-black overflow-hidden mb-6">
              <SmartVideoPlayer
                videoUrl={currentLesson.videoUrl}
                title={currentLesson.title}
              />
            </div>
          ) : (
            <div className="w-full aspect-video rounded-xl bg-slate-200 flex items-center justify-center mb-6">
              <Video className="w-10 h-10 text-slate-400" />
            </div>
          )}

          <div className="flex justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">
                {currentLesson?.title || "No lesson selected"}
              </h2>
              <p className="text-xs text-slate-500">
                {currentLesson?.type || "unknown"} ·{" "}
                {currentLesson?.duration || "N/A"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePreviousLesson}
                className="px-4 py-2 bg-slate-200 rounded-lg text-sm font-semibold inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={handleMarkComplete}
                disabled={isQuizLesson && !quizSubmitted}
                className="px-4 py-2 bg-indigo-600 disabled:bg-indigo-400 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isQuizLesson && quizQuestions.length > 0 && (
            <div className="bg-white rounded-xl border p-4 mb-6">
              <h3 className="text-sm font-semibold mb-3">Quiz</h3>
              {quizQuestions.map((q, i) => (
                <div key={q.id} className="mb-4">
                  <p className="text-sm font-medium mb-2">
                    {i + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        className={`w-full text-left px-3 py-2 border rounded ${
                          selectedAnswers[i] === oi
                            ? "bg-indigo-50 border-indigo-300"
                            : "border-slate-200"
                        }`}
                        onClick={() => handleSelectQuizOption(i, oi)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={handleSubmitQuiz}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold"
              >
                Submit Quiz
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold">Overview</h3>
            </div>
            <p className="text-slate-600 mb-4">
              {currentLesson?.description ||
                currentLesson?.content ||
                "No description available."}
            </p>
            {(currentLesson?.objectives?.length ?? 0) > 0 && (
              <div className="bg-indigo-50 rounded-lg border border-indigo-100 p-4">
                <h4 className="text-sm font-semibold mb-2">
                  Learning Objectives
                </h4>
                <ul className="space-y-2 text-sm">
                  {currentLesson?.objectives.map((objective, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
        <div className="h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      }
    >
      <LearningPageContent />
    </Suspense>
  );
}
