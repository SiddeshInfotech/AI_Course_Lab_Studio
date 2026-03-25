/* eslint-disable react/no-unknown-property */
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
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Pause,
  Loader,
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

// Enhanced video player component for database-stored videos
const DatabaseVideoPlayer = ({
  videoUrl,
  title,
  className = "",
}: {
  videoUrl: string;
  title: string;
  className?: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlExpiresAt, setUrlExpiresAt] = useState<string | null>(null);

  // Extract media ID from video URL (e.g., "/api/media/123" → "123")
  const getMediaIdFromUrl = (url: string): number | null => {
    const match = url.match(/\/api\/media\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  // Get signed URL for secure video access
  const getSignedUrl = async (mediaId: number): Promise<string | null> => {
    try {
      console.log(`🔄 Getting signed URL for media ID: ${mediaId}`);
      const result = await api.admin.getSignedUrl(mediaId);
      console.log(`✅ Signed URL received:`, result);
      setUrlExpiresAt(result.expiresAt);
      return result.url;
    } catch (error) {
      console.error("❌ Failed to get signed URL:", error);
      setError("Failed to load video. Authentication error.");
      return null;
    }
  };

  // Check if URL needs refresh (expires soon)
  const needsUrlRefresh = (): boolean => {
    if (!urlExpiresAt) return true;
    const expiryTime = new Date(urlExpiresAt).getTime();
    const currentTime = Date.now();
    // Refresh if expires within 5 minutes
    return (expiryTime - currentTime) < 5 * 60 * 1000;
  };

  // Initialize or refresh the signed URL
  const initializeVideoUrl = async () => {
    console.log(`🎬 Initializing video URL: ${videoUrl}`);
    const mediaId = getMediaIdFromUrl(videoUrl);
    if (!mediaId) {
      console.error(`❌ Invalid video URL format: ${videoUrl}`);
      setError("Invalid video URL format");
      setIsLoading(false);
      return;
    }

    console.log(`📹 Extracted media ID: ${mediaId}`);

    if (!signedUrl || needsUrlRefresh()) {
      console.log(`🔄 Need to get new signed URL (current: ${signedUrl ? 'exists' : 'none'})`);
      setIsLoading(true);
      const newSignedUrl = await getSignedUrl(mediaId);
      if (newSignedUrl) {
        console.log(`✅ Setting signed URL: ${newSignedUrl}`);
        setSignedUrl(newSignedUrl);
        setError(null);
      } else {
        console.error(`❌ Failed to get signed URL for media ${mediaId}`);
      }
      setIsLoading(false);
    } else {
      console.log(`✅ Using existing signed URL: ${signedUrl}`);
    }
  };

  // Initialize signed URL on mount and when videoUrl changes
  useEffect(() => {
    initializeVideoUrl();
  }, [videoUrl]);

  // Auto-refresh URL before expiry
  useEffect(() => {
    if (!urlExpiresAt) return;

    const expiryTime = new Date(urlExpiresAt).getTime();
    const currentTime = Date.now();
    const timeUntilRefresh = Math.max(0, (expiryTime - currentTime) - 5 * 60 * 1000); // Refresh 5 min before expiry

    const timeout = setTimeout(() => {
      initializeVideoUrl();
    }, timeUntilRefresh);

    return () => clearTimeout(timeout);
  }, [urlExpiresAt]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setIsLoading(false);
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleError = () => {
      // If URL might be expired, try refreshing it
      if (needsUrlRefresh()) {
        console.log("Video error - attempting URL refresh");
        initializeVideoUrl();
      } else {
        setError("Failed to load video. Please try again.");
        setIsLoading(false);
      }
    };

    const handleLoadStart = () => {
      if (signedUrl) setIsLoading(true);
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("error", handleError);
    video.addEventListener("loadstart", handleLoadStart);

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadstart", handleLoadStart);
    };
  }, [signedUrl]); // Re-attach listeners when signed URL changes

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isFullscreen) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progressBar = e.currentTarget;
    if (!video || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    video.currentTime = newTime;
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(
      0,
      Math.min(duration, video.currentTime + seconds),
    );
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-900 ${className}`}
      >
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 text-sm mb-2">Video Error</p>
          <p className="text-slate-400 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black group ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        preload="metadata"
        playsInline
        onContextMenu={(e) => e.preventDefault()}
        key={signedUrl} // Force reload when URL changes
      >
        {signedUrl && (
          <source src={signedUrl} type="video/mp4" />
        )}
        <p className="text-white text-center p-4">
          Your browser doesn't support video playback.
        </p>
      </video>

      {/* Loading Overlay */}
      {(isLoading || !signedUrl) && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-center">
            <Loader className="w-8 h-8 text-white mx-auto mb-2 animate-spin" />
            <p className="text-white text-sm">
              {!signedUrl ? "Preparing video..." : "Loading video..."}
            </p>
          </div>
        </div>
      )}

      {/* Video Controls */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Play/Pause Overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          {!isPlaying && !isLoading && (
            <div className="bg-black bg-opacity-50 rounded-full p-4">
              <Play className="w-12 h-12 text-white" fill="white" />
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-4">
          {/* Progress Bar */}
          <div
            className="w-full h-1 bg-gray-600 rounded-full cursor-pointer mb-4"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="text-white hover:text-blue-400 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" fill="white" />
                )}
              </button>

              <button
                onClick={() => skip(-10)}
                className="text-white hover:text-blue-400 transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={() => skip(10)}
                className="text-white hover:text-blue-400 transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={toggleMute}
                className="text-white hover:text-blue-400 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-blue-400 transition-colors"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// YouTube video player component (existing logic)
const YouTubeVideoPlayer = ({
  videoUrl,
  title,
  className = "",
}: {
  videoUrl: string;
  title: string;
  className?: string;
}) => {
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

  const videoId = getYouTubeId(videoUrl);

  if (!videoId) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-900 ${className}`}
      >
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-400 text-sm">Invalid YouTube URL</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-black ${className}`}>
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&modestbranding=1&rel=0&fs=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
};

// Smart video player that detects video type
const SmartVideoPlayer = ({
  videoUrl,
  title,
}: {
  videoUrl: string;
  title: string;
}) => {
  // Detect video type
  const isDataBaseVideo =
    videoUrl.startsWith("/api/media/") || videoUrl.includes("/api/media/");
  const isYouTubeVideo =
    videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");

  const playerClassName = "w-full h-full";

  if (isDataBaseVideo) {
    return (
      <DatabaseVideoPlayer
        videoUrl={videoUrl}
        title={title}
        className={playerClassName}
      />
    );
  } else if (isYouTubeVideo) {
    return (
      <YouTubeVideoPlayer
        videoUrl={videoUrl}
        title={title}
        className={playerClassName}
      />
    );
  } else {
    // Handle other video URLs (Vimeo, direct video files, etc.)
    return (
      <div
        className={`flex items-center justify-center bg-slate-900 ${playerClassName}`}
      >
        <div className="text-center">
          <Video className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400 text-sm mb-2">
            Unsupported Video Format
          </p>
          <p className="text-slate-500 text-xs">
            Please use YouTube videos or upload videos through the admin panel
          </p>
        </div>
      </div>
    );
  }
};

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
            {/* Enhanced Video Player Container - Supports Database & YouTube Videos */}
            {currentLesson?.videoUrl ? (
              <div
                className="w-full aspect-video bg-slate-900 rounded-2xl shadow-xl relative overflow-hidden border border-slate-800 mb-6"
                onContextMenu={(e) => {
                  e.preventDefault();
                  return false;
                }}
              >
                <SmartVideoPlayer
                  videoUrl={currentLesson.videoUrl}
                  title={currentLesson.title}
                />

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
