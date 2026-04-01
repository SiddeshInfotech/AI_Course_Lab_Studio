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
  unifiedVideoUrl?: string | null;
  audioTracks?: any[];
  preferredAudioTrack?: number;
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
  preferredAudioTrack?: number;
  unifiedVideoUrl?: string | null;
  audioTracks?: any;
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
}

// Enhanced video player component for direct file playback from uploads folder
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
  const maxTimeReachedRef = useRef(0); // Use ref instead of state to avoid re-renders
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

  // Video element event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    console.log("📹 Video useEffect - resolvedVideoUrl:", resolvedVideoUrl);
    
    if (!resolvedVideoUrl) {
      console.log("❌ No resolved video URL, not setting up video events");
      return;
    }

    const handleLoadedData = () => {
      console.log("✅ Video loaded successfully");
      setIsLoading(false);
      setDuration(video.duration);
      thresholdNotifiedRef.current = false;
      onWatchThresholdMet?.(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
      // Track the furthest point the student has watched using ref
      if (video.currentTime > maxTimeReachedRef.current) {
        maxTimeReachedRef.current = video.currentTime;
      }

      // Unlock completion only near the end of video (last ~40s).
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
      const videoSrc = video?.src || 'empty/undefined';
      
      console.error("❌ Video playback error:", {
        error: videoError,
        errorCode: videoError?.code,
        errorMessage: videoError?.message,
        videoSrc: videoSrc.substring(0, 100), // First 100 chars of URL
        networkState: video?.networkState,
        readyState: video?.readyState,
      });
      
      let errorMessage = "Failed to load video. Please try again.";
      
      if (videoError) {
        switch (videoError.code) {
          case 1: // MEDIA_ERR_ABORTED
            errorMessage = videoSrc === '' || videoSrc === 'empty/undefined'
              ? "Video URL is empty or invalid."
              : "Video playback was aborted.";
            break;
          case 2: // MEDIA_ERR_NETWORK
            errorMessage = "Network error while loading video. Check your connection.";
            break;
          case 3: // MEDIA_ERR_DECODE
            errorMessage = "Video format not supported. Please contact support.";
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            errorMessage = "Video format or URL not supported.";
            break;
        }
      }
      
      setError(errorMessage);
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

    if (isMuted) {
      video.muted = false;
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Handle audio track switching
  const handleAudioTrackSwitch = (trackIndex: number) => {
    const video = videoRef.current;
    const audio = audioRef.current;
    
    if (!video || !audio) return;

    const wasPlaying = !video.paused;
    const currentVideoTime = video.currentTime;
    
    // Store current time to sync audio
    audioStartTimeRef.current = currentVideoTime;
    
    // Update current track
    setCurrentAudioTrack(trackIndex);
    onAudioTrackChange?.(trackIndex);
    setShowAudioSelector(false);
    
    // If playing, restart from current position with new audio
    if (wasPlaying) {
      audio.currentTime = currentVideoTime;
      audio.play().catch(console.error);
    }
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
    <div className={`relative bg-black group ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        className={`w-full h-full ${isFullscreen ? 'object-contain' : 'object-contain'}`}
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

      {/* Hidden Audio Element for Multi-Language Support */}
      {hasAudioTracks && parsedAudioTracks[currentAudioTrack] && (
        <audio
          ref={audioRef}
          src={parsedAudioTracks[currentAudioTrack].audioUrl}
          preload="metadata"
        />
      )}

      {/* Audio Track Selector */}
      {hasAudioTracks && (
        <div className={`absolute top-4 left-4 z-20 ${isFullscreen ? "opacity-0 group-hover:opacity-100" : ""} transition-opacity`}>
          <button
            onClick={() => setShowAudioSelector(!showAudioSelector)}
            className="flex items-center gap-2 rounded-lg bg-black/60 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/80"
            title="Change audio track"
          >
            <Globe className="w-4 h-4" />
            <span>{parsedAudioTracks[currentAudioTrack]?.label || "Audio"}</span>
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
          {/* Progress Bar - Locked for forward seeking */}
          <div
            className="w-full h-1 bg-gray-600 rounded-full mb-4 group relative"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-blue-500 rounded-full pointer-events-none"
              style={{ width: `${progress}%` }}
            />
            {/* Lock icon indicator on progress bar */}
            <div className="absolute top-1/2 -translate-y-1/2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Lock className="w-3 h-3 text-yellow-400" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="text-white hover:text-blue-400 transition-colors"
                title={isPlaying ? "Pause" : "Play"}
                type="button"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" fill="white" />
                )}
              </button>
              <button
                onClick={toggleMute}
                className="text-white hover:text-blue-400 transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
                type="button"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-600 rounded-full cursor-pointer accent-blue-500"
                title="Volume"
              />

              {/* Time Display */}
              <span className="text-white text-sm whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-blue-400 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              type="button"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
      {watermarkText && (
        <div className="pointer-events-none absolute inset-0 z-20 select-none">
          {[16, 34, 52, 70].map((top, idx) => (
            <span
              key={top}
              className="absolute text-[10px] md:text-[11px] text-white/38 font-medium tracking-[0.08em] uppercase"
              style={{
                top: `${top}%`,
                left: `${idx % 2 === 0 ? 8 : 55}%`,
                transform: "translate(-2%, -50%) rotate(-20deg)",
                textShadow: "0 1px 1px rgba(0,0,0,0.45)",
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
interface AudioTrack {
  language: string;
  label: string;
  audioUrl: string;
}

const SmartVideoPlayer = ({
  videoUrl,
  title,
}: {
  videoUrl: string;
  title: string;
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
        onWatchThresholdMet={onWatchThresholdMet}
        watermarkText={watermarkText}
        className={playerClassName}
        onStateChange={onDatabasePlayerStateChange}
        audioTracks={audioTracks}
        preferredAudioTrack={preferredAudioTrack}
        onAudioTrackChange={onAudioTrackChange}
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
  const [isPageFullscreen, setIsPageFullscreen] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({
    day1: true,
  });
  const [noCourseAvailable, setNoCourseAvailable] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setWatermarkTime(new Date().toLocaleString());
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  const isTrackableVideo = (url?: string | null): boolean =>
    !!url &&
    (url.startsWith("/uploads/") ||
      url.includes("/uploads/") ||
      url.startsWith("/api/media/") ||
      url.includes("/api/media/"));

  useEffect(() => {
    // For self-hosted videos, require near-end watch before completion.
    setCanMarkComplete(!isTrackableVideo(currentLesson?.videoUrl));
  }, [currentLesson?.id, currentLesson?.videoUrl]);

  const isQuizLesson = currentLesson?.type?.toLowerCase() === "quiz";
  const quizQuestions = useMemo(
    () => parseQuizQuestions(currentLesson?.content || null),
    [currentLesson?.id, currentLesson?.content],
  );

  useEffect(() => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  }, [currentLesson?.id]);

  const handleSelectQuizOption = (questionIndex: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
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
          if (error instanceof ApiResponseError && error.status === 401) {
            return;
          }
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
          if (error instanceof ApiResponseError && error.status === 401) {
            return;
          }
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
        if (error instanceof ApiResponseError && error.status === 401) {
          return;
        }
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
  const getVideoUrlForLanguage = (
    lesson: CurrentLesson | LessonItem,
    language: "english" | "hindi" | "marathi" = selectedLanguage,
  ): string | null => {
    if (!lesson.languages) {
      return lesson.videoUrl || null;
    }

    const langKey = language as keyof typeof lesson.languages;
    const videoUrl = lesson.languages[langKey];
    
    // Fallback to English if selected language video doesn't exist
    if (!videoUrl && language !== "english") {
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
      const newVideoUrl = getVideoUrlForLanguage(
        { ...currentLesson, languages: currentLesson.languages },
        newLanguage,
      );
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
    setActiveDemoQuizSectionId(null);

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
      if (error instanceof ApiResponseError && error.status === 401) {
        return;
      }
      console.error("Failed to set current lesson:", error);
    }
  };

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

  const handleMarkComplete = async () => {
    if (!currentLesson || !courseId) return;

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
      if (error instanceof ApiResponseError && error.status === 401) {
        return;
      }
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
      try {
        await api.learning.setCurrentLesson(courseId, prevLesson.orderIndex);
      } catch (error) {
        if (error instanceof ApiResponseError && error.status === 401) {
          return;
        }
        console.error("Failed to go to previous lesson:", error);
      }
    }
  };

  const normalizeDayLabel = (dayLabel: string): string => {
    const match = dayLabel.match(/day\s*(\d+)/i);
    if (match?.[1]) return `Day ${match[1]}`;
    return dayLabel.trim();
  };

  const getToolNameFromTitle = (title: string): string => {
    return title.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  };

  const getSectionDayLabel = (section: CurriculumSection): string =>
    normalizeDayLabel(section.day);

  const getSectionToolName = (section: CurriculumSection): string =>
    getToolNameFromTitle(section.title);

  const toolUrlMap: Record<string, string> = {
    chatgpt: "https://chatgpt.com",
    gemini: "https://gemini.google.com/app",
    perplexity: "https://www.perplexity.ai",
    claude: "https://claude.ai",
    deepseek: "https://chat.deepseek.com",
  };

  const getToolUrl = (toolName: string): string => {
    const lowerName = toolName.toLowerCase();
    const matchedKey = Object.keys(toolUrlMap).find((key) =>
      lowerName.includes(key),
    );
    return matchedKey ? toolUrlMap[matchedKey] : "https://chatgpt.com";
  };

  const currentSection =
    curriculum.find((section) =>
      section.items.some((item) => item.id === currentLesson?.id),
    ) || curriculum[0];
  const currentToolName = currentSection
    ? getToolNameFromTitle(currentSection.title)
    : "AI Tool";
  const currentToolUrl = getToolUrl(currentToolName);
  const currentLessonProgress = curriculum
    .flatMap((section) => section.items)
    .find((item) => item.id === currentLesson?.id);
  const isCurrentLessonCompleted = !!currentLessonProgress?.completed;
  const isDemoQuizLesson = !!currentLesson && currentLesson.id < 0;
  const canCompleteCurrentLesson =
    (!isDemoQuizLesson && isCurrentLessonCompleted) ||
    (isQuizLesson
      ? quizSubmitted
      : !currentLesson?.videoUrl || canMarkComplete);

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
      {/* ── Header (hidden in fullscreen) ── */}
      {!isPageFullscreen && (
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
      )}

      {/* License Invalid Warning (hidden in fullscreen) */}
      {!isPageFullscreen && licenseInvalidReason && (
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
        {/* ── LEFT Sidebar: Course Content (hidden in fullscreen) ── */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && !isPageFullscreen && (
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
                <div className="overflow-y-auto p-3 space-y-2 max-h-[420px] lg:max-h-[460px]">
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
                              className={`text-[11px] font-bold uppercase tracking-wider ${
                                dayLocked ? "text-slate-400" : "text-indigo-500"
                              }`}
                            >
                              {getSectionDayLabel(section)}
                            </span>
                            <span
                              className={`text-sm font-semibold mt-0.5 ${
                                dayLocked ? "text-slate-500" : "text-slate-800"
                              }`}
                            >
                              {getSectionToolName(section)}
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
                                {(() => {
                                  const quizItem =
                                    section.items.find((item) => item.type === "quiz") || null;
                                  const lessonItems = section.items.filter(
                                    (item) => item.type !== "quiz",
                                  );

                                  return lessonItems.map((item) => {
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
                                  });
                                })()}
                                {(() => {
                                  const quizItem =
                                    section.items.find((item) => item.type === "quiz") || null;
                                  const quizLocked = quizItem
                                    ? isLessonLocked(quizItem, sectionIndex)
                                    : true;
                                  const isDemoQuiz = !quizItem;
                                  const canOpenQuiz = quizItem ? !quizLocked : !dayLocked;
                                  const isQuizActive = quizItem
                                    ? quizItem.active
                                    : activeDemoQuizSectionId === section.id;

                                  return (
                                    <div
                                      onClick={() =>
                                        canOpenQuiz &&
                                        (quizItem
                                          ? handleLessonClick(quizItem)
                                          : handleOpenDemoQuiz(section))
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
                                          {quizItem?.title ||
                                            `${normalizeDayLabel(section.day)} Quiz`}
                                        </span>
                                        <span className="text-[10px] font-medium flex items-center gap-1 mt-1 text-orange-600">
                                          <Clock className="w-3 h-3" />{" "}
                                          {quizItem?.duration ||
                                            (isDemoQuiz ? "Demo quiz preview" : "Day-wise quiz")}
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

                {/* AI Tool button — minimalist professional */}
                <div className="p-4 border-t border-slate-100 shrink-0">
                  <button
                    onClick={() => window.open(currentToolUrl, "_blank")}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium transition-all group"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-500 group-hover:rotate-12 transition-transform" />
                    <span>Open {currentToolName}</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-auto text-indigo-400" />
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Floating open-sidebar button — only when closed (hidden in fullscreen) */}
        {!isSidebarOpen && !isPageFullscreen && (
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
                className={`${isPageFullscreen ? 'w-screen h-screen fixed inset-0 z-[9999]' : 'w-full aspect-video rounded-2xl shadow-xl border border-slate-800 mb-6'} bg-slate-900 relative overflow-hidden`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  return false;
                }}
              >
                <SmartVideoPlayer
                  videoUrl={currentLesson.unifiedVideoUrl || currentLesson.videoUrl || ""}
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
                {/* Previous Button */}
                <button
                  onClick={handlePreviousLesson}
                  disabled={
                    curriculum.flatMap((section) => section.items).findIndex(
                      (l) => l.id === currentLesson?.id,
                    ) === 0
                  }
                  className="flex justify-center items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-indigo-500/25 active:scale-[0.97] shrink-0"
                  title="Go to previous lesson"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                {/* Next Button */}
                <button
                  onClick={handleMarkComplete}
                  className="flex justify-center items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-indigo-500/25 active:scale-[0.97] shrink-0"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

                {/* Overview */}
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

                  {(currentLesson?.objectives?.length ?? 0) > 0 && (
                    <div className="bg-indigo-50/60 rounded-xl p-5 border border-indigo-100">
                      <h4 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-600" />
                        Learning Objectives
                      </h4>

                      <ul className="space-y-3 text-sm text-indigo-800/80">
                        {currentLesson?.objectives?.map((objective, index) => (
                          <li key={index} className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5" />
                            {objective}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
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
        <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      }
    >
      <LearningPageContent />
    </Suspense>
  );
}
