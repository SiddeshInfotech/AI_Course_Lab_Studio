"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api";

// Types
interface Video {
  id: number | string;
  type: "uploaded" | "external";
  title: string;
  mimeType?: string;
  size?: number;
  url: string;
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

interface VideoStats {
  uploadedVideos: number;
  externalVideos: number;
  totalVideos: number;
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

export default function AdminVideoManagement() {
  // State
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<
    "all" | "uploaded" | "external"
  >("all");
  const [selectedCourse, setSelectedCourse] = useState<number | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [videosPerPage] = useState(12);

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  // Form states
  const [uploadForm, setUploadForm] = useState({
    videoFile: null as File | null,
    courseId: "" as string,
    lessonId: "" as string,
    title: "",
    replaceExisting: false,
  });

  const [externalForm, setExternalForm] = useState({
    courseId: "" as string,
    lessonId: "" as string,
    videoUrl: "",
    title: "",
    description: "",
  });

  const [linkForm, setLinkForm] = useState({
    courseId: "" as string,
    lessonId: "" as string,
    replaceExisting: false,
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "processing" | "done" | "error"
  >("idle");

  // Link modal lessons (separate from upload/external modal lessons)
  const [linkLessons, setLinkLessons] = useState<Lesson[]>([]);

  // Load data
  useEffect(() => {
    loadVideoData();
    loadCourses();
  }, []);

  useEffect(() => {
    loadVideos();
  }, [currentPage, selectedType, selectedCourse, searchQuery]);

  useEffect(() => {
    if (uploadForm.courseId || externalForm.courseId) {
      const courseId = uploadForm.courseId || externalForm.courseId;
      if (courseId && courseId !== "") {
        loadLessons(parseInt(courseId));
      }
    }
  }, [uploadForm.courseId, externalForm.courseId]);

  const loadVideoData = async () => {
    try {
      const data = await api.admin.videos.list({
        page: 1,
        limit: videosPerPage,
      });
      setStats(data.stats);
      setVideos(data.videos);
      setError(null);
    } catch (err) {
      console.error("Failed to load video data:", err);
      setError("Failed to load video data");
    } finally {
      setLoading(false);
    }
  };

  const loadVideos = async () => {
    try {
      const params = {
        page: currentPage,
        limit: videosPerPage,
        ...(selectedType !== "all" && { type: selectedType }),
        ...(selectedCourse !== "all" && { courseId: selectedCourse as number }),
      };

      const data = await api.admin.videos.list(params);
      setVideos(data.videos);
    } catch (err) {
      console.error("Failed to load videos:", err);
      setError("Failed to load videos");
    }
  };

  const loadCourses = async () => {
    try {
      const data = await api.admin.videos.getCourses();
      setCourses(data.courses);
    } catch (err) {
      console.error("Failed to load courses:", err);
    }
  };

  const loadLessons = async (courseId: number) => {
    try {
      const data = await api.admin.videos.getLessons(courseId);
      setLessons(data.lessons);
    } catch (err) {
      console.error("Failed to load lessons:", err);
      setLessons([]);
    }
  };

  // Form handlers
  const handleUploadSubmit = async () => {
    if (!validateUploadForm()) return;

    setFormLoading(true);
    setUploadProgress(0);
    setUploadStatus("uploading");
    setError(null);

    try {
      // Use XMLHttpRequest for progress tracking
      const formData = new FormData();
      formData.append("video", uploadForm.videoFile!);
      if (uploadForm.courseId) formData.append("courseId", uploadForm.courseId);
      if (uploadForm.lessonId) formData.append("lessonId", uploadForm.lessonId);
      if (uploadForm.title) formData.append("title", uploadForm.title);
      if (uploadForm.replaceExisting)
        formData.append("replaceExisting", "true");

      const token = localStorage.getItem("token");
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Set timeout for large uploads (10 minutes)
        xhr.timeout = 10 * 60 * 1000;

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round(
              (event.loaded / event.total) * 100,
            );
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadStatus("processing");
            setTimeout(() => {
              setUploadStatus("done");
              resolve();
            }, 500);
          } else {
            // Handle HTTP errors
            let errorMessage = "Upload failed";
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMessage = errorData.message || errorMessage;
            } catch {
              // If response is not JSON, use status text
              if (xhr.status === 413) {
                errorMessage = "File too large. Maximum size is 500MB.";
              } else if (xhr.status === 401) {
                errorMessage = "Authentication failed. Please log in again.";
              } else if (xhr.status === 403) {
                errorMessage = "You don't have permission to upload videos.";
              } else if (xhr.status === 429) {
                errorMessage = "Too many uploads. Please wait before trying again.";
              } else if (xhr.status >= 500) {
                errorMessage = "Server error. Please try again later.";
              }
            }
            reject(new Error(errorMessage));
          }
        });

        xhr.addEventListener("error", () => {
          // Network errors (CORS, server down, no internet, etc.)
          console.error("XHR network error during upload");
          reject(new Error("Unable to connect to server. Please check your internet connection and try again."));
        });

        xhr.addEventListener("timeout", () => {
          reject(new Error("Upload timed out. Please try with a smaller file or check your connection."));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload was cancelled."));
        });

        xhr.open("POST", `${API_BASE_URL}/admin/videos/upload`);
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }
        xhr.send(formData);
      });

      resetModals();
      loadVideoData();
    } catch (err: unknown) {
      setUploadStatus("error");
      // Properly extract error message
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to upload video. Please try again.";
      console.error("Upload error:", err);
      setError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleExternalSubmit = async () => {
    if (!validateExternalForm()) return;

    setFormLoading(true);
    try {
      await api.admin.videos.addExternal({
        ...(externalForm.courseId && {
          courseId: parseInt(externalForm.courseId),
        }),
        lessonId: parseInt(externalForm.lessonId),
        videoUrl: externalForm.videoUrl,
        ...(externalForm.title && { title: externalForm.title }),
        ...(externalForm.description && {
          description: externalForm.description,
        }),
      });

      resetModals();
      loadVideoData();
    } catch (err) {
      setError((err as any)?.message || "Failed to add external video");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!selectedVideo) return;

    setFormLoading(true);
    try {
      await api.admin.videos.delete(selectedVideo.id, selectedVideo.type);
      resetModals();
      loadVideoData();
    } catch (err) {
      setError((err as any)?.message || "Failed to delete video");
    } finally {
      setFormLoading(false);
    }
  };

  const handleLinkVideo = async () => {
    if (!selectedVideo || !validateLinkForm()) return;

    setFormLoading(true);
    try {
      await api.admin.videos.linkToLesson(selectedVideo.id as number, {
        lessonId: parseInt(linkForm.lessonId),
        replaceExisting: linkForm.replaceExisting,
      });

      resetModals();
      loadVideoData();
    } catch (err) {
      setError((err as any)?.message || "Failed to link video");
    } finally {
      setFormLoading(false);
    }
  };

  // Validation
  const validateUploadForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!uploadForm.videoFile) errors.videoFile = "Please select a video file";
    if (!uploadForm.lessonId) errors.lessonId = "Please select a lesson";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateExternalForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!externalForm.videoUrl) errors.videoUrl = "Video URL is required";
    if (!externalForm.lessonId) errors.lessonId = "Please select a lesson";

    // URL validation
    if (externalForm.videoUrl) {
      try {
        new URL(externalForm.videoUrl);
      } catch {
        errors.videoUrl = "Please enter a valid URL";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateLinkForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!linkForm.courseId) errors.courseId = "Please select a course";
    if (!linkForm.lessonId) errors.lessonId = "Please select a lesson";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Modal helpers
  const openDeleteModal = (video: Video) => {
    setSelectedVideo(video);
    setShowDeleteModal(true);
  };

  const openLinkModal = async (video: Video) => {
    if (video.type !== "uploaded") return;
    setSelectedVideo(video);
    setLinkForm({ courseId: "", lessonId: "", replaceExisting: false });
    setLinkLessons([]);
    setShowLinkModal(true);
  };

  // Load lessons for link modal when course changes
  const handleLinkCourseChange = async (courseId: string) => {
    setLinkForm((prev) => ({ ...prev, courseId, lessonId: "" }));
    if (courseId) {
      try {
        const data = await api.admin.videos.getLessons(parseInt(courseId));
        setLinkLessons(data.lessons);
      } catch (err) {
        console.error("Failed to load lessons:", err);
        setLinkLessons([]);
      }
    } else {
      setLinkLessons([]);
    }
  };

  const resetModals = () => {
    setShowUploadModal(false);
    setShowExternalModal(false);
    setShowDeleteModal(false);
    setShowLinkModal(false);
    setSelectedVideo(null);
    setUploadForm({
      videoFile: null,
      courseId: "",
      lessonId: "",
      title: "",
      replaceExisting: false,
    });
    setExternalForm({
      courseId: "",
      lessonId: "",
      videoUrl: "",
      title: "",
      description: "",
    });
    setLinkForm({
      courseId: "",
      lessonId: "",
      replaceExisting: false,
    });
    setLinkLessons([]);
    setFormErrors({});
    setUploadProgress(0);
    setUploadStatus("idle");
  };

  // File size formatter
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Management</h1>
          <p className="text-gray-600 mt-1">
            Manage course videos and link them to lessons
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowExternalModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            Add External Video
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload Video
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Videos</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalVideos}
                </p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <FileVideo className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Uploaded Videos</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.uploadedVideos}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">External Videos</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.externalVideos}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <ExternalLink className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {VIDEO_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={selectedCourse}
            onChange={(e) =>
              setSelectedCourse(
                e.target.value === "all" ? "all" : parseInt(e.target.value),
              )
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>

          <button
            onClick={loadVideoData}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => {
          const videoType = VIDEO_TYPES.find((t) => t.value === video.type);

          return (
            <div
              key={video.id}
              className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Video Preview */}
              <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                {video.type === "uploaded" ? (
                  <video
                    className="w-full h-full object-cover"
                    preload="metadata"
                  >
                    <source src={video.url} type={video.mimeType} />
                  </video>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <ExternalLink className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      External Video
                    </span>
                  </div>
                )}

                {/* Play button overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 flex items-center justify-center transition-all">
                  <Play className="w-12 h-12 text-white opacity-0 hover:opacity-100 transition-opacity" />
                </div>

                {/* Type badge */}
                <div className="absolute top-2 right-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      videoType?.color || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {videoType?.label}
                  </span>
                </div>
              </div>

              {/* Video Info */}
              <div className="p-4">
                <div className="mb-3">
                  <h3
                    className="text-sm font-medium text-gray-900 truncate"
                    title={video.title}
                  >
                    {video.title}
                  </h3>
                  {video.size && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(video.size)} • {video.mimeType}
                    </p>
                  )}
                </div>

                {/* Course & Lesson Info */}
                {video.course && video.lesson && (
                  <div className="mb-3 space-y-1">
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <BookOpen className="w-3 h-3" />
                      <span className="truncate">{video.course.title}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Play className="w-3 h-3" />
                      <span className="truncate">
                        Lesson {video.lesson.orderIndex}: {video.lesson.title}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-900"
                      title="View video"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    {video.type === "uploaded" && (
                      <button
                        onClick={() => openLinkModal(video)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Link to lesson"
                      >
                        <Link className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => openDeleteModal(video)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Metadata */}
                <div className="mt-3 text-xs text-gray-400">
                  {new Date(video.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {videos.length === 0 && (
        <div className="text-center py-12">
          <FileVideo className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No videos found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by uploading your first video or adding an external
            video link.
          </p>
        </div>
      )}

      {/* Upload Video Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Upload Video
                </h2>
                <button
                  onClick={resetModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video File *
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) =>
                      setUploadForm((prev) => ({
                        ...prev,
                        videoFile: e.target.files?.[0] || null,
                      }))
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.videoFile
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                  />
                  {formErrors.videoFile && (
                    <p className="text-sm text-red-600 mt-1">
                      {formErrors.videoFile}
                    </p>
                  )}
                </div>

                {/* Course Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course
                  </label>
                  <select
                    value={uploadForm.courseId}
                    onChange={(e) => {
                      setUploadForm((prev) => ({
                        ...prev,
                        courseId: e.target.value,
                        lessonId: "",
                      }));
                      if (e.target.value) loadLessons(parseInt(e.target.value));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Course (Optional)</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lesson Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson *
                  </label>
                  <select
                    value={uploadForm.lessonId}
                    onChange={(e) =>
                      setUploadForm((prev) => ({
                        ...prev,
                        lessonId: e.target.value,
                      }))
                    }
                    disabled={!uploadForm.courseId}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.lessonId ? "border-red-300" : "border-gray-300"
                    } ${!uploadForm.courseId ? "bg-gray-100" : ""}`}
                  >
                    <option value="">Select Lesson</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.orderIndex}. {lesson.title}{" "}
                        {lesson.hasVideo ? "(Has Video)" : ""}
                      </option>
                    ))}
                  </select>
                  {formErrors.lessonId && (
                    <p className="text-sm text-red-600 mt-1">
                      {formErrors.lessonId}
                    </p>
                  )}
                </div>

                {/* Video Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video Title
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) =>
                      setUploadForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Optional: Custom video title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Replace Existing */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="replaceExisting"
                    checked={uploadForm.replaceExisting}
                    onChange={(e) =>
                      setUploadForm((prev) => ({
                        ...prev,
                        replaceExisting: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="replaceExisting"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Replace existing video in lesson
                  </label>
                </div>

                {/* Upload Progress */}
                {(uploadStatus === "uploading" || uploadStatus === "processing") && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-800">
                        {uploadStatus === "uploading"
                          ? `Uploading... ${uploadProgress}%`
                          : "Processing video..."}
                      </span>
                      {uploadStatus === "processing" && (
                        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                      )}
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          uploadStatus === "processing"
                            ? "bg-blue-500 animate-pulse w-full"
                            : "bg-blue-600"
                        }`}
                        style={{
                          width: uploadStatus === "uploading" ? `${uploadProgress}%` : "100%",
                        }}
                      />
                    </div>
                    {uploadStatus === "processing" && (
                      <p className="mt-2 text-xs text-blue-600">
                        Compressing and optimizing video for streaming...
                      </p>
                    )}
                  </div>
                )}

                {uploadStatus === "error" && (
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error || "Upload failed. Please try again."}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={resetModals}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadSubmit}
                    disabled={formLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {formLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Upload Video
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* External Video Modal */}
      {showExternalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Add External Video
                </h2>
                <button
                  onClick={resetModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Video URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video URL *
                  </label>
                  <input
                    type="url"
                    value={externalForm.videoUrl}
                    onChange={(e) =>
                      setExternalForm((prev) => ({
                        ...prev,
                        videoUrl: e.target.value,
                      }))
                    }
                    placeholder="https://youtube.com/watch?v=..."
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.videoUrl ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {formErrors.videoUrl && (
                    <p className="text-sm text-red-600 mt-1">
                      {formErrors.videoUrl}
                    </p>
                  )}
                </div>

                {/* Course Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course
                  </label>
                  <select
                    value={externalForm.courseId}
                    onChange={(e) => {
                      setExternalForm((prev) => ({
                        ...prev,
                        courseId: e.target.value,
                        lessonId: "",
                      }));
                      if (e.target.value) loadLessons(parseInt(e.target.value));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lesson Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson *
                  </label>
                  <select
                    value={externalForm.lessonId}
                    onChange={(e) =>
                      setExternalForm((prev) => ({
                        ...prev,
                        lessonId: e.target.value,
                      }))
                    }
                    disabled={!externalForm.courseId}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.lessonId ? "border-red-300" : "border-gray-300"
                    } ${!externalForm.courseId ? "bg-gray-100" : ""}`}
                  >
                    <option value="">Select Lesson</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.orderIndex}. {lesson.title}{" "}
                        {lesson.hasVideo ? "(Has Video)" : ""}
                      </option>
                    ))}
                  </select>
                  {formErrors.lessonId && (
                    <p className="text-sm text-red-600 mt-1">
                      {formErrors.lessonId}
                    </p>
                  )}
                </div>

                {/* Video Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Title
                  </label>
                  <input
                    type="text"
                    value={externalForm.title}
                    onChange={(e) =>
                      setExternalForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Optional: Update lesson title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={externalForm.description}
                    onChange={(e) =>
                      setExternalForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Optional: Lesson description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={resetModals}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExternalSubmit}
                    disabled={formLoading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {formLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    Add External Video
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 p-3 rounded-full mr-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  Delete Video
                </h3>
              </div>

              <p className="text-gray-500 mb-4">
                Are you sure you want to delete "{selectedVideo.title}"?
                {selectedVideo.type === "uploaded" &&
                  " This will permanently remove the video file."}
                {selectedVideo.lesson &&
                  " This video is currently linked to a lesson."}
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={resetModals}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteVideo}
                  disabled={formLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {formLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Video Modal */}
      {showLinkModal && selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full mr-3">
                  <Link className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  Link Video to Lesson
                </h3>
              </div>

              <p className="text-gray-500 mb-4">
                Link "{selectedVideo.title}" to a lesson
              </p>

              <div className="space-y-4">
                {/* Course Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course *
                  </label>
                  <select
                    value={linkForm.courseId}
                    onChange={(e) => handleLinkCourseChange(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.courseId ? "border-red-300" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select Course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  {formErrors.courseId && (
                    <p className="text-sm text-red-600 mt-1">
                      {formErrors.courseId}
                    </p>
                  )}
                </div>

                {/* Lesson Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson *
                  </label>
                  <select
                    value={linkForm.lessonId}
                    onChange={(e) =>
                      setLinkForm((prev) => ({
                        ...prev,
                        lessonId: e.target.value,
                      }))
                    }
                    disabled={!linkForm.courseId}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.lessonId ? "border-red-300" : "border-gray-300"
                    } ${!linkForm.courseId ? "bg-gray-100" : ""}`}
                  >
                    <option value="">Select Lesson</option>
                    {linkLessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.orderIndex}. {lesson.title}{" "}
                        {lesson.hasVideo ? "(Has Video)" : ""}
                      </option>
                    ))}
                  </select>
                  {formErrors.lessonId && (
                    <p className="text-sm text-red-600 mt-1">
                      {formErrors.lessonId}
                    </p>
                  )}
                </div>

                {/* Replace Existing */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="linkReplaceExisting"
                    checked={linkForm.replaceExisting}
                    onChange={(e) =>
                      setLinkForm((prev) => ({
                        ...prev,
                        replaceExisting: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="linkReplaceExisting"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Replace existing video in lesson
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <button
                  onClick={resetModals}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkVideo}
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {formLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link className="w-4 h-4" />
                  )}
                  Link Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
