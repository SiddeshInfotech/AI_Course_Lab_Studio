/* eslint-disable react/no-unknown-property */
"use client";

import {
  forwardRef,
  Suspense,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  FileText,
  Video,
  Target,
  ChevronRight,
  ChevronLeft,
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
  AlertTriangle,
  Lock,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Pause,
  Loader,
  Globe,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import { useVideoProtection } from "@/hooks/useVideoProtection";
import {
  addWatermarkToVideo,
  getWatermarkConfig,
} from "@/utils/videoWatermark";
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
  languages?: {
    english?: string | null;
    hindi?: string | null;
    marathi?: string | null;
  };
  objectives: string[];
  orderIndex: number;
  completed?: boolean;
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
  isLoading: false,
  canControl: false,
  error: null,
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
  msExitFullscreen?: () => Promise<void> | void;
  msFullscreenElement?: Element | null;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type WebkitVideoElement = HTMLVideoElement & {
  webkitDisplayingFullscreen?: boolean;
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
};

const getActiveFullscreenElement = (
  doc: Document = document,
): Element | null => {
  const fullscreenDocument = doc as FullscreenDocument;
  return (
    doc.fullscreenElement ??
    fullscreenDocument.webkitFullscreenElement ??
    fullscreenDocument.msFullscreenElement ??
    null
  );
};

const isVideoUsingNativeFullscreen = (
  video: HTMLVideoElement | null,
): boolean => {
  const webkitVideo = video as WebkitVideoElement | null;
  return Boolean(webkitVideo?.webkitDisplayingFullscreen);
};




const getMediaIdFromUrl = (url: string): number | null => {
  const match = url.match(/\/api\/media\/(\d+)/);
  if (!match) {
    return null;
  }

  const mediaId = Number.parseInt(match[1], 10);
  return Number.isNaN(mediaId) ? null : mediaId;
};

const isBackendHostedVideo = (url: string): boolean =>
  url.startsWith("/uploads/") ||
  url.includes("/uploads/") ||
  url.startsWith("/api/media/") ||
  url.includes("/api/media/");

// Enhanced video player component for direct file playback from uploads folder
const DatabaseVideoPlayer = forwardRef<
  LessonVideoPlayerHandle,
  {
    videoUrl: string;
    title: string;
    className?: string;
    onStateChange?: (state: LessonVideoPlayerState) => void;
  }
>(function DatabaseVideoPlayer(
  { videoUrl, title, className = "", onStateChange },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxTimeReachedRef = useRef(0);
  const cleanupWatermarkRef = useRef<(() => void) | null>(null);
  const isFullscreenRef = useRef(false);

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
  
  // Video watch time limit state
  const [isLimitExceeded, setIsLimitExceeded] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isCheckingLimit, setIsCheckingLimit] = useState(false);

  // Function to check usage limit
  const checkUsageLimit = async () => {
    try {
      setIsCheckingLimit(true);
      const usageData = await api.usage.getStatus();
      setRemainingTime(usageData.remainingSeconds);
      setIsLimitExceeded(usageData.isLocked);
      return !usageData.isLocked;
    } catch (error) {
      console.error("Failed to check usage limit:", error);
      return true; // Allow playback if API fails
    } finally {
      setIsCheckingLimit(false);
    }
  };

  // Function to send heartbeat
  const sendHeartbeat = async () => {
    try {
      const result = await api.usage.sendHeartbeat();
      setRemainingTime(result.remainingSeconds);
      if (result.isLocked) {
        setIsLimitExceeded(true);
        // Pause video when limit is reached
        const video = videoRef.current;
        if (video) {
          video.pause();
        }
      }
    } catch (error) {
      console.error("Failed to send heartbeat:", error);
    }
  };

  // Start heartbeat when video plays
  const startHeartbeat = () => {
    if (heartbeatIntervalRef.current) return;
    
    // Send initial heartbeat
    sendHeartbeat();
    
    // Send heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 30000);
  };

  // Stop heartbeat when video pauses
  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) {
      console.error("❌ Video ref is null");
      return;
    }

    console.log("🎬 Toggle play clicked. Currently playing:", isPlaying);

    if (isPlaying) {
      video.pause();
      stopHeartbeat();
      console.log("⏸️ Video paused");
    } else {
      // Check usage limit before playing
      const canPlay = await checkUsageLimit();
      
      if (!canPlay) {
        console.log("⛔ Daily video watch limit exceeded");
        setError("You've reached your daily video watch limit of 2 hours. Come back tomorrow!");
        return;
      }
      
      video.play().catch((err) => {
        console.error("❌ Play failed:", err);
        setError("Failed to play video. Please try again.");
      });
      
      // Start heartbeat tracking
      startHeartbeat();
      console.log("▶️ Video playing");
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) {
      console.error("❌ Video ref is null");
      return;
    }

    console.log("🔊 Toggle mute clicked. Currently muted:", isMuted);

    if (isMuted) {
      video.muted = false;
      video.volume = volume;
      setIsMuted(false);
      console.log("🔊 Video unmuted");
    } else {
      video.muted = true;
      setIsMuted(true);
      console.log("🔇 Video muted");
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    console.log("🔊 Volume changed to:", newVolume);
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

    if (!video || !container) {
      return;
    }

    const isAlreadyFullscreen = 
      document.fullscreenElement !== null || 
      (document as any).webkitFullscreenElement !== null;

    if (!isAlreadyFullscreen) {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        await (container as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      togglePlay,
      toggleFullscreen,
    }),
    [isPlaying, isFullscreen],
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
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
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

      console.log("🎬 Resolving video URL:", videoUrl);

      if (!videoUrl) {
        setResolvedVideoUrl(null);
        setIsLoading(false);
        console.log("❌ No video URL provided");
        return;
      }

      try {
        const mediaId = getMediaIdFromUrl(videoUrl);

        if (mediaId) {
          console.log("📦 Media ID detected:", mediaId);
          const signedMedia = await api.admin.getSignedUrl(mediaId);
          if (isActive) {
            console.log("✅ Signed URL obtained:", signedMedia.url);
            setResolvedVideoUrl(signedMedia.url);
            setIsLoading(false); // URL resolved, let video element handle loading
          }
          return;
        }

        if (videoUrl.startsWith("/")) {
          const fullUrl = `${API_ORIGIN}${videoUrl}`;
          console.log("🔗 Relative URL converted:", fullUrl);
          if (isActive) {
            setResolvedVideoUrl(fullUrl);
            setIsLoading(false); // URL resolved, let video element handle loading
          }
          return;
        }

        console.log("🔗 Using direct URL:", videoUrl);
        if (isActive) {
          setResolvedVideoUrl(videoUrl);
          setIsLoading(false); // URL resolved, let video element handle loading
        }
      } catch (resolveError) {
        console.error("❌ Failed to resolve video URL:", resolveError);
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

  // Video element event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedVideoUrl) return;

    const handleLoadedData = () => {
      setIsLoading(false);
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
      // Track the furthest point the student has watched using ref
      if (video.currentTime > maxTimeReachedRef.current) {
        maxTimeReachedRef.current = video.currentTime;
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
      console.error("❌ Video playback error:", (e.target as any)?.error);
      setError("Failed to load video. Please try again.");
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    // Prevent seeking ahead (works for both custom and native fullscreen controls)
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

    // Force video to load
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

  // Apply watermark overlay when video is loaded
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;

    if (!video || !container) return;

    // Get user info for watermark
    const getUserInfo = async () => {
      try {
        const { user } = await api.auth.me();
        setUserId(user.id.toString());

        // Apply watermark - show only name, not ID
        const watermarkConfig = getWatermarkConfig(
          user.id.toString(),
          user.username || user.email,
          false, // showId: false - only show name
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

  // Check usage limit on mount
  useEffect(() => {
    checkUsageLimit();

    // Cleanup heartbeat on unmount
    return () => {
      stopHeartbeat();
    };
  }, []);

  // Continuous monitoring for fullscreen native controls
  // Only enforces limit when user tries to seek beyond maxTimeReached
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationId: number;
    let lastCheckedTime = 0;

    const monitorSeeking = () => {
      // Only force back if currentTime jumped ahead (seeking attempted)
      // Don't interfere during normal playback
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

    // Only allow seeking to points already watched
    if (newTime <= maxTimeReachedRef.current) {
      video.currentTime = newTime;
    }
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
    <div
      ref={containerRef}
      className={`bg-black group relative ${className}`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFullscreen();
        }}
        className={`absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-opacity pointer-events-auto ${
          isFullscreen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
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

      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        preload="metadata"
        controls
        onContextMenu={(e) => e.preventDefault()}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        src={resolvedVideoUrl || undefined}
      >
        <p className="text-white text-center p-4">
          Your browser doesn't support video playback.
        </p>
      </video>

      {/* Loading Overlay */}
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

      {/* Daily Limit Exceeded Overlay */}
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
              You've used your 2-hour daily video watch limit. 
              Your progress has been saved.
            </p>
            <p className="text-sm text-slate-400">
              Come back tomorrow to continue learning!
            </p>
          </div>
        </div>
      )}

      {/* Video Controls */}
      <div className="absolute inset-0 pointer-events-none hidden">
        {/* Play/Pause Overlay - Only visible on hover when paused */}
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer pointer-events-auto opacity-0 hover:opacity-100 transition-opacity duration-200"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
        >
          {!isPlaying && !isLoading && (
            <div className="bg-black bg-opacity-50 rounded-full p-4">
              <Play className="w-12 h-12 text-white" fill="white" />
            </div>
          )}
        </div>

        {/* Bottom Controls - Always visible */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pointer-events-auto z-10">
          {/* Progress Bar - Locked for forward seeking */}
          <div
            className="w-full h-1 bg-gray-600 rounded-full mb-4 group relative cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleProgressClick(e);
            }}
          >
            <div
              className="h-full bg-blue-500 rounded-full pointer-events-none"
              style={{ width: `${progress}%` }}
            />
            {/* Lock icon indicator on progress bar */}
            <div className="absolute top-1/2 -translate-y-1/2 right-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Lock className="w-3 h-3 text-yellow-400" />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="text-white hover:text-blue-400 transition-colors outline-none focus:outline-none z-50"
                title={isPlaying ? "Pause" : "Play"}
                type="button"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" fill="white" />
                )}
              </button>

              {/* Mute Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="text-white hover:text-blue-400 transition-colors outline-none focus:outline-none z-50"
                title={isMuted ? "Unmute" : "Mute"}
                type="button"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              {/* Volume Slider */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  e.stopPropagation();
                  handleVolumeChange(e);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-20 h-1 bg-gray-600 rounded-full cursor-pointer accent-blue-500 outline-none focus:outline-none z-50"
                title="Volume"
              />

              {/* Time Display */}
              <span className="text-white text-sm whitespace-nowrap pointer-events-none">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="text-white hover:text-blue-400 transition-colors outline-none focus:outline-none z-50"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              type="button"
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
  );
});

// YouTube video player component with usage tracking
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

  // Check usage limit
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

  // Send heartbeat
  const sendHeartbeat = async () => {
    try {
      const result = await api.usage.sendHeartbeat();
      if (result.isLocked) {
        setIsLimitExceeded(true);
        // Try to pause YouTube video
        if (playerRef.current?.pauseVideo) {
          playerRef.current.pauseVideo();
        }
      }
    } catch (error) {
      console.error("Failed to send heartbeat:", error);
    }
  };

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

  // Initialize YouTube API and check limit
  useEffect(() => {
    const initYouTube = async () => {
      // Check limit before showing video
      const canPlay = await checkUsageLimit();
      if (!canPlay) {
        setIsLimitExceeded(true);
        return;
      }
      setIsReady(true);
      
      // Start heartbeat tracking
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

  // YouTube API event handler
  const onYouTubeIframeAPIReady = () => {
    // This will be called when the YouTube API is ready
  };

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
      {/* Daily Limit Exceeded Overlay */}
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
              You've used your 2-hour daily video watch limit.
              Your progress has been saved.
            </p>
            <p className="text-sm text-slate-400">
              Come back tomorrow to continue learning!
            </p>
          </div>
        </div>
      )}
      
      {/* Show loading while checking limit */}
      {!isReady && !isLimitExceeded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader className="w-8 h-8 text-white animate-spin" />
        </div>
      )}
      
      {/* YouTube iframe - only show if not limited */}
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

// Smart video player that detects video type
const SmartVideoPlayer = ({
  videoUrl,
  title,
  playerRef,
  onDatabasePlayerStateChange,
}: {
  videoUrl: string;
  title: string;
  playerRef?: RefObject<LessonVideoPlayerHandle | null>;
  onDatabasePlayerStateChange?: (state: LessonVideoPlayerState) => void;
}) => {
  // Detect video type
  const isDataBaseVideo = isBackendHostedVideo(videoUrl);
  const isYouTubeVideo =
    videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");

  const playerClassName = "w-full h-full";

  if (isDataBaseVideo) {
    return (
      <DatabaseVideoPlayer
        ref={playerRef}
        videoUrl={videoUrl}
        title={title}
        className={playerClassName}
        onStateChange={onDatabasePlayerStateChange}
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
  const { isAuthenticated, isLoading, user } = useAuth();

  // Enable video protection on this page
  useVideoProtection();

  const [courseId, setCourseId] = useState<number | null>(null);
  const [licenseInvalidReason, setLicenseInvalidReason] = useState<
    string | null
  >(null);
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
  const [noCourseAvailable, setNoCourseAvailable] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<"english" | "hindi" | "marathi">("english");
  const [isLoadingLanguage, setIsLoadingLanguage] = useState(false);
  const lessonVideoPlayerRef = useRef<LessonVideoPlayerHandle | null>(null);
  const [lessonVideoPlayerState, setLessonVideoPlayerState] =
    useState<LessonVideoPlayerState>(DEFAULT_LESSON_VIDEO_PLAYER_STATE);
  const isControllableCurrentVideo = Boolean(
    currentLesson?.videoUrl && isBackendHostedVideo(currentLesson.videoUrl),
  );

  useEffect(() => {
    if (!isControllableCurrentVideo) {
      setLessonVideoPlayerState(DEFAULT_LESSON_VIDEO_PLAYER_STATE);
    }
  }, [currentLesson?.id, currentLesson?.videoUrl, isControllableCurrentVideo]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  // Get courseId from URL or default to first enrolled course
  useEffect(() => {
    const fetchCourseId = async () => {
      const courseIdParam = searchParams.get("courseId");
      setNoCourseAvailable(false);
      if (courseIdParam) {
        // Validate that the course is published when accessed via URL
        try {
          const enrolledCourses = await api.courses.getEnrolled();
          const publishedCourses = enrolledCourses.filter(
            (course) => course.status !== "Draft",
          );
          const course = publishedCourses.find(
            (c) => c.id === parseInt(courseIdParam),
          );
          if (course) {
            setCourseId(parseInt(courseIdParam));
            setCourseTitle(course.title);
          } else {
            // Course not found or is draft, redirect to first published course
            if (publishedCourses.length > 0) {
              setCourseId(publishedCourses[0].id);
              setCourseTitle(publishedCourses[0].title);
            } else {
              setNoCourseAvailable(true);
              setCourseId(null);
            }
          }
        } catch (error) {
          console.error("Failed to validate course access:", error);
        }
      } else {
        // Default to first enrolled course
        try {
          const enrolledCourses = await api.courses.getEnrolled();
          // Filter out draft courses from student view
          const publishedCourses = enrolledCourses.filter(
            (course) => course.status !== "Draft",
          );
          if (publishedCourses.length > 0) {
            setCourseId(publishedCourses[0].id);
            setCourseTitle(publishedCourses[0].title);
          } else {
            // No published courses available
            setNoCourseAvailable(true);
            setCourseId(null);
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
        // Fetch user's language preference (non-blocking, defaults to english if fails)
        try {
          const langPref = await api.learning.getLanguagePreference(courseId);
          setSelectedLanguage(langPref.language || "english");
        } catch (error) {
          console.warn("Failed to fetch language preference, defaulting to english:", error);
          setSelectedLanguage("english");
        }

        const data = await api.learning.getCurriculum(courseId);
        setCurriculum(data.curriculum);
        
        // Check if we have a lessonOrderIndex in URL (from AI Dashboard)
        const lessonOrderIndexParam = searchParams.get("lessonOrderIndex");
        
        if (lessonOrderIndexParam) {
          const targetOrderIndex = parseInt(lessonOrderIndexParam);
          // Find the lesson with matching orderIndex
          const allLessons = data.curriculum.flatMap((section) => section.items);
          const targetLesson = allLessons.find((lesson) => lesson.orderIndex === targetOrderIndex);
          
          if (targetLesson) {
            // Find the section containing this lesson
            const targetSection = data.curriculum.find((section) =>
              section.items.some((item) => item.orderIndex === targetOrderIndex),
            );
            
            if (targetSection) {
              // Expand the section
              setExpandedDays({ [targetSection.id]: true });
            }
            
            // Set as current lesson
            setCurrentLesson(targetLesson);
          } else {
            // Lesson not found, use default current lesson
            setCurrentLesson(data.currentLesson);
            if (data.currentLesson) {
              const currentSection = data.curriculum.find((section) =>
                section.items.some((item) => item.id === data.currentLesson?.id),
              );
              if (currentSection) {
                setExpandedDays({ [currentSection.id]: true });
              }
            }
          }
        } else {
          // Default behavior - use current lesson from API
          setCurrentLesson(data.currentLesson);
          
          // Auto-expand the section containing the current lesson
          if (data.currentLesson) {
            const currentSection = data.curriculum.find((section) =>
              section.items.some((item) => item.id === data.currentLesson?.id),
            );
            if (currentSection) {
              setExpandedDays({ [currentSection.id]: true });
            }
          }
        }
        
        setProgress(data.progress);
        
      } catch (error) {
        console.error("Failed to fetch curriculum:", error);
      } finally {
        setIsLoadingCurriculum(false);
      }
    };

    fetchCurriculum();
  }, [courseId]);

  // Real-time course access validation
  useEffect(() => {
    if (!courseId || !isAuthenticated) return;

    const validateCourseAccess = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          return;
        }

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

        if (!response.ok) {
          console.error(
            "Course access validation request failed:",
            response.status,
          );
          return;
        }

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

    // Validate immediately on mount
    validateCourseAccess();

    // Then validate every 30 seconds
    const interval = setInterval(validateCourseAccess, 30000);

    return () => clearInterval(interval);
  }, [courseId, isAuthenticated]);

  // Helper: Check if all lessons in a day are completed
  const isDayCompleted = (dayIndex: number): boolean => {
    if (dayIndex < 0 || !curriculum[dayIndex]) return false;
    const dayLessons = curriculum[dayIndex].items;
    return dayLessons.length > 0 && dayLessons.every((item) => item.completed);
  };

  // Helper: Find the current day index (the day containing the active lesson)
  const getCurrentDayIndex = (): number => {
    if (!currentLesson) return 0;
    const dayIndex = curriculum.findIndex((section) =>
      section.items.some((item) => item.id === currentLesson.id),
    );
    return dayIndex >= 0 ? dayIndex : 0;
  };

  // Helper: Find the first unlocked day (first day that is not completed)
  const getFirstUnlockedDayIndex = (): number => {
    for (let i = 0; i < curriculum.length; i++) {
      if (!isDayCompleted(i)) {
        return i;
      }
    }
    return curriculum.length - 1;
  };

  // Helper: Check if a day is locked (day is locked if previous day is not completed)
  const isDayLocked = (dayIndex: number): boolean => {
    if (dayIndex === 0) return false;
    return !isDayCompleted(dayIndex - 1);
  };

  // Helper: Check if a lesson is locked
  const isLessonLocked = (
    lesson: LessonItem,
    sectionIndex: number,
  ): boolean => {
    // First day lessons are always accessible
    if (sectionIndex === 0) return false;
    // Other days are locked if previous day is not completed
    return !isDayCompleted(sectionIndex - 1);
  };
  // Helper: Get video URL based on selected language
  const getVideoUrlForLanguage = (lesson: CurrentLesson | LessonItem): string | null => {
    if (!lesson.languages) {
      return lesson.videoUrl || null;
    }

    const langKey = selectedLanguage as keyof typeof lesson.languages;
    const videoUrl = lesson.languages[langKey];
    
    // Fallback to English if selected language video doesn't exist
    if (!videoUrl && selectedLanguage !== "english") {
      return lesson.languages.english || lesson.videoUrl || null;
    }
    
    return videoUrl || lesson.videoUrl || null;
  };

  // Handler for language change
  const handleLanguageChange = async (newLanguage: "english" | "hindi" | "marathi") => {
    if (!courseId || !currentLesson) return;

    try {
      setIsLoadingLanguage(true);
      
      // Save language preference
      await api.learning.setLanguagePreference(courseId, newLanguage);
      setSelectedLanguage(newLanguage);

      // Update current lesson with new video URL
      const newVideoUrl = getVideoUrlForLanguage({ ...currentLesson, languages: currentLesson.languages });
      setCurrentLesson({
        ...currentLesson,
        videoUrl: newVideoUrl,
      });
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

    const allLessons = curriculum.flatMap((section) => section.items);
    const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
    const isLastLesson = currentIndex === allLessons.length - 1;
    
    // If already completed and not last lesson, just navigate to next
    if (currentLesson.completed && !isLastLesson) {
      // Move to next lesson without calling complete API
      if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
        const nextLesson = allLessons[currentIndex + 1];
        const nextLessonDayIndex = curriculum.findIndex((section) =>
          section.items.some((item) => item.id === nextLesson.id),
        );
        
        if (nextLessonDayIndex > 0 && !isDayCompleted(nextLessonDayIndex - 1)) {
          return;
        }
        
        setCurrentLesson(nextLesson);
        await api.learning.setCurrentLesson(courseId, nextLesson.orderIndex);
      }
      return;
    }

    try {
      await api.learning.completeLesson(currentLesson.id);

      // Refresh curriculum to update completion status
      const data = await api.learning.getCurriculum(courseId);
      setCurriculum(data.curriculum);
      setProgress(data.progress);

      // Find current day index
      const currentDayIndex = getCurrentDayIndex();
      const currentDay = curriculum[currentDayIndex];
      
      if (!currentDay) return;

      // Check if current lesson is the last in the day
      const currentLessonIndexInDay = currentDay.items.findIndex(
        (item) => item.id === currentLesson.id,
      );
      const isLastLessonInDay = currentLessonIndexInDay === currentDay.items.length - 1;
      const isCurrentDayCompleted = isDayCompleted(currentDayIndex);

      // If it's the last lesson in the day and day is not fully completed, don't move
      if (isLastLessonInDay && !isCurrentDayCompleted) {
        return;
      }

      // Move to next lesson (only within same day, or to next day if current day is completed)
      const currentIndexAfterComplete = allLessons.findIndex(
        (l) => l.id === currentLesson.id,
      );
      
      if (currentIndexAfterComplete >= 0 && currentIndexAfterComplete < allLessons.length - 1) {
        const nextLesson = allLessons[currentIndexAfterComplete + 1];
        
        // Check if next lesson is in a locked day
        const nextLessonDayIndex = curriculum.findIndex((section) =>
          section.items.some((item) => item.id === nextLesson.id),
        );
        
        if (nextLessonDayIndex > 0 && !isDayCompleted(nextLessonDayIndex - 1)) {
          // Can't move to next day until current day is completed
          return;
        }
        
        setCurrentLesson(nextLesson);
        await api.learning.setCurrentLesson(courseId, nextLesson.orderIndex);
      }
    } catch (error) {
      console.error("Failed to mark lesson complete:", error);
    }
  };

  const handlePreviousLesson = async () => {
    if (!currentLesson || !courseId) return;

    const allLessons = curriculum.flatMap((section) => section.items);
    const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);

    if (currentIndex > 0) {
      const prevLesson = allLessons[currentIndex - 1];
      setCurrentLesson(prevLesson);
      await api.learning.setCurrentLesson(courseId, prevLesson.orderIndex);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (noCourseAvailable) {
    return (
      <div className="h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-amber-50 rounded-full">
              <BookOpen className="w-12 h-12 text-amber-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            No Courses Available
          </h2>
          <p className="text-slate-600 mb-6">
            You are not enrolled in any published courses yet. Please check back
            later or contact your instructor to get enrolled in a course.
          </p>
          <button
            onClick={() => router.push("/ai-dashboard")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingCurriculum) {
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

      {/* License Invalid Warning */}
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
                    const isCurrentDay = sectionIndex === getCurrentDayIndex();
                    const previousDayCompleted = sectionIndex === 0 || isDayCompleted(sectionIndex - 1);
                    const dayCompleted = isDayCompleted(sectionIndex);
                    
                    let lockMessage = "";
                    if (dayLocked) {
                      if (sectionIndex === 0) {
                        lockMessage = "Start with Day 1";
                      } else {
                        const prevSection = curriculum[sectionIndex - 1];
                        lockMessage = `Complete all lessons in ${prevSection?.title || "previous day"} to unlock`;
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
                          title={lockMessage || (dayCompleted ? "Day completed!" : "")}
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
            {/* Video Language Selector */}
            {currentLesson?.languages && (
              <div className="mb-4 flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-sm">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Video Language:</span>
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value as "english" | "hindi" | "marathi")}
                  disabled={isLoadingLanguage}
                  className="ml-auto px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="marathi">Marathi</option>
                </select>
                {isLoadingLanguage && <Loader className="w-4 h-4 text-indigo-600 animate-spin" />}
              </div>
            )}

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
                  videoUrl={getVideoUrlForLanguage(currentLesson) || currentLesson.videoUrl}
                  title={currentLesson.title}
                  playerRef={
                    isControllableCurrentVideo ? lessonVideoPlayerRef : undefined
                  }
                  onDatabasePlayerStateChange={setLessonVideoPlayerState}
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

            {/* ── Below Video: Lesson Title + Prev/Next Buttons + Overview only ── */}
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
                {/* Previous Button */}
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
                {/* Next Button */}
                {(() => {
                  const currentDayIndex = getCurrentDayIndex();
                  const currentDay = curriculum[currentDayIndex];
                  const currentLessonIndexInDay = currentDay?.items.findIndex(
                    (item) => item.id === currentLesson?.id,
                  ) ?? -1;
                  const isLastLessonInDay = currentLessonIndexInDay === (currentDay?.items.length ?? 0) - 1;
                  const isCurrentDayCompleted = isDayCompleted(currentDayIndex);
                  const isLastLesson = curriculum
                    .flatMap((section) => section.items)
                    .findIndex((l) => l.id === currentLesson?.id) === curriculum
                        .flatMap((section) => section.items)
                        .length - 1;

                  // Disable next if: last lesson in day but day not completed, or trying to go to next day before current day is done
                  const isNextDisabled = isLastLessonInDay 
                    ? !isCurrentDayCompleted 
                    : false;

                  const buttonTitle = currentLesson?.completed
                    ? "Continue to next lesson"
                    : isLastLessonInDay && !isCurrentDayCompleted
                      ? "Complete all lessons in this day to continue"
                      : isLastLesson 
                        ? "You've completed all lessons" 
                        : "Mark this lesson as complete and continue";

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
