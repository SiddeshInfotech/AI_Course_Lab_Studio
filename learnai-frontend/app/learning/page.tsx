"use client";

import {
  useEffect,
  useMemo,
  useState,
  Suspense,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Code,
  ExternalLink,
  FileText,
  Globe,
  HelpCircle,
  Loader,
  Lock,
  Menu,
  Minimize,
  Play,
  Video,
  Volume2,
  VolumeX,
  AlertCircle,
  AlertTriangle,
  Maximize,
  Pause,
  Sparkles,
  Target,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiResponseError } from "@/lib/api";
import { useVideoProtection } from "@/hooks/useVideoProtection";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api$/, "") ||
  "http://localhost:5001";

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
  audioTracks?: string | null;
  languages?: {
    english?: string | null;
    hindi?: string | null;
    marathi?: string | null;
  };
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
  unifiedVideoUrl?: string | null;
  audioTracks?: string | null;
  languages?: {
    english?: string | null;
    hindi?: string | null;
    marathi?: string | null;
  };
  objectives: string[];
  orderIndex: number;
  completed?: boolean;
  active?: boolean;
}

interface QuizQuestion {
  id: string | number;
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string | null;
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
            (opt: string) =>
              opt.trim().toLowerCase() === q.answer.trim().toLowerCase(),
          );
        } else if (typeof q?.correctAnswer === "string") {
          answerIndex = options.findIndex(
            (opt: string) =>
              opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase(),
          );
        }

        if (answerIndex < 0 || answerIndex >= options.length) return null;

        return {
          id: q?.id ?? idx + 1,
          question: typeof q?.question === "string" ? q.question : `Question ${idx + 1}`,
          options,
          answerIndex,
          explanation:
            typeof q?.explanation === "string" ? q.explanation : null,
        } as QuizQuestion;
      })
      .filter(Boolean) as QuizQuestion[];
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

const isBackendHostedVideo = (url: string): boolean =>
  url.startsWith("/uploads/") ||
  url.includes("/uploads/") ||
  url.startsWith("/api/media/") ||
  url.includes("/api/media/");

const getMediaIdFromUrl = (url: string): string | null => {
  const match = url.match(/\/media\/(\d+)/);
  return match ? match[1] : null;
};

const addWatermarkToVideo = (
  video: HTMLVideoElement,
  container: HTMLElement,
  config: {
    text: string;
    fontSize: number;
    color: string;
    opacity: number;
    interval: number;
  },
): (() => void) => {
  const watermark = document.createElement("div");
  watermark.className = "video-watermark";
  watermark.textContent = config.text;
  watermark.style.cssText = `
    position: absolute;
    font-size: ${config.fontSize}px;
    color: ${config.color};
    opacity: ${config.opacity};
    pointer-events: none;
    z-index: 10;
    font-family: Arial, sans-serif;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
  `;
  container.appendChild(watermark);

  let posX = 0;
  let posY = 0;
  let dirX = 1;
  let dirY = 1;

  const animate = () => {
    posX += dirX * 2;
    posY += dirY * 2;
    const maxX = container.clientWidth - watermark.clientWidth - 20;
    const maxY = container.clientHeight - watermark.clientHeight - 20;
    if (posX >= maxX || posX <= 0) dirX *= -1;
    if (posY >= maxY || posY <= 0) dirY *= -1;
    watermark.style.left = `${posX}px`;
    watermark.style.top = `${posY}px`;
  };

  const interval = setInterval(animate, config.interval);
  animate();

  return () => {
    clearInterval(interval);
    watermark.remove();
  };
};

const getWatermarkConfig = (
  userId: string,
  username: string,
  showId: boolean,
) => {
  const displayText = showId ? `${username} (ID: ${userId})` : username;
  return {
    text: displayText,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    opacity: 0.6,
    interval: 120,
  };
};

interface AudioTrack {
  language: string;
  label: string;
  audioUrl: string;
}

interface LessonVideoPlayerState {
  isPlaying: boolean;
  isFullscreen: boolean;
  isLoading: boolean;
  canControl: boolean;
  error: string | null;
}

interface LessonVideoPlayerHandle {
  togglePlay: () => void;
  toggleFullscreen: () => void;
}

const DEFAULT_LESSON_VIDEO_PLAYER_STATE: LessonVideoPlayerState = {
  isPlaying: false,
  isFullscreen: false,
  isLoading: true,
  canControl: false,
  error: null,
};

const DatabaseVideoPlayer = forwardRef<
  LessonVideoPlayerHandle,
  {
    videoUrl: string;
    title: string;
    className?: string;
    onStateChange?: (state: LessonVideoPlayerState) => void;
    onWatchThresholdMet?: (met: boolean) => void;
    watermarkText?: string;
    audioTracks?: AudioTrack[];
    preferredAudioTrack?: number;
    onAudioTrackChange?: (trackIndex: number) => void;
  }
>(function DatabaseVideoPlayer(
  {
    videoUrl,
    title,
    className = "",
    onStateChange,
    onWatchThresholdMet,
    watermarkText,
    audioTracks = [],
    preferredAudioTrack = 0,
    onAudioTrackChange,
  },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxTimeReachedRef = useRef(0);
  const thresholdNotifiedRef = useRef(false);
  const cleanupWatermarkRef = useRef<(() => void) | null>(null);
  const isFullscreenRef = useRef(false);
  const audioStartTimeRef = useRef(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDomFullscreen, setIsDomFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(0);
  const [showAudioSelector, setShowAudioSelector] = useState(false);

  const [isLimitExceeded, setIsLimitExceeded] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isCheckingLimit, setIsCheckingLimit] = useState(false);

  const parsedAudioTracks = Array.isArray(audioTracks)
    ? audioTracks
    : typeof audioTracks === "string" && audioTracks
    ? JSON.parse(audioTracks)
    : [];

  const hasAudioTracks = parsedAudioTracks.length > 0;

  useEffect(() => {
    if (preferredAudioTrack !== undefined && preferredAudioTrack !== null) {
      setCurrentAudioTrack(preferredAudioTrack);
    }
  }, [preferredAudioTrack]);

  const checkUsageLimit = async () => {
    try {
      setIsCheckingLimit(true);
      const usageData = await api.usage.getStatus();
      setRemainingTime(usageData.remainingSeconds);
      setIsLimitExceeded(usageData.isLocked);
      return !usageData.isLocked;
    } catch (error) {
      console.error("Failed to check usage limit:", error);
      return true;
    } finally {
      setIsCheckingLimit(false);
    }
  };

  const sendHeartbeat = async () => {
    try {
      const result = await api.usage.sendHeartbeat();
      setRemainingTime(result.remainingSeconds);
      if (result.isLocked) {
        setIsLimitExceeded(true);
        const video = videoRef.current;
        if (video) {
          video.pause();
        }
      }
    } catch (error) {
      console.error("Failed to send heartbeat:", error);
    }
  };

  const startHeartbeat = () => {
    if (heartbeatIntervalRef.current) return;
    sendHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 30000);
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) {
      console.error("Video ref is null");
      return;
    }

    if (isPlaying) {
      video.pause();
      stopHeartbeat();
    } else {
      const canPlay = await checkUsageLimit();

      if (!canPlay) {
        setError(
          "You've reached your daily video watch limit of 2 hours. Come back tomorrow!",
        );
        return;
      }

      video.play().catch((err) => {
        console.error("Play failed:", err);
        setError("Failed to play video. Please try again.");
      });

      startHeartbeat();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.muted = false;
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    const video = videoRef.current;
    if (!video) return;

    video.volume = newVolume;
    if (newVolume > 0 && isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const toggleFullscreen = async () => {
    const video = videoRef.current;
    const container = containerRef.current;

    if (!video || !container) return;

    const isAlreadyFullscreen =
      document.fullscreenElement !== null ||
      (document as any).webkitFullscreenElement !== null ||
      document.pictureInPictureElement !== null;

    try {
      if (!isAlreadyFullscreen) {
        const requestFullscreen =
          video.requestFullscreen ||
          (video as any).webkitRequestFullscreen ||
          (video as any).webkitEnterFullscreen;

        if (requestFullscreen) {
          await requestFullscreen.call(video);
        } else {
          const containerRequest =
            container.requestFullscreen ||
            (container as any).webkitRequestFullscreen;

          if (containerRequest) {
            await containerRequest.call(container);
          }
        }
      } else {
        const exitFullscreen =
          document.exitFullscreen || (document as any).webkitExitFullscreen;

        if (exitFullscreen) {
          await exitFullscreen.call(document);
        }
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      togglePlay,
      toggleFullscreen,
    }),
    [togglePlay],
  );

  useEffect(() => {
    onStateChange?.({
      isPlaying,
      isFullscreen,
      isLoading,
      canControl: Boolean(resolvedVideoUrl) && !error,
      error,
    });
  }, [
    error,
    isFullscreen,
    isLoading,
    isPlaying,
    onStateChange,
    resolvedVideoUrl,
  ]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs =
        document.fullscreenElement !== null ||
        (document as any).webkitFullscreenElement !== null;

      setIsFullscreen(isFs);
      isFullscreenRef.current = isFs;
      setIsDomFullscreen(isFs);

      const container = containerRef.current;
      if (container) {
        if (isFs) {
          container.style.overflow = "visible";
          container.style.position = "fixed";
          container.style.top = "0";
          container.style.left = "0";
          container.style.width = "100vw";
          container.style.height = "100vh";
          container.style.zIndex = "999999";
          container.style.maxWidth = "100vw";
          container.style.maxHeight = "100vh";
          container.classList.remove(
            "rounded-2xl",
            "border",
            "border-slate-800",
          );
        } else {
          container.style.overflow = "";
          container.style.position = "";
          container.style.top = "";
          container.style.left = "";
          container.style.width = "";
          container.style.height = "";
          container.style.zIndex = "";
          container.style.maxWidth = "";
          container.style.maxHeight = "";
          container.classList.add("rounded-2xl", "border", "border-slate-800");
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      onStateChange?.(DEFAULT_LESSON_VIDEO_PLAYER_STATE);
    };
  }, [onStateChange]);

  useEffect(() => {
    let isActive = true;

    const resolveVideoUrl = async () => {
      setError(null);
      setIsLoading(true);
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      maxTimeReachedRef.current = 0;

      if (!videoUrl || videoUrl === "null" || videoUrl === "undefined") {
        setResolvedVideoUrl(null);
        setIsLoading(false);
        return;
      }

      try {
        const mediaId = getMediaIdFromUrl(videoUrl);

        if (mediaId) {
          const signedMedia = await api.admin.getSignedUrl(Number(mediaId));
          if (isActive) {
            setResolvedVideoUrl(signedMedia.url);
            setIsLoading(false);
          }
          return;
        }

        if (videoUrl.startsWith("/")) {
          const fullUrl = `${API_ORIGIN}${videoUrl}`;
          if (isActive) {
            setResolvedVideoUrl(fullUrl);
            setIsLoading(false);
          }
          return;
        }

        if (isActive) {
          if (videoUrl.startsWith("http") || videoUrl.startsWith("/")) {
            setResolvedVideoUrl(videoUrl);
            setIsLoading(false);
          } else {
            setError("Invalid video URL format");
            setIsLoading(false);
          }
        }
      } catch (resolveError) {
        console.error("Failed to resolve video URL:", resolveError);
        if (isActive) {
          setResolvedVideoUrl(null);
          setError("Failed to prepare video. Please try again.");
          setIsLoading(false);
        }
      }
    };

    resolveVideoUrl();

    return () => {
      isActive = false;
    };
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!resolvedVideoUrl) return;

    const handleLoadedData = () => {
      setIsLoading(false);
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
      if (video.currentTime > maxTimeReachedRef.current) {
        maxTimeReachedRef.current = video.currentTime;
      }

      const thresholdSeconds = Math.max(video.duration - 40, video.duration * 0.85);
      if (
        video.duration > 0 &&
        video.currentTime >= thresholdSeconds &&
        !thresholdNotifiedRef.current
      ) {
        thresholdNotifiedRef.current = true;
        onWatchThresholdMet?.(true);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      startHeartbeat();
    };
    const handlePause = () => {
      setIsPlaying(false);
      stopHeartbeat();
    };

    const handleError = (e: Event) => {
      const video = e.target as HTMLVideoElement;
      const videoError = video?.error;
      setError("Failed to load video. Please try again.");
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleSeeking = () => {
      if (video.currentTime > maxTimeReachedRef.current) {
        video.currentTime = maxTimeReachedRef.current;
      }
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("error", handleError);
    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("seeking", handleSeeking);

    video.load();

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("seeking", handleSeeking);
    };
  }, [resolvedVideoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;

    if (!video || !container) return;

    const getUserInfo = async () => {
      try {
        const { user } = await api.auth.me();
        setUserId(user.id.toString());

        const watermarkConfig = getWatermarkConfig(
          user.id.toString(),
          user.username || user.email,
          false,
        );
        const cleanup = addWatermarkToVideo(video, container, watermarkConfig);
        cleanupWatermarkRef.current = cleanup;
      } catch (error) {
        console.error("Failed to get user info for watermark:", error);
      }
    };

    getUserInfo();

    return () => {
      if (cleanupWatermarkRef.current) {
        cleanupWatermarkRef.current();
      }
    };
  }, []);

  useEffect(() => {
    checkUsageLimit();

    return () => {
      stopHeartbeat();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationId: number;
    let lastCheckedTime = 0;

    const monitorSeeking = () => {
      if (
        video.currentTime > maxTimeReachedRef.current &&
        Math.abs(video.currentTime - lastCheckedTime) > 0.1
      ) {
        video.currentTime = maxTimeReachedRef.current;
      }
      lastCheckedTime = video.currentTime;
      animationId = requestAnimationFrame(monitorSeeking);
    };

    animationId = requestAnimationFrame(monitorSeeking);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progressBar = e.currentTarget;
    if (!video || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;

    if (newTime <= maxTimeReachedRef.current) {
      video.currentTime = newTime;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleAudioTrackSwitch = (trackIndex: number) => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (!video || !audio) return;

    const wasPlaying = !video.paused;
    const currentVideoTime = video.currentTime;

    audioStartTimeRef.current = currentVideoTime;

    setCurrentAudioTrack(trackIndex);
    onAudioTrackChange?.(trackIndex);
    setShowAudioSelector(false);

    if (wasPlaying) {
      audio.currentTime = currentVideoTime;
      audio.play().catch(console.error);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (!video || !audio || !hasAudioTracks) return;

    const syncAudio = () => {
      if (
        audio.paused &&
        !video.paused &&
        video.currentTime >= audioStartTimeRef.current
      ) {
        audio.currentTime = video.currentTime;
        audio.play().catch(console.error);
      }

      if (video.paused && !audio.paused) {
        audio.pause();
      }

      if (!audio.paused && audio.currentTime > video.currentTime + 0.5) {
        audio.currentTime = video.currentTime;
      }
    };

    const handleVideoPlay = () => {
      if (hasAudioTracks && parsedAudioTracks[currentAudioTrack]) {
        audio.currentTime = video.currentTime;
        audio.play().catch(console.error);
      }
    };

    const handleVideoPause = () => {
      if (hasAudioTracks) {
        audio.pause();
      }
    };

    const handleVideoSeeked = () => {
      if (hasAudioTracks) {
        audioStartTimeRef.current = video.currentTime;
        audio.currentTime = video.currentTime;
      }
    };

    const handleVideoEnded = () => {
      if (hasAudioTracks) {
        audio.pause();
      }
    };

    const handleAudioEnded = () => {
      video.pause();
    };

    const intervalId = setInterval(syncAudio, 100);

    video.addEventListener("play", handleVideoPlay);
    video.addEventListener("pause", handleVideoPause);
    video.addEventListener("seeked", handleVideoSeeked);
    video.addEventListener("ended", handleVideoEnded);
    audio.addEventListener("ended", handleAudioEnded);

    return () => {
      clearInterval(intervalId);
      video.removeEventListener("play", handleVideoPlay);
      video.removeEventListener("pause", handleVideoPause);
      video.removeEventListener("seeked", handleVideoSeeked);
      video.removeEventListener("ended", handleVideoEnded);
      audio.removeEventListener("ended", handleAudioEnded);
    };
  }, [hasAudioTracks, parsedAudioTracks, currentAudioTrack]);

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
    <div ref={containerRef} className={`bg-black group relative ${className}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFullscreen();
        }}
        className="absolute top-4 right-4 z-50 flex items-center gap-1.5 rounded-lg bg-black/70 hover:bg-black/90 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-all"
        title={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
        type="button"
      >
        {isFullscreen ? (
          <Minimize className="w-4 h-4" />
        ) : (
          <Maximize className="w-4 h-4" />
        )}
        {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      </button>

      <video
        ref={videoRef}
        className={`w-full h-full ${
          isFullscreen ? "object-contain" : "object-contain"
        }`}
        preload="metadata"
        controls
        onContextMenu={(e) => e.preventDefault()}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        src={resolvedVideoUrl || undefined}
        crossOrigin="anonymous"
      >
        <p className="text-white text-center p-4">
          Your browser doesn't support video playback.
        </p>
      </video>

      {hasAudioTracks && parsedAudioTracks[currentAudioTrack] && (
        <audio
          ref={audioRef}
          src={parsedAudioTracks[currentAudioTrack].audioUrl}
          preload="metadata"
        />
      )}

      {hasAudioTracks && (
        <div
          className={`absolute top-4 left-4 z-20 ${
            isFullscreen ? "opacity-0 group-hover:opacity-100" : ""
          } transition-opacity`}
        >
          <button
            onClick={() => setShowAudioSelector(!showAudioSelector)}
            className="flex items-center gap-2 rounded-lg bg-black/60 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/80"
            title="Change audio track"
          >
            <Globe className="w-4 h-4" />
            <span>
              {parsedAudioTracks[currentAudioTrack]?.label || "Audio"}
            </span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showAudioSelector && (
            <div className="absolute top-full left-0 mt-2 bg-black/90 backdrop-blur-sm rounded-lg overflow-hidden shadow-xl min-w-[150px]">
              {parsedAudioTracks.map((track: AudioTrack, index: number) => (
                <button
                  key={track.language}
                  onClick={() => handleAudioTrackSwitch(index)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    index === currentAudioTrack
                      ? "bg-indigo-600 text-white"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{track.label}</span>
                    {index === currentAudioTrack && (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(isLoading || !resolvedVideoUrl) && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 pointer-events-none">
          <div className="text-center">
            <Loader className="w-8 h-8 text-white mx-auto mb-2 animate-spin" />
            <p className="text-white text-sm">
              {!resolvedVideoUrl ? "Preparing video..." : "Loading video..."}
            </p>
          </div>
        </div>
      )}

      {isLimitExceeded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-30">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Daily Watch Limit Reached
            </h3>
            <p className="text-slate-300 mb-4">
              You've used your 2-hour daily video watch limit. Your progress has
              been saved.
            </p>
            <p className="text-sm text-slate-400">
              Come back tomorrow to continue learning!
            </p>
          </div>
        </div>
      )}
      {watermarkText && (
        <div className="pointer-events-none absolute inset-0 z-20 select-none">
          {[
            { top: 16, left: 8, angle: -20 },
            { top: 34, left: 54, angle: -18 },
            { top: 50, left: 12, angle: -20 },
            { top: 66, left: 58, angle: -18 },
            { top: 82, left: 18, angle: -20 },
          ].map((wm, idx) => (
            <span
              key={`wm-${idx}`}
              className="absolute text-[10px] md:text-[11px] text-white/35 font-semibold tracking-[0.12em] uppercase"
              style={{
                top: `${wm.top}%`,
                left: `${wm.left}%`,
                transform: `translate(-2%, -50%) rotate(${wm.angle}deg)`,
                textShadow: "0 1px 2px rgba(0,0,0,0.55)",
                letterSpacing: "0.08em",
              }}
            >
              {watermarkText}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

const YouTubeVideoPlayer = ({
  videoUrl,
  title,
  className = "",
}: {
  videoUrl: string;
  title: string;
  className?: string;
}) => {
  const [isLimitExceeded, setIsLimitExceeded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkUsageLimit = async () => {
    try {
      const usageData = await api.usage.getStatus();
      if (usageData.isLocked) {
        setIsLimitExceeded(true);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to check usage limit:", error);
      return true;
    }
  };

  const sendHeartbeat = async () => {
    try {
      const result = await api.usage.sendHeartbeat();
      if (result.isLocked) {
        setIsLimitExceeded(true);
        if (playerRef.current?.pauseVideo) {
          playerRef.current.pauseVideo();
        }
      }
    } catch (error) {
      console.error("Failed to send heartbeat:", error);
    }
  };

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

  useEffect(() => {
    const initYouTube = async () => {
      const canPlay = await checkUsageLimit();
      if (!canPlay) {
        setIsLimitExceeded(true);
        return;
      }
      setIsReady(true);

      sendHeartbeat();
      heartbeatIntervalRef.current = setInterval(() => {
        sendHeartbeat();
      }, 30000);
    };

    initYouTube();

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [videoUrl]);

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
    <div className={`bg-black relative ${className}`}>
      {isLimitExceeded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-30">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Daily Watch Limit Reached
            </h3>
            <p className="text-slate-300 mb-4">
              You've used your 2-hour daily video watch limit. Your progress has
              been saved.
            </p>
            <p className="text-sm text-slate-400">
              Come back tomorrow to continue learning!
            </p>
          </div>
        </div>
      )}

      {!isReady && !isLimitExceeded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {isReady && !isLimitExceeded && (
        <iframe
          ref={playerRef as any}
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&modestbranding=1&rel=0&fs=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      )}
    </div>
  );
};

function LearningPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuth();

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
  const [quizScore, setQuizScore] = useState<{
    correct: number;
    total: number;
    percentage: number;
  } | null>(null);
  const [activeDemoQuizSectionId, setActiveDemoQuizSectionId] = useState<
    string | null
  >(null);
  const [selectedLanguage, setSelectedLanguage] = useState<
    "english" | "hindi" | "marathi"
  >("english");
  const [isLoadingLanguage, setIsLoadingLanguage] = useState(false);
  const [licenseInvalidReason, setLicenseInvalidReason] = useState<
    string | null
  >(null);
  const [lessonVideoPlayerState, setLessonVideoPlayerState] = useState<
    LessonVideoPlayerState
  >(DEFAULT_LESSON_VIDEO_PLAYER_STATE);
  const lessonVideoPlayerRef = useRef<LessonVideoPlayerHandle>(null);
  const [watermarkTime, setWatermarkTime] = useState(
    () => new Date().toLocaleString(),
  );
  const [canMarkComplete, setCanMarkComplete] = useState(true);

  const quizQuestions = useMemo(
    () => parseQuizQuestions(currentLesson?.content || null),
    [currentLesson?.id, currentLesson?.content],
  );

  const isQuizLesson = currentLesson?.type?.toLowerCase() === "quiz";

  const isControllableCurrentVideo =
    currentLesson?.videoUrl && isBackendHostedVideo(currentLesson.videoUrl);

  const isTrackableVideo = (url?: string | null): boolean =>
    !!url &&
    (url.startsWith("/uploads/") ||
      url.includes("/uploads/") ||
      url.startsWith("/api/media/") ||
      url.includes("/api/media/"));

  useEffect(() => {
    if (!isControllableCurrentVideo) {
      setLessonVideoPlayerState(DEFAULT_LESSON_VIDEO_PLAYER_STATE);
    }
  }, [currentLesson?.id, currentLesson?.videoUrl, isControllableCurrentVideo]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/");
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setWatermarkTime(new Date().toLocaleString());
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setCanMarkComplete(!isTrackableVideo(currentLesson?.videoUrl));
  }, [currentLesson?.id, currentLesson?.videoUrl]);

  useEffect(() => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setActiveDemoQuizSectionId(null);
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

  useEffect(() => {
    if (!courseId || !isAuthenticated) return;

    const validateCourseAccess = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const baseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";
        const response = await fetch(
          `${baseUrl}/license/validate?courseId=${courseId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) return;

        const data = await response.json();
        if (!data.licensesValid) {
          setLicenseInvalidReason(
            data.message || "Course access has been revoked",
          );
        } else {
          setLicenseInvalidReason(null);
        }
      } catch (error) {
        console.error("Error validating license:", error);
      }
    };

    validateCourseAccess();
    const interval = setInterval(validateCourseAccess, 30000);

    return () => clearInterval(interval);
  }, [courseId, isAuthenticated]);

  const isDayCompleted = (dayIndex: number): boolean => {
    if (dayIndex < 0 || !curriculum[dayIndex]) return false;
    const dayLessons = curriculum[dayIndex].items;
    return dayLessons.length > 0 && dayLessons.every((item) => item.completed);
  };

  const getCurrentDayIndex = (): number => {
    if (!currentLesson) return 0;
    const dayIndex = curriculum.findIndex((section) =>
      section.items.some((item) => item.id === currentLesson.id),
    );
    return dayIndex >= 0 ? dayIndex : 0;
  };

  const getFirstUnlockedDayIndex = (): number => {
    for (let i = 0; i < curriculum.length; i++) {
      if (!isDayCompleted(i)) return i;
    }
    return curriculum.length - 1;
  };

  const isDayLocked = (dayIndex: number): boolean => {
    if (dayIndex === 0) return false;
    return !isDayCompleted(dayIndex - 1);
  };

  const isLessonLocked = (
    lesson: LessonItem,
    sectionIndex: number,
  ): boolean => {
    if (sectionIndex === 0) return false;
    return !isDayCompleted(sectionIndex - 1);
  };

  const getVideoUrlForLanguage = (
    lesson: CurrentLesson | LessonItem,
  ): string | null => {
    if (!lesson.languages) return lesson.videoUrl || null;
    const langKey = selectedLanguage as keyof typeof lesson.languages;
    const videoUrl = lesson.languages[langKey];
    if (!videoUrl && selectedLanguage !== "english") {
      return lesson.languages.english || lesson.videoUrl || null;
    }
    return videoUrl || lesson.videoUrl || null;
  };

  const handleLanguageChange = async (
    newLanguage: "english" | "hindi" | "marathi",
  ) => {
    if (!courseId || !currentLesson) return;

    try {
      setIsLoadingLanguage(true);
      await api.learning.setLanguagePreference(courseId, newLanguage);
      setSelectedLanguage(newLanguage);
      const newVideoUrl = getVideoUrlForLanguage({
        ...currentLesson,
        languages: currentLesson.languages,
      });
      setCurrentLesson({ ...currentLesson, videoUrl: newVideoUrl });
    } catch (error) {
      console.error("Failed to change language:", error);
    } finally {
      setIsLoadingLanguage(false);
    }
  };

  const toggleDay = (dayId: string) => {
    setExpandedDays((prev) => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  const handleLessonClick = async (lesson: LessonItem) => {
    if (!courseId) return;
    setActiveDemoQuizSectionId(null);

    const sectionIndex = curriculum.findIndex((section) =>
      section.items.some((item) => item.id === lesson.id),
    );

    if (isLessonLocked(lesson, sectionIndex)) {
      return;
    }

    try {
      await api.learning.setCurrentLesson(courseId, lesson.orderIndex);
      setCurrentLesson(lesson as CurrentLesson);
    } catch (error) {
      if (error instanceof ApiResponseError && error.status === 401) {
        return;
      }
      console.error("Failed to set current lesson:", error);
    }
  };

  const normalizeDayLabel = (dayLabel: string): string => {
    const match = dayLabel.match(/day\s*(\d+)/i);
    if (match?.[1]) return `Day ${match[1]}`;
    return dayLabel.trim();
  };

  const sanitizeSectionTitle = (title: string): string =>
    title
      .replace(/\(\s*text\s*(?:[-=]*>|→)\s*text\s*\)/gi, "")
      .replace(/\btext\s*(?:[-=]*>|→)\s*text\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  const getToolUrlFromTitle = (value: string): string | null => {
    const title = value.toLowerCase();
    if (title.includes("chatgpt")) return "https://chatgpt.com";
    if (title.includes("gemini")) return "https://gemini.google.com";
    if (title.includes("perplexity")) return "https://www.perplexity.ai";
    if (title.includes("claude")) return "https://claude.ai";
    if (title.includes("copilot")) return "https://copilot.microsoft.com";
    return null;
  };

  const currentToolUrl = useMemo(() => {
    const fromLesson = getToolUrlFromTitle(
      `${currentLesson?.title || ""} ${currentLesson?.description || ""}`,
    );
    if (fromLesson) return fromLesson;

    const activeSection = curriculum.find(
      (section) =>
        section.items.some((item) => item.id === currentLesson?.id) ||
        section.id === activeDemoQuizSectionId,
    );
    if (!activeSection) return null;

    return getToolUrlFromTitle(activeSection.title);
  }, [activeDemoQuizSectionId, currentLesson?.description, currentLesson?.id, currentLesson?.title, curriculum]);

  const handleOpenDemoQuiz = (section: CurriculumSection) => {
    setActiveDemoQuizSectionId(section.id);
    setCurrentLesson({
      id: -Math.max(1, parseInt(section.id.replace(/\D/g, ""), 10) || 1),
      title: `${normalizeDayLabel(section.day)} Quiz (Demo)`,
      type: "quiz",
      duration: "8 min",
      description:
        "This is a demo quiz preview because no real quiz lesson is configured for this day yet.",
      content: JSON.stringify({
        questions: [
          {
            id: 1,
            question: "What makes a good AI prompt?",
            options: [
              "Clear objective and context",
              "Very short random text",
              "No constraints",
              "Only emojis",
            ],
            answerIndex: 0,
          },
          {
            id: 2,
            question: "Why add output format instructions?",
            options: [
              "To reduce quality",
              "To guide response structure",
              "To disable AI reasoning",
              "No reason",
            ],
            answerIndex: 1,
          },
        ],
      }),
      videoUrl: null,
      objectives: ["Demo quiz flow validation"],
      orderIndex: 0,
    });
  };

  const getSectionQuizSourceItem = (
    section: CurriculumSection,
  ): LessonItem | null => {
    const explicitQuiz = section.items.find((item) => item.type === "quiz");
    if (explicitQuiz) return explicitQuiz;

    const contentQuizItem = section.items.find(
      (item) => parseQuizQuestions(item.content || null).length > 0,
    );
    return contentQuizItem || null;
  };

  const handleOpenSectionQuiz = (
    section: CurriculumSection,
    sourceItem: LessonItem | null,
  ) => {
    if (!sourceItem) {
      handleOpenDemoQuiz(section);
      return;
    }

    if (sourceItem.type === "quiz") {
      handleLessonClick(sourceItem);
      return;
    }

    setActiveDemoQuizSectionId(section.id);
    setCurrentLesson({
      ...sourceItem,
      type: "quiz",
      title: `${normalizeDayLabel(section.day)} Quiz`,
      duration: sourceItem.duration || "8 min",
      videoUrl: null,
      unifiedVideoUrl: null,
    });
  };

  const isDemoQuizLesson = !!currentLesson && currentLesson.id < 0;

  const canCompleteCurrentLesson =
    (!isDemoQuizLesson && !!currentLesson?.completed) ||
    (isQuizLesson
      ? quizSubmitted
      : !currentLesson?.videoUrl || canMarkComplete);

  const renderMediaSection = () => {
    if (isQuizLesson) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-slate-900">Quiz</h3>
            </div>
            {quizScore && (
              <div className="text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">
                Score: {quizScore.correct}/{quizScore.total} ({quizScore.percentage}%)
              </div>
            )}
          </div>

          {quizQuestions.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
              No quiz questions found for this lesson. Add quiz JSON in lesson content.
            </div>
          ) : (
            <div className="space-y-5">
              {quizQuestions.map((q, qIndex) => (
                <div key={q.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                  <p className="text-sm font-semibold text-slate-800 mb-3">
                    {qIndex + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((option, oIndex) => {
                      const isSelected = selectedAnswers[qIndex] === oIndex;
                      const isCorrect = quizSubmitted && q.answerIndex === oIndex;
                      const isWrongSelected = quizSubmitted && isSelected && q.answerIndex !== oIndex;

                      return (
                        <button
                          key={`${q.id}-${oIndex}`}
                          onClick={() => handleSelectQuizOption(qIndex, oIndex)}
                          disabled={quizSubmitted}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                            isCorrect ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                            : isWrongSelected ? "bg-red-50 border-red-300 text-red-900"
                            : isSelected ? "bg-indigo-50 border-indigo-300 text-indigo-900"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          } ${quizSubmitted ? "cursor-default" : "cursor-pointer"}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {quizSubmitted && q.explanation && (
                    <p className="mt-3 text-xs text-slate-600">{q.explanation}</p>
                  )}
                </div>
              ))}

              {!quizSubmitted && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={Object.keys(selectedAnswers).length < quizQuestions.length}
                    className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
                  >
                    Submit Quiz
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (currentVideoUrl || currentLesson?.unifiedVideoUrl) {
      return (
        <div
          className="w-full aspect-video bg-slate-900 rounded-2xl shadow-xl relative overflow-hidden border border-slate-800 mb-6"
          onContextMenu={(e) => { e.preventDefault(); return false; }}
        >
          {isControllableCurrentVideo ? (
            <DatabaseVideoPlayer
              ref={lessonVideoPlayerRef}
              videoUrl={currentVideoUrl || ""}
              title={currentLesson?.title || ""}
              className="w-full h-full"
              onStateChange={setLessonVideoPlayerState}
              onWatchThresholdMet={setCanMarkComplete}
              watermarkText={`${user?.email || user?.username || "Protected"} | ${watermarkTime}`}
              audioTracks={currentAudioTracks ? (typeof currentAudioTracks === "string" ? JSON.parse(currentAudioTracks) : currentAudioTracks) : []}
            />
          ) : currentVideoUrl?.includes("youtube.com") || currentVideoUrl?.includes("youtu.be") ? (
            <YouTubeVideoPlayer
              videoUrl={currentVideoUrl || ""}
              title={currentLesson?.title || ""}
              className="w-full h-full"
            />
          ) : (
            <video
              className="w-full h-full"
              src={currentVideoUrl || ""}
              controls
              preload="metadata"
              onContextMenu={(e) => e.preventDefault()}
              controlsList="nodownload noplaybackrate"
            />
          )}
          <canvas id="screenshotCanvas" className="hidden" onContextMenu={(e) => { e.preventDefault(); return false; }} />
        </div>
      );
    }

    return (
      <div className="w-full aspect-video bg-slate-200 rounded-2xl shadow-xl border border-slate-300 mb-6 flex flex-col items-center justify-center gap-3">
        <AlertCircle className="w-12 h-12 text-slate-400" />
        <p className="text-slate-600 font-medium">No video available for this lesson</p>
      </div>
    );
  };

  const handlePreviousLesson = async () => {
    if (!currentLesson || !courseId) return;
    const allLessons = curriculum.flatMap((s) => s.items);
    const idx = allLessons.findIndex((l) => l.id === currentLesson.id);
    if (idx <= 0) return;
    const prev = allLessons[idx - 1];
    setCurrentLesson(prev as CurrentLesson);
    await api.learning.setCurrentLesson(courseId, prev.orderIndex);
  };

  const handleMarkComplete = async () => {
    if (!currentLesson || !courseId) return;
    if (isDemoQuizLesson) return;

    try {
      await api.learning.completeLesson(currentLesson.id);

      const data = await api.learning.getCurriculum(courseId);
      setCurriculum(data.curriculum);
      setProgress(data.progress);

      const allLessons = curriculum.flatMap((section) => section.items);
      const currentIndex = allLessons.findIndex(
        (l) => l.id === currentLesson.id,
      );
      if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
        const nextLesson = allLessons[currentIndex + 1];
        setCurrentLesson(nextLesson as CurrentLesson);
        await api.learning.setCurrentLesson(courseId, nextLesson.orderIndex);
      }
    } catch (error) {
      if (error instanceof ApiResponseError && error.status === 401) {
        return;
      }
      console.error("Failed to mark lesson complete:", error);
    }
  };

  const handleSelectQuizOption = (q: number, option: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [q]: option }));
  };

  const handleSubmitQuiz = () => {
    if (!quizQuestions.length) return;

    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < quizQuestions.length) return;

    let correct = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answerIndex) {
        correct += 1;
      }
    });

    const total = quizQuestions.length;
    const percentage = Math.round((correct / total) * 100);
    setQuizScore({ correct, total, percentage });
    setQuizSubmitted(true);
  };

  if (isLoading || !isAuthenticated || isLoadingCurriculum) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const currentVideoUrl =
    currentLesson?.unifiedVideoUrl || getVideoUrlForLanguage(currentLesson!);
  const currentAudioTracks = currentLesson?.audioTracks;

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
            {courseTitle}
          </h1>
        </div>
      </header>

      {licenseInvalidReason && (
        <div className="bg-red-50 border-b border-red-200 px-4 md:px-6 py-3 flex items-center gap-3 shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">
              {licenseInvalidReason}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Your access to this course has been revoked. Please contact
              support.
            </p>
          </div>
          <button
            onClick={() => router.push("/ai-dashboard")}
            className="ml-4 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      )}

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
                    const dayLocked = isDayLocked(sectionIndex);
                    const isCurrentDay = sectionIndex === getCurrentDayIndex();
                    const dayCompleted = isDayCompleted(sectionIndex);

                    let lockMessage = "";
                    if (dayLocked) {
                      if (sectionIndex === 0) {
                        lockMessage = "Start with Day 1";
                      } else {
                        const prevSection = curriculum[sectionIndex - 1];
                        lockMessage = `Complete all lessons in ${
                          prevSection?.title || "previous day"
                        } to unlock`;
                      }
                    }

                    return (
                      <div
                        key={section.id}
                        className={`rounded-xl border overflow-hidden transition-all ${
                          dayLocked
                            ? "border-slate-200 bg-slate-50"
                            : dayCompleted
                            ? "border-emerald-200 bg-emerald-50/50"
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
                            lockMessage ||
                            (dayCompleted ? "Day completed!" : "")
                          }
                        >
                          <div className="flex flex-col items-start text-left">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                dayLocked ? "text-slate-400" : "text-indigo-500"
                              }`}
                            >
                              {normalizeDayLabel(section.day)}
                            </span>
                            <span
                              className={`text-xs font-semibold mt-0.5 ${
                                dayLocked ? "text-slate-500" : "text-slate-800"
                              }`}
                            >
                              {sanitizeSectionTitle(section.title)}
                            </span>
                          </div>
                          {dayLocked ? (
                            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : dayCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
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
                                {(() => {
                                  const quizItem = getSectionQuizSourceItem(section);
                                  const quizLocked = quizItem
                                    ? isLessonLocked(quizItem, sectionIndex)
                                    : dayLocked;
                                  const isDemoQuiz = !quizItem;
                                  const canOpenQuiz = !quizLocked;
                                  const isQuizActive = quizItem
                                    ? quizItem.active || activeDemoQuizSectionId === section.id
                                    : activeDemoQuizSectionId === section.id;

                                  return (
                                    <div
                                      onClick={() =>
                                        canOpenQuiz &&
                                        handleOpenSectionQuiz(section, quizItem)
                                      }
                                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border transition-all ${
                                        canOpenQuiz
                                          ? isQuizActive
                                            ? "cursor-pointer bg-orange-50 border-orange-200"
                                            : "cursor-pointer bg-orange-50/60 border-orange-200 hover:bg-orange-100/70"
                                          : "cursor-not-allowed opacity-70 border-dashed border-orange-200 bg-orange-50/40"
                                      }`}
                                      title={
                                        canOpenQuiz
                                          ? "Open quiz"
                                          : "Quiz not available yet"
                                      }
                                    >
                                      <div className="mt-0.5 shrink-0">
                                        {quizItem?.completed ? (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                          <HelpCircle className="w-4 h-4 text-orange-500" />
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <span className="text-xs font-semibold block leading-tight text-orange-800">
                                          {quizItem?.type === "quiz"
                                            ? quizItem.title
                                            : quizItem
                                            ? `${normalizeDayLabel(section.day)} Quiz`
                                            :
                                            `${normalizeDayLabel(
                                              section.day,
                                            )} Quiz`}
                                        </span>
                                        <span className="text-[10px] font-medium flex items-center gap-1 mt-1 text-orange-600">
                                          <Clock className="w-3 h-3" />{" "}
                                          {quizItem?.duration ||
                                            (isDemoQuiz
                                              ? "Demo quiz preview"
                                              : "Quiz from lesson")}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-slate-100 shrink-0">
                  <button
                    onClick={() =>
                      currentToolUrl &&
                      window.open(currentToolUrl, "_blank", "noopener,noreferrer")
                    }
                    disabled={!currentToolUrl}
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

        {!isSidebarOpen ? (
          <button
            className="absolute left-3 top-20 p-2 bg-white rounded border"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </button>
        ) : null}

        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-4xl mx-auto p-6 md:p-8">
            {currentLesson?.languages && !currentLesson?.audioTracks?.length && (
              <div className="mb-4 flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-sm">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">
                  Video Language:
                </span>
                <select
                  value={selectedLanguage}
                  onChange={(e) =>
                    handleLanguageChange(
                      e.target.value as "english" | "hindi" | "marathi",
                    )
                  }
                  disabled={isLoadingLanguage}
                  className="ml-auto px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="marathi">Marathi</option>
                </select>
                {isLoadingLanguage && (
                  <Loader className="w-4 h-4 text-indigo-600 animate-spin" />
                )}
              </div>
            )}

            {currentLesson?.audioTracks?.length ? (
              <div className="mb-4 flex items-center gap-3 bg-indigo-50 px-4 py-3 rounded-lg border border-indigo-200">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">
                  Multi-language audio available - Use the language selector on
                  the video player to switch
                </span>
              </div>
            ) : null}

            {renderMediaSection()}

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
              <div className="flex items-center gap-3 shrink-0">
                {isControllableCurrentVideo && (
                  <>
                    <button
                      onClick={() => lessonVideoPlayerRef.current?.togglePlay()}
                      disabled={
                        lessonVideoPlayerState.isLoading ||
                        !lessonVideoPlayerState.canControl
                      }
                      className="flex justify-center items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 text-sm font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm shrink-0"
                      title={
                        lessonVideoPlayerState.isPlaying
                          ? "Pause video"
                          : "Play video"
                      }
                      type="button"
                    >
                      {lessonVideoPlayerState.isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" fill="currentColor" />
                      )}
                      {lessonVideoPlayerState.isPlaying ? "Pause" : "Play"}
                    </button>
                    <button
                      onClick={() =>
                        lessonVideoPlayerRef.current?.toggleFullscreen()
                      }
                      disabled={!lessonVideoPlayerState.canControl}
                      className="flex justify-center items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 text-sm font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm shrink-0"
                      title={
                        lessonVideoPlayerState.isFullscreen
                          ? "Exit fullscreen"
                          : "Open fullscreen"
                      }
                      type="button"
                    >
                      {lessonVideoPlayerState.isFullscreen ? (
                        <Minimize className="w-4 h-4" />
                      ) : (
                        <Maximize className="w-4 h-4" />
                      )}
                      {lessonVideoPlayerState.isFullscreen
                        ? "Exit Fullscreen"
                        : "Fullscreen"}
                    </button>
                  </>
                )}
                <button
                  onClick={handlePreviousLesson}
                  disabled={
                    curriculum
                      .flatMap((section) => section.items)
                      .findIndex((l) => l.id === currentLesson?.id) === 0
                  }
                  className="flex justify-center items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-indigo-500/25 active:scale-[0.97] shrink-0"
                  title="Go to previous lesson"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                {(() => {
                  const currentDayIndex = getCurrentDayIndex();
                  const currentDay = curriculum[currentDayIndex];
                  const currentLessonIndexInDay =
                    currentDay?.items.findIndex(
                      (item) => item.id === currentLesson?.id,
                    ) ?? -1;
                  const isLastLessonInDay =
                    currentLessonIndexInDay ===
                    (currentDay?.items.length ?? 0) - 1;
                  const isCurrentDayCompleted = isDayCompleted(currentDayIndex);
                  const isLastLesson =
                    curriculum
                      .flatMap((section) => section.items)
                      .findIndex((l) => l.id === currentLesson?.id) ===
                    curriculum.flatMap((section) => section.items).length - 1;

                  const isNextDisabled = isLastLessonInDay
                    ? !isCurrentDayCompleted
                    : !canCompleteCurrentLesson && isControllableCurrentVideo;

                  const buttonTitle = currentLesson?.completed
                    ? "Continue to next lesson"
                    : isLastLessonInDay && !isCurrentDayCompleted
                    ? "Complete all lessons in this day to continue"
                    : isLastLesson
                    ? "You've completed all lessons"
                    : canCompleteCurrentLesson
                    ? "Mark this lesson as complete and continue"
                    : "Watch till near end of video to unlock";

                  return (
                    <button
                      onClick={handleMarkComplete}
                      disabled={isNextDisabled || isLastLesson}
                      className="flex justify-center items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-indigo-500/25 active:scale-[0.97] shrink-0"
                      title={buttonTitle}
                    >
                      {currentLesson?.completed ? (
                        <>
                          <ChevronRight className="w-4 h-4" />
                          Continue
                        </>
                      ) : isLastLessonInDay && !isCurrentDayCompleted ? (
                        <>
                          <Lock className="w-4 h-4" />
                          Locked
                        </>
                      ) : isLastLesson ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Finished
                        </>
                      ) : (
                        <>
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>
            {!canCompleteCurrentLesson && currentLesson?.videoUrl && (
              <p className="text-xs text-amber-600 font-medium -mt-4 mb-5">
                Watch until the last ~40 seconds to mark this lesson complete.
              </p>
            )}

            {!isDemoQuizLesson && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
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
