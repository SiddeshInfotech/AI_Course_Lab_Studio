"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  Search,
  Filter,
  Upload,
  Link,
  Play,
  Trash2,
  Eye,
  Download,
  FileVideo,
  ExternalLink,
  Users,
  BookOpen,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  Save,
  Monitor,
  ChevronDown,
  TrendingUp,
  Zap,
  HardDrive,
  Gauge,
  Image,
  Pause,
  PlayCircle,
  BarChart3,
  Languages,
  Music,
  FileAudio,
  Disc3,
} from "lucide-react";
import { api } from "@/lib/api";

// Types for optimized video system
interface OptimizedVideo {
  id: number | string;
  type: "uploaded" | "external";
  title: string;
  mimeType?: string;
  size?: number;
  originalSize?: number;
  compressionRatio?: number;
  isCompressed?: boolean;
  processingTime?: number;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
  isUnified?: boolean;
  audioTracks?: Array<{
    language: string;
    audioUrl: string;
  }>;
  lesson?: {
    id: number;
    title: string;
    orderIndex: number;
    courseId: number;
  } | null;
  course?: {
    id: number;
    title: string;
    category: string;
    level: string;
  } | null;
}

interface EnhancedVideoStats {
  uploadedVideos: number;
  externalVideos: number;
  totalVideos: number;
  // Enhanced storage statistics
  storageUsed: number;
  originalStorageSize: number;
  spaceSaved: number;
  compressionRatio: number;
  // Video-specific stats
  videoStorageUsed: number;
  videoOriginalSize: number;
  videoSpaceSaved: number;
  avgCompressionRatio: number;
  avgProcessingTime: number;
}

interface Course {
  id: number;
  title: string;
  category: string;
  level: string;
  lessonCount: number;
}

interface Lesson {
  id: number;
  title: string;
  orderIndex: number;
  duration: string | null;
  hasVideo: boolean;
  videoType: "uploaded" | "external" | null;
}

// Chunked upload state
interface ChunkedUploadState {
  sessionId: string | null;
  filename: string;
  totalChunks: number;
  uploadedChunks: number;
  progress: number;
  status: 'idle' | 'uploading' | 'assembling' | 'completed' | 'error';
  error?: string;
}

const VIDEO_TYPES = [
  { value: "all", label: "All Videos", color: "bg-gray-100 text-gray-800" },
  { value: "uploaded", label: "Uploaded", color: "bg-blue-100 text-blue-800" },
  {
    value: "external",
    label: "External",
    color: "bg-green-100 text-green-800",
  },
];

// Helper functions
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
};

// Enhanced statistics cards
const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: string;
  trend?: { value: number; isPositive: boolean };
}) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className={`flex items-center mt-2 text-sm ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`w-4 h-4 mr-1 ${trend.isPositive ? '' : 'rotate-180'}`} />
            {Math.abs(trend.value)}% vs last week
          </div>
        )}
      </div>
      <Icon className={`w-8 h-8 ${color.replace('text-', 'text-').replace('-600', '-500')}`} />
    </div>
  </div>
);

// Video thumbnail component with lazy loading
const VideoThumbnail = ({ video }: { video: OptimizedVideo }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (video.type === 'external' || !video.thumbnailUrl) {
    return (
      <div className="w-20 h-12 bg-gray-100 rounded flex items-center justify-center">
        <ExternalLink className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-20 h-12 bg-gray-100 rounded overflow-hidden relative">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Image className="w-4 h-4 text-gray-400" />
        </div>
      ) : (
        <img
          src={video.thumbnailUrl}
          alt={`${video.title} thumbnail`}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 group">
        <PlayCircle className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>
    </div>
  );
};

export default function OptimizedAdminVideoManagement() {
  // State
  const [videos, setVideos] = useState<OptimizedVideo[]>([]);
  const [stats, setStats] = useState<EnhancedVideoStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enhanced pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [videosPerPage] = useState(12); // Reduced for better performance

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "uploaded" | "external">("all");
  const [selectedCourse, setSelectedCourse] = useState<number | "all">("all");

  // Modal states
  const [activeModal, setActiveModal] = useState<
    "upload" | "external" | "link" | "delete" | "unified" | null
  >(null);
  const [selectedVideo, setSelectedVideo] = useState<OptimizedVideo | null>(null);

  // Unified upload states
  const [unifiedVideoFile, setUnifiedVideoFile] = useState<File | null>(null);
  const [unifiedAudioEnglish, setUnifiedAudioEnglish] = useState<File | null>(null);
  const [unifiedAudioHindi, setUnifiedAudioHindi] = useState<File | null>(null);
  const [unifiedAudioMarathi, setUnifiedAudioMarathi] = useState<File | null>(null);
  const [unifiedCourse, setUnifiedCourse] = useState<number | "">("");
  const [unifiedLesson, setUnifiedLesson] = useState<number | "">("");
  const [unifiedUploading, setUnifiedUploading] = useState(false);

  // Upload states - enhanced for chunked upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCourse, setUploadCourse] = useState<number | "">("");
  const [uploadLesson, setUploadLesson] = useState<number | "">("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadLanguage, setUploadLanguage] = useState<"english" | "hindi" | "marathi">("english");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Chunked upload state
  const [chunkedUpload, setChunkedUpload] = useState<ChunkedUploadState>({
    sessionId: null,
    filename: "",
    totalChunks: 0,
    uploadedChunks: 0,
    progress: 0,
    status: 'idle',
  });

  // Audio management state
  const [showAudioSection, setShowAudioSection] = useState(false);
  const [lessonsWithAudio, setLessonsWithAudio] = useState<any[]>([]);
  const [audioLoading, setAudioLoading] = useState(false);

  // External video states
  const [externalUrl, setExternalUrl] = useState("");
  const [externalTitle, setExternalTitle] = useState("");
  const [externalDescription, setExternalDescription] = useState("");
  const [externalCourse, setExternalCourse] = useState<number | "">("");
  const [externalLesson, setExternalLesson] = useState<number | "">("");

  // Link video states
  const [linkLesson, setLinkLesson] = useState<number | "">("");

  // Refs for optimizations
  const videoGridRef = useRef<HTMLDivElement>(null);

  // Memoized filtered videos for better performance
  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "all" || video.type === selectedType;
      const matchesCourse = selectedCourse === "all" ||
        (video.lesson?.courseId === selectedCourse);

      return matchesSearch && matchesType && matchesCourse;
    });
  }, [videos, searchQuery, selectedType, selectedCourse]);

  // Load data functions
  const loadVideos = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.admin.videos.list({
        page,
        limit: videosPerPage,
        type: selectedType !== "all" ? selectedType : undefined,
        courseId: selectedCourse !== "all" ? selectedCourse : undefined,
      });

      // Also fetch lessons with unified videos
      let unifiedVideos: any[] = [];
      try {
        const courses = await api.courses.list() as any;
        for (const course of courses) {
          const lessonsRes = await api.courses.getLessons(course.id) as any;
          const lessons = Array.isArray(lessonsRes) ? lessonsRes : (lessonsRes.lessons || []);
          
          for (const lesson of lessons) {
            if (lesson.unifiedVideoUrl) {
              // Parse audio tracks if they exist
              let audioTracks: any[] = [];
              if (lesson.audioTracks) {
                if (typeof lesson.audioTracks === 'string') {
                  try {
                    audioTracks = JSON.parse(lesson.audioTracks);
                  } catch {
                    audioTracks = [];
                  }
                } else if (Array.isArray(lesson.audioTracks)) {
                  audioTracks = lesson.audioTracks;
                }
              }
              
              unifiedVideos.push({
                id: `unified-${lesson.id}`,
                type: 'uploaded' as const,
                title: lesson.title || 'Unified Video',
                url: lesson.unifiedVideoUrl,
                createdAt: lesson.createdAt || lesson.updatedAt || new Date().toISOString(),
                isUnified: true,
                audioTracks: audioTracks,
                lesson: {
                  id: lesson.id,
                  title: lesson.title,
                  orderIndex: lesson.orderIndex,
                  courseId: course.id,
                },
                course: {
                  id: course.id,
                  title: course.title,
                  category: course.category,
                  level: course.level,
                },
              });
            }
          }
        }
      } catch (e) {
        console.error("Failed to load unified videos:", e);
      }

      // Combine regular videos with unified videos
      const allVideos = [...response.videos, ...unifiedVideos];
      setVideos(allVideos);
      setStats(response.stats);
      setCurrentPage(response.pagination.currentPage);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load videos");
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedCourse, videosPerPage]);

  const loadCourses = useCallback(async () => {
    try {
      const response = await api.admin.videos.getCourses();
      setCourses(response.courses);
    } catch (err) {
      console.error("Failed to load courses:", err);
    }
  }, []);

  const loadLessons = useCallback(async (courseId: number) => {
    try {
      const response = await api.admin.videos.getLessons(courseId);
      setLessons(response.lessons);
    } catch (err) {
      console.error("Failed to load lessons:", err);
      setLessons([]);
    }
  }, []);

  const loadAudioLessons = useCallback(async () => {
    try {
      setAudioLoading(true);
      const courses = await api.courses.list() as any;
      
      if (!courses || !Array.isArray(courses)) {
        console.error("Invalid courses response:", courses);
        setLessonsWithAudio([]);
        return;
      }
      
      const allLessons: any[] = [];
      
      for (const course of courses) {
        const lessonsRes = await api.courses.getLessons(course.id) as any;
        // lessonsRes might be { lessons: [...] } or just [...]
        const lessons = Array.isArray(lessonsRes) ? lessonsRes : (lessonsRes?.lessons || []);
        
        for (const lesson of lessons) {
          // Parse audioTracks if it's a JSON string
          let audioTracks = lesson.audioTracks;
          if (typeof audioTracks === 'string') {
            try {
              audioTracks = JSON.parse(audioTracks);
            } catch {
              audioTracks = [];
            }
          }
          
          if (lesson.unifiedVideoUrl && audioTracks && Array.isArray(audioTracks) && audioTracks.length > 0) {
            allLessons.push({
              id: lesson.id,
              title: lesson.title,
              orderIndex: lesson.orderIndex,
              courseId: course.id,
              courseTitle: course.title,
              audioTracks: audioTracks,
            });
          }
        }
      }
      setLessonsWithAudio(allLessons);
    } catch (err) {
      console.error("Failed to load audio lessons:", err);
      // Show more helpful error message
      if (err instanceof TypeError && err.message.includes("fetch")) {
        alert("Cannot connect to server. Please ensure the backend server is running on port 5001.");
      }
    } finally {
      setAudioLoading(false);
    }
  }, []);

  // Effects
  useEffect(() => {
    loadVideos(1);
    loadCourses();
  }, [loadVideos, loadCourses]);

  useEffect(() => {
    if (showAudioSection && lessonsWithAudio.length === 0) {
      loadAudioLessons();
    }
  }, [showAudioSection, loadAudioLessons, lessonsWithAudio.length]);

  useEffect(() => {
    if (typeof uploadCourse === "number") {
      loadLessons(uploadCourse);
    } else {
      setLessons([]);
      setUploadLesson("");
    }
  }, [uploadCourse, loadLessons]);

  useEffect(() => {
    if (typeof unifiedCourse === "number") {
      loadLessons(unifiedCourse);
    } else {
      setLessons([]);
      setUnifiedLesson("");
    }
  }, [unifiedCourse, loadLessons]);

  useEffect(() => {
    if (typeof externalCourse === "number") {
      loadLessons(externalCourse);
    } else {
      setLessons([]);
      setExternalLesson("");
    }
  }, [externalCourse, loadLessons]);

  // Reset states when closing modals
  const resetUploadStates = useCallback(() => {
    setUploadFile(null);
    setUploadCourse("");
    setUploadLesson("");
    setUploadTitle("");
    setUploadLanguage("english");
    setReplaceExisting(false);
    setUploading(false);
    setChunkedUpload({
      sessionId: null,
      filename: "",
      totalChunks: 0,
      uploadedChunks: 0,
      progress: 0,
      status: 'idle',
    });
  }, []);

  const resetExternalStates = useCallback(() => {
    setExternalUrl("");
    setExternalTitle("");
    setExternalDescription("");
    setExternalCourse("");
    setExternalLesson("");
  }, []);

  const resetLinkStates = useCallback(() => {
    setLinkLesson("");
  }, []);

  // Chunked upload implementation
  const performChunkedUpload = useCallback(async (file: File) => {
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    try {
      // Initialize chunked upload
      const initResponse = await api.admin.videos.initChunkedUpload({
        filename: file.name,
        mimeType: file.type,
        totalSize: file.size,
      });

      const { sessionId } = initResponse.upload;

      setChunkedUpload({
        sessionId,
        filename: file.name,
        totalChunks,
        uploadedChunks: 0,
        progress: 0,
        status: 'uploading',
      });

      // Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        await api.admin.videos.uploadChunk({
          sessionId,
          chunkIndex: i,
          chunkData: chunk,
        });

        setChunkedUpload(prev => ({
          ...prev,
          uploadedChunks: i + 1,
          progress: ((i + 1) / totalChunks) * 100,
        }));
      }

      // Complete upload
      setChunkedUpload(prev => ({ ...prev, status: 'assembling' }));

      const completeResponse = await api.admin.videos.completeChunkedUpload({
        sessionId,
        courseId: typeof uploadCourse === 'number' ? uploadCourse : undefined,
        lessonId: typeof uploadLesson === 'number' ? uploadLesson : undefined,
        title: uploadTitle || undefined,
        replaceExisting,
      });

      setChunkedUpload(prev => ({ ...prev, status: 'completed' }));

      return completeResponse;
    } catch (err) {
      setChunkedUpload(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Upload failed',
      }));
      throw err;
    }
  }, [uploadCourse, uploadLesson, uploadTitle, replaceExisting]);

  // Upload handlers - enhanced for chunked upload
  const handleUpload = async () => {
    if (!uploadFile) return;

    setUploading(true);
    try {
      let response;

      // If lesson and language are selected, use language-specific endpoint
      if (typeof uploadLesson === 'number' && uploadLesson > 0) {
        const token = localStorage.getItem("token");
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";
        
        const formData = new FormData();
        formData.append("video", uploadFile);
        formData.append("language", uploadLanguage);
        
        const response = await fetch(
          `${API_BASE_URL}/courses/${uploadCourse}/lessons/${uploadLesson}/upload-video`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Upload failed" }));
          throw new Error(errorData.message || "Failed to upload video");
        }

        const result = await response.json();
        alert(
          `${uploadLanguage.charAt(0).toUpperCase() + uploadLanguage.slice(1)} video uploaded successfully!\n\n` +
          `Lesson: ${lessons.find(l => l.id === uploadLesson)?.title || 'Unknown'}\n` +
          `Language: ${uploadLanguage}`
        );
      } else {
        // Use chunked upload for large files (>50MB)
        if (uploadFile.size > 50 * 1024 * 1024) {
          response = await performChunkedUpload(uploadFile);
        } else {
          // Regular upload for smaller files
          response = await api.admin.videos.upload({
            videoFile: uploadFile,
            courseId: typeof uploadCourse === 'number' ? uploadCourse : undefined,
            lessonId: typeof uploadLesson === 'number' ? uploadLesson : undefined,
            title: uploadTitle || undefined,
            replaceExisting,
          });
        }

        // Show success message with optimization stats
        if (response.optimization) {
          const { originalSizeMB, compressedSizeMB, spaceSavedMB, compressionRatio, processingTime } = response.optimization;
          alert(
            `Video uploaded successfully!\n\n` +
            `Original size: ${originalSizeMB}MB\n` +
            `Compressed size: ${compressedSizeMB}MB\n` +
            `Space saved: ${spaceSavedMB}MB (${100 - compressionRatio}%)\n` +
            `Processing time: ${formatTime(processingTime)}`
          );
        }
      }

      setActiveModal(null);
      resetUploadStates();
      loadVideos(currentPage);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  const handleAddExternal = async () => {
    if (!externalUrl || !externalLesson) return;

    try {
      await api.admin.videos.addExternal({
        courseId: typeof externalCourse === 'number' ? externalCourse : undefined,
        lessonId: externalLesson as number,
        videoUrl: externalUrl,
        title: externalTitle || undefined,
        description: externalDescription || undefined,
      });

      setActiveModal(null);
      resetExternalStates();
      loadVideos(currentPage);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add external video");
    }
  };

  const handleLinkVideo = async () => {
    if (!selectedVideo || !linkLesson) return;

    try {
      await api.admin.videos.linkToLesson(selectedVideo.id as number, {
        lessonId: linkLesson as number,
        replaceExisting: replaceExisting,
      });

      setActiveModal(null);
      resetLinkStates();
      setSelectedVideo(null);
      loadVideos(currentPage);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to link video");
    }
  };

  const handleDeleteVideo = async () => {
    if (!selectedVideo) return;

    try {
      await api.admin.videos.delete(selectedVideo.id, selectedVideo.type);
      setActiveModal(null);
      setSelectedVideo(null);
      loadVideos(currentPage);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete video");
    }
  };

  // Render enhanced statistics
  const renderStats = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Videos"
          value={stats.totalVideos}
          subtitle={`${stats.uploadedVideos} uploaded, ${stats.externalVideos} external`}
          icon={FileVideo}
          color="text-blue-600"
        />
        <StatCard
          title="Storage Used"
          value={formatBytes(stats.videoStorageUsed)}
          subtitle={`${formatBytes(stats.videoSpaceSaved)} saved by compression`}
          icon={HardDrive}
          color="text-green-600"
        />
        <StatCard
          title="Avg Compression"
          value={`${Math.round((1 - stats.avgCompressionRatio) * 100)}%`}
          subtitle={`${Math.round(stats.avgProcessingTime / 1000)}s avg processing`}
          icon={Zap}
          color="text-purple-600"
        />
        <StatCard
          title="Storage Efficiency"
          value={`${Math.round((stats.videoSpaceSaved / stats.videoOriginalSize) * 100)}%`}
          subtitle={`${formatBytes(stats.videoOriginalSize)} → ${formatBytes(stats.videoStorageUsed)}`}
          icon={BarChart3}
          color="text-orange-600"
        />
      </div>
    );
  };

  // Render video card with enhanced information
  const renderVideoCard = (video: OptimizedVideo) => (
    <div key={video.id} className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md">
      <div className="p-4">
        {/* Video thumbnail and preview */}
        <div className="flex items-start gap-4 mb-3">
          <VideoThumbnail video={video} />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate" title={video.title}>
              {video.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {video.isUnified ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <Languages className="w-3 h-3 mr-1" />
                  Unified
                </span>
              ) : (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  VIDEO_TYPES.find(type => type.value === video.type)?.color
                }`}>
                  {video.type === 'uploaded' ? <Upload className="w-3 h-3 mr-1" /> : <ExternalLink className="w-3 h-3 mr-1" />}
                  {video.type}
                </span>
              )}
              {video.isCompressed && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <Zap className="w-3 h-3 mr-1" />
                  Compressed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Video details */}
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          {/* Unified Video - Show audio tracks */}
          {video.isUnified && video.audioTracks && video.audioTracks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-gray-100">
              {video.audioTracks.map((track, idx) => (
                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                  <Music className="w-3 h-3 mr-1" />
                  {track.language === 'en' ? 'EN' : track.language === 'hi' ? 'HI' : track.language === 'mr' ? 'MR' : track.language}
                </span>
              ))}
            </div>
          )}

          {video.size && (
            <div className="flex items-center justify-between">
              <span>Size:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatBytes(video.size)}</span>
                {video.originalSize && video.originalSize !== video.size && (
                  <span className="text-green-600 text-xs">
                    (-{Math.round((1 - video.size / video.originalSize) * 100)}%)
                  </span>
                )}
              </div>
            </div>
          )}

          {video.compressionRatio && video.compressionRatio < 1 && (
            <div className="flex items-center justify-between">
              <span>Compression:</span>
              <span className="font-medium text-green-600">
                {Math.round((1 - video.compressionRatio) * 100)}% saved
              </span>
            </div>
          )}

          {video.course && (
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span className="truncate">{video.course.title}</span>
            </div>
          )}

          {video.lesson && (
            <div className="flex items-center gap-1">
              <Play className="w-4 h-4" />
              <span className="truncate">Lesson {video.lesson.orderIndex}: {video.lesson.title}</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{new Date(video.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="View Video"
              onClick={() => window.open(video.url, '_blank')}
            >
              <Eye className="w-4 h-4" />
            </button>
            {video.isUnified && video.audioTracks && video.audioTracks.length > 0 && (
              video.audioTracks.map((track, idx) => (
                <button
                  key={idx}
                  className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                  title={`Play ${track.language} audio`}
                  onClick={() => window.open(track.audioUrl, '_blank')}
                >
                  <Music className="w-4 h-4" />
                </button>
              ))
            )}
            {video.type === 'uploaded' && !video.isUnified && (
              <>
                <button
                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                  title="Link to Lesson"
                  onClick={() => {
                    setSelectedVideo(video);
                    setActiveModal("link");
                  }}
                >
                  <Link className="w-4 h-4" />
                </button>
                <button
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Download"
                  onClick={() => window.open(video.url, '_blank')}
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <button
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete Video"
            onClick={() => {
              setSelectedVideo(video);
              setActiveModal("delete");
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // Main render method
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Optimized Video Management</h1>
          <p className="text-gray-600 mt-1">
            Manage videos with compression, thumbnails, and chunked uploads
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveModal("unified")}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Languages className="w-4 h-4" />
            Unified Upload
          </button>
          <button
            onClick={() => setActiveModal("upload")}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Video
          </button>
          <button
            onClick={() => setActiveModal("external")}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Add External
          </button>
        </div>
      </div>

      {/* Enhanced Statistics */}
      {renderStats()}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as "all" | "uploaded" | "external")}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {VIDEO_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>

            <button
              onClick={() => loadVideos(currentPage)}
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading optimized videos...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Enhanced Video Grid */}
      {!loading && !error && (
        <>
          <div
            ref={videoGridRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6"
          >
            {filteredVideos.map(renderVideoCard)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => loadVideos(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => loadVideos(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}

          {/* Empty state */}
          {filteredVideos.length === 0 && (
            <div className="text-center py-12">
              <FileVideo className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
              <p className="text-gray-600 mb-6">
                {videos.length === 0
                  ? "Get started by uploading your first video with automatic compression."
                  : "Try adjusting your search or filters."}
              </p>
              {videos.length === 0 && (
                <button
                  onClick={() => setActiveModal("upload")}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                >
                  <Upload className="w-5 h-5" />
                  Upload Your First Video
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Audio Tracks Section Toggle */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setShowAudioSection(!showAudioSection)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
            showAudioSection
              ? "bg-purple-600 text-white border-purple-600"
              : "bg-white text-purple-600 border-purple-200 hover:border-purple-400"
          }`}
        >
          <Music className="w-4 h-4" />
          {showAudioSection ? "Hide Audio Tracks" : "View Audio Tracks"}
        </button>
      </div>

      {/* Audio Tracks Section */}
      {showAudioSection && (
        <div className="space-y-4">
          {audioLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              <span className="ml-3 text-slate-600">Loading audio tracks...</span>
            </div>
          ) : lessonsWithAudio.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <Music className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No audio tracks found</h3>
              <p className="text-slate-500">Upload unified videos to add audio tracks in multiple languages.</p>
            </div>
          ) : (
            <>
              {/* Audio Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-50 rounded-lg">
                      <FileAudio className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{lessonsWithAudio.length}</p>
                      <p className="text-xs text-slate-500">Lessons</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-50 rounded-lg">
                      <Disc3 className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">
                        {lessonsWithAudio.reduce((acc, l) => acc + l.audioTracks.length, 0)}
                      </p>
                      <p className="text-xs text-slate-500">Tracks</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 rounded-lg">
                      <Languages className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">
                        {[...new Set(lessonsWithAudio.flatMap(l => l.audioTracks.map((t: any) => t.language)))].length}
                      </p>
                      <p className="text-xs text-slate-500">Languages</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audio List */}
              {lessonsWithAudio.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">{lesson.title}</h3>
                      <p className="text-sm text-slate-500">
                        {lesson.courseTitle} • Lesson {lesson.orderIndex}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-lg">
                      {lesson.audioTracks.length} tracks
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lesson.audioTracks.map((track: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Music className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="flex-1 text-sm font-medium text-slate-700">
                          {track.language === 'en' ? 'English' : track.language === 'hi' ? 'Hindi' : track.language === 'mr' ? 'Marathi' : track.language}
                        </span>
                        <button
                          onClick={() => window.open(track.audioUrl, '_blank')}
                          className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* MODALS - Upload, External, Link, Delete */}
      {/* ============================================ */}
      
      {/* Upload Modal */}
      {activeModal === "upload" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Upload Video</h3>
              <button 
                onClick={() => { setActiveModal(null); resetUploadStates(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Video File
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadFile(file);
                      if (!uploadTitle) {
                        setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
                      }
                    }
                  }}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                  "
                />
                {uploadFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {uploadFile.name} ({formatBytes(uploadFile.size)})
                  </p>
                )}
              </div>

              {/* Video Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Title (optional)
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Enter video title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Course
                </label>
                <select
                  value={uploadCourse}
                  onChange={(e) => {
                    setUploadCourse(e.target.value === "" ? "" : Number(e.target.value));
                    setUploadLesson("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lesson Selection */}
              {uploadCourse && lessons.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Lesson
                  </label>
                  <select
                    value={uploadLesson}
                    onChange={(e) => setUploadLesson(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a lesson (optional)</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        Lesson {lesson.orderIndex}: {lesson.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Video Language Selection */}
              {uploadLesson && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Language *
                  </label>
                  <select
                    value={uploadLanguage}
                    onChange={(e) => setUploadLanguage(e.target.value as "english" | "hindi" | "marathi")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="english">English</option>
                    <option value="hindi">Hindi</option>
                    <option value="marathi">Marathi</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the language of this video. You can upload videos in other languages for the same lesson.
                  </p>
                </div>
              )}

              {/* Replace Existing */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="replaceExisting"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="replaceExisting" className="text-sm text-gray-700">
                  Replace existing video if lesson already has one
                </label>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-blue-700">Uploading and processing video...</span>
                  </div>
                  {chunkedUpload.status !== 'idle' && (
                    <div className="mt-2">
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${chunkedUpload.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        {chunkedUpload.status === 'uploading' && `Uploading: ${chunkedUpload.uploadedChunks}/${chunkedUpload.totalChunks} chunks`}
                        {chunkedUpload.status === 'assembling' && 'Processing video...'}
                        {chunkedUpload.status === 'completed' && 'Complete!'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setActiveModal(null); resetUploadStates(); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Video
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* External Video Modal */}
      {activeModal === "external" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add External Video</h3>
              <button 
                onClick={() => { setActiveModal(null); resetExternalStates(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Video URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video URL
                </label>
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Video Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={externalTitle}
                  onChange={(e) => setExternalTitle(e.target.value)}
                  placeholder="Enter video title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={externalDescription}
                  onChange={(e) => setExternalDescription(e.target.value)}
                  placeholder="Enter video description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Course
                </label>
                <select
                  value={externalCourse}
                  onChange={(e) => {
                    setExternalCourse(e.target.value === "" ? "" : Number(e.target.value));
                    setExternalLesson("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lesson Selection */}
              {externalCourse && lessons.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Lesson
                  </label>
                  <select
                    value={externalLesson}
                    onChange={(e) => setExternalLesson(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select a lesson</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        Lesson {lesson.orderIndex}: {lesson.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setActiveModal(null); resetExternalStates(); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExternal}
                disabled={!externalUrl || !externalLesson}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Add External Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Video Modal */}
      {activeModal === "link" && selectedVideo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Link Video to Lesson</h3>
              <button 
                onClick={() => { setActiveModal(null); setSelectedVideo(null); resetLinkStates(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Selected Video Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Selected Video:</p>
                <p className="font-medium text-gray-900">{selectedVideo.title}</p>
                {selectedVideo.size && (
                  <p className="text-xs text-gray-500">{formatBytes(selectedVideo.size)}</p>
                )}
              </div>

              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Course
                </label>
                <select
                  value={uploadCourse}
                  onChange={(e) => {
                    setUploadCourse(e.target.value === "" ? "" : Number(e.target.value));
                    setLinkLesson("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lesson Selection */}
              {uploadCourse && lessons.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Lesson
                  </label>
                  <select
                    value={linkLesson}
                    onChange={(e) => setLinkLesson(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a lesson</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id} disabled={lesson.hasVideo}>
                        Lesson {lesson.orderIndex}: {lesson.title} {lesson.hasVideo ? '(has video)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Replace Existing */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="linkReplaceExisting"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="linkReplaceExisting" className="text-sm text-gray-700">
                  Replace existing video if lesson already has one
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setActiveModal(null); setSelectedVideo(null); resetLinkStates(); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLinkVideo}
                disabled={!linkLesson}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Link className="w-4 h-4" />
                Link Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Video Modal */}
      {activeModal === "delete" && selectedVideo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Video
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Are you sure you want to delete <strong>"{selectedVideo.title}"</strong>?
                This action cannot be undone.
              </p>
              
              {selectedVideo.lesson && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This video is linked to a lesson. 
                    Deleting it will remove the video from the lesson.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setActiveModal(null); setSelectedVideo(null); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVideo}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Video Upload Modal */}
      {activeModal === "unified" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Unified Video Upload</h3>
              <button 
                onClick={() => { setActiveModal(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Upload a video with multiple audio tracks for different languages.
              </p>

              {/* Video File */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video File *
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setUnifiedVideoFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>

              {/* Audio Tracks */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    English Audio
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setUnifiedAudioEnglish(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hindi Audio
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setUnifiedAudioHindi(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-orange-50 file:text-orange-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marathi Audio
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setUnifiedAudioMarathi(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-emerald-50 file:text-emerald-700"
                  />
                </div>
              </div>

              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Course *
                </label>
                <select
                  value={unifiedCourse}
                  onChange={(e) => {
                    setUnifiedCourse(e.target.value === "" ? "" : Number(e.target.value));
                    setUnifiedLesson("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lesson Selection */}
              {unifiedCourse && lessons.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Lesson *
                  </label>
                  <select
                    value={unifiedLesson}
                    onChange={(e) => setUnifiedLesson(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a lesson</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        Lesson {lesson.orderIndex}: {lesson.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {unifiedUploading && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
                    <span className="text-purple-700">Uploading unified video...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setActiveModal(null); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!unifiedVideoFile || !unifiedCourse || !unifiedLesson) {
                    alert("Please fill all required fields");
                    return;
                  }
                  setUnifiedUploading(true);
                  try {
                    const formData = new FormData();
                    formData.append("video", unifiedVideoFile);
                    if (unifiedAudioEnglish) formData.append("audioEnglish", unifiedAudioEnglish);
                    if (unifiedAudioHindi) formData.append("audioHindi", unifiedAudioHindi);
                    if (unifiedAudioMarathi) formData.append("audioMarathi", unifiedAudioMarathi);

                    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";
                    const response = await fetch(`${apiBaseUrl}/courses/${unifiedCourse}/lessons/${unifiedLesson}/upload-unified-video`, {
                      method: "POST",
                      headers: {
                        "Authorization": `Bearer ${localStorage.getItem("token")}`,
                      },
                      body: formData,
                    });

                    if (!response.ok) throw new Error("Upload failed");

                    alert("Unified video uploaded successfully!");
                    setActiveModal(null);
                    loadVideos(currentPage);
                  } catch (err) {
                    alert(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setUnifiedUploading(false);
                  }
                }}
                disabled={!unifiedVideoFile || !unifiedCourse || !unifiedLesson || unifiedUploading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Languages className="w-4 h-4" />
                Upload Unified Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}