"use client";

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  Play,
  Pause,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Loader,
  Languages,
} from "lucide-react";

export interface AudioTrack {
  language: string;
  label: string;
  url: string;
}

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  watermarkText?: string;
  audioTracks?: AudioTrack[];
  onVideoComplete?: () => void;
  onProgress?: (progress: number) => void;
  className?: string;
  autoPlay?: boolean;
}

export interface VideoPlayerHandle {
  togglePlay: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  ({ videoUrl, title, watermarkText, audioTracks, onVideoComplete, onProgress, className = "", autoPlay = false }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const hasCalledCompleteRef = useRef(false);
    const watermarkRef = useRef<HTMLDivElement | null>(null);
    const watermarkAnimRef = useRef<number | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isLimitExceeded, setIsLimitExceeded] = useState(false);
    const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
    const [showAudioSelector, setShowAudioSelector] = useState(false);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Audio tracks available for language switching
    const hasAudioTracks = audioTracks && audioTracks.length > 0;
    const currentAudioUrl = hasAudioTracks ? audioTracks[selectedTrackIndex]?.url : null;
    const hasMultipleLanguages = hasAudioTracks && audioTracks.length > 1;

    // Video is always from videoUrl prop (unifiedVideoUrl)
    // Audio comes from selected audio track
    const videoSourceUrl = videoUrl;

    // Simplified - skip usage limit checks for now
    const checkUsageLimit = async () => true;
    
    const sendHeartbeat = async () => {
      // Skip heartbeat for now
    };

    const startHeartbeat = () => {
      // Skip heartbeat for now
    };

    const stopHeartbeat = () => {
      // Skip heartbeat for now
    };

    useImperativeHandle(ref, () => ({
      togglePlay: () => {
        const video = videoRef.current;
        if (!video) return;
        if (isPlaying) {
          video.pause();
        } else {
          video.play();
        }
      },
      seek: (time: number) => {
        const video = videoRef.current;
        if (video) {
          video.currentTime = time;
        }
      },
      getCurrentTime: () => {
        return videoRef.current?.currentTime || 0;
      },
    }));

    useEffect(() => {
      if (autoPlay && videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    }, [autoPlay]);

    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      return () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
      };
    }, []);

    useEffect(() => {
      if (watermarkText && containerRef.current && !watermarkRef.current) {
        const watermark = document.createElement("div");
        watermark.className = "video-watermark";
        watermark.textContent = watermarkText;
        watermark.style.cssText = `
          position: absolute;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          opacity: 0.5;
          pointer-events: none;
          z-index: 10;
          font-family: Arial, sans-serif;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          white-space: nowrap;
        `;
        containerRef.current.appendChild(watermark);
        watermarkRef.current = watermark;

        let posX = 0;
        let posY = 0;
        let dirX = 1;
        let dirY = 1;

        const animate = () => {
          if (!watermarkRef.current) return;
          const maxX = containerRef.current!.clientWidth - watermarkRef.current.clientWidth - 20;
          const maxY = containerRef.current!.clientHeight - watermarkRef.current!.clientHeight - 20;
          posX += dirX * 1.5;
          posY += dirY * 1.5;
          if (posX >= maxX || posX <= 0) dirX *= -1;
          if (posY >= maxY || posY <= 0) dirY *= -1;
          watermarkRef.current.style.left = `${posX}px`;
          watermarkRef.current.style.top = `${posY}px`;
          watermarkAnimRef.current = requestAnimationFrame(animate);
        };

        animate();
      }

      return () => {
        if (watermarkAnimRef.current) {
          cancelAnimationFrame(watermarkAnimRef.current);
        }
        if (watermarkRef.current && containerRef.current) {
          containerRef.current.removeChild(watermarkRef.current);
          watermarkRef.current = null;
        }
      };
    }, [watermarkText]);

    // Sync audio when language changes while video is playing
    useEffect(() => {
      if (audioRef.current && currentAudioUrl && videoRef.current) {
        const videoTime = videoRef.current.currentTime;
        audioRef.current.currentTime = videoTime;
        if (isPlaying) {
          audioRef.current.play().catch(console.error);
        }
      }
    }, [selectedTrackIndex, currentAudioUrl, isPlaying]);

    // Reset completion flag when video source changes (new lesson)
    useEffect(() => {
      hasCalledCompleteRef.current = false;
      console.log("🔄 Video source changed, reset completion flag");
    }, [videoSourceUrl]);

    const handlePlayPause = async () => {
      const video = videoRef.current;
      const audio = audioRef.current;
      if (!video) return;

      if (isPlaying) {
        video.pause();
        if (audio) audio.pause();
      } else {
        const canPlay = await checkUsageLimit();
        if (!canPlay) {
          setError("You've reached your daily video watch limit of 2 hours. Come back tomorrow!");
          return;
        }
        video.play().catch((err) => {
          console.error("Play failed:", err);
          setError("Failed to play video. Please try again.");
        });
        // Also play the audio
        if (audio && currentAudioUrl) {
          audio.currentTime = video.currentTime;
          audio.volume = volume;
          audio.play().catch(console.error);
        }
      }
    };

    const handleTimeUpdate = () => {
      const video = videoRef.current;
      if (!video) return;
      setCurrentTime(video.currentTime);
      const progress = (video.currentTime / video.duration) * 100;
      onProgress?.(progress);

      // Video completion detection at 90%
      if (video.duration > 0 && progress >= 90 && !hasCalledCompleteRef.current) {
        console.log("🎬 Video progress reached 90%, marking as complete");
        hasCalledCompleteRef.current = true;
        onVideoComplete?.();
      }
    };

    // Handle audio completion as backup
    const handleAudioEnded = () => {
      const video = videoRef.current;
      if (video && !hasCalledCompleteRef.current) {
        console.log("🎵 Audio ended, checking if video is also complete");
        if (video.duration > 0 && (video.currentTime / video.duration) >= 0.9) {
          console.log("🎬 Video complete via audio end");
          hasCalledCompleteRef.current = true;
          onVideoComplete?.();
        }
      }
    };

    const handleLoadedMetadata = () => {
      const video = videoRef.current;
      if (!video) return;
      setDuration(video.duration);
      setIsLoading(false);
      // Sync audio duration with video
      if (audioRef.current && currentAudioUrl) {
        audioRef.current.volume = volume;
      }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      const progress = progressRef.current;
      if (!video || !progress) return;

      const rect = progress.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const newTime = pos * video.duration;
      video.currentTime = newTime;
      // Also seek audio to match
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      if (videoRef.current) {
        videoRef.current.volume = newVolume;
      }
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }
      setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
      if (isMuted) {
        if (videoRef.current) videoRef.current.muted = false;
        if (audioRef.current) audioRef.current.muted = false;
        setIsMuted(false);
      } else {
        if (videoRef.current) videoRef.current.muted = true;
        if (audioRef.current) audioRef.current.muted = true;
        setIsMuted(true);
      }
    };

    const toggleFullscreen = async () => {
      const container = containerRef.current;
      if (!container) return;

      try {
        if (!document.fullscreenElement) {
          await container.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.error("Fullscreen error:", err);
      }
    };

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    return (
      <div
        ref={containerRef}
        className={`relative bg-black rounded-xl overflow-hidden group ${className}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Main video element - muted, plays video without original audio */}
        <video
          ref={videoRef}
          src={videoSourceUrl}
          className="w-full aspect-video"
          muted
          onPlay={() => { 
            console.log("Video playing"); 
            setIsPlaying(true);
            // Sync audio with video
            if (audioRef.current && currentAudioUrl) {
              audioRef.current.currentTime = videoRef.current?.currentTime || 0;
              audioRef.current.play();
            }
          }}
          onPause={() => { 
            setIsPlaying(false);
            if (audioRef.current) audioRef.current.pause();
          }}
          onTimeUpdate={() => {
            handleTimeUpdate();
            // Sync audio position with video
            if (audioRef.current && videoRef.current) {
              const videoTime = videoRef.current.currentTime;
              if (Math.abs(audioRef.current.currentTime - videoTime) > 0.5) {
                audioRef.current.currentTime = videoTime;
              }
            }
          }}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={() => { console.log("Video waiting..."); setIsLoading(true); }}
          onCanPlay={() => { console.log("Video can play"); setIsLoading(false); }}
          onError={(e) => { console.log("Video error:", e); setError("Failed to load video"); }}
          onEnded={() => {
            setIsPlaying(false);
            if (audioRef.current) audioRef.current.pause();
            if (!hasCalledCompleteRef.current) {
              hasCalledCompleteRef.current = true;
              onVideoComplete?.();
            }
          }}
          playsInline
        />
        
        {/* Audio element - hidden, plays the selected language audio */}
        {currentAudioUrl && (
          <audio
            ref={audioRef}
            src={currentAudioUrl}
            muted={isMuted}
            preload="auto"
            onEnded={handleAudioEnded}
          />
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <Loader className="w-8 h-8 animate-spin text-white" />
          </div>
        )}

        {isLimitExceeded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30">
            <div className="text-center max-w-md px-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Daily Watch Limit Reached
              </h3>
              <p className="text-slate-300 mb-4">
                You've used your 2-hour daily video watch limit. Your progress has been saved.
              </p>
              <p className="text-sm text-slate-400">
                Come back tomorrow to continue learning!
              </p>
            </div>
          </div>
        )}

        {error && !isLimitExceeded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 z-10 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            ref={progressRef}
            className="h-1 bg-white/30 rounded-full mb-3 cursor-pointer group/progress"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-indigo-500 rounded-full relative transition-all"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayPause}
                disabled={isLimitExceeded}
                className="p-2 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>

              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="p-1">
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-white" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 accent-indigo-500"
                />
              </div>

              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasMultipleLanguages && (
                <div className="relative">
                  <button
                    onClick={() => setShowAudioSelector(!showAudioSelector)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    title="Select audio language"
                  >
                    <Languages className="w-4 h-4 text-white" />
                    <span className="text-white text-xs">
                      {audioTracks?.[selectedTrackIndex]?.label || "Language"}
                    </span>
                  </button>
                  {showAudioSelector && (
                    <div className="absolute bottom-full mb-2 right-0 bg-slate-800 rounded-lg shadow-lg py-1 min-w-[140px]">
                      {audioTracks?.map((track, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSelectedTrackIndex(index);
                            setShowAudioSelector(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${
                            selectedTrackIndex === index
                              ? "text-indigo-400 font-medium"
                              : "text-white"
                          }`}
                        >
                          {track?.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-white" />
                ) : (
                  <Maximize className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="absolute top-4 left-4 z-10">
          <h3 className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-lg">
            {title}
          </h3>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;