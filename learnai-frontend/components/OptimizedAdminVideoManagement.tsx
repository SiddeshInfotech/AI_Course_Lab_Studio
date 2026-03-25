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
    "upload" | "external" | "link" | "delete" | null
  >(null);
  const [selectedVideo, setSelectedVideo] = useState<OptimizedVideo | null>(null);

  // Upload states - enhanced for chunked upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCourse, setUploadCourse] = useState<number | "">("");
  const [uploadLesson, setUploadLesson] = useState<number | "">("");
  const [uploadTitle, setUploadTitle] = useState("");
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

      setVideos(response.videos);
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

  // Effects
  useEffect(() => {
    loadVideos(1);
    loadCourses();
  }, [loadVideos, loadCourses]);

  useEffect(() => {
    if (typeof uploadCourse === "number") {
      loadLessons(uploadCourse);
    } else {
      setLessons([]);
      setUploadLesson("");
    }
  }, [uploadCourse, loadLessons]);

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
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                VIDEO_TYPES.find(type => type.value === video.type)?.color
              }`}>
                {video.type === 'uploaded' ? <Upload className="w-3 h-3 mr-1" /> : <ExternalLink className="w-3 h-3 mr-1" />}
                {video.type}
              </span>
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
          {video.size && (
            <div className="flex items-center justify-between">
              <span>Size:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatBytes(video.size)}</span>
                {video.originalSize && video.originalSize !== video.size && (
                  <span className="text-green-600 text-xs">
                    (-{formatBytes(video.originalSize - video.size)})
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

          {video.processingTime && (
            <div className="flex items-center justify-between">
              <span>Processing:</span>
              <span className="font-medium">{formatTime(video.processingTime)}</span>
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
            {video.type === 'uploaded' && (
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
    </div>
  );
}