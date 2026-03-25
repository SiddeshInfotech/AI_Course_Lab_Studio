"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Users,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  Eye,
  MoreVertical,
  RefreshCw,
  X,
  Save,
  Upload,
} from "lucide-react";
import { api } from "@/lib/api";

// Types
interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  level: string;
  imageUrl?: string;
  instructor: string;
  duration: string;
  createdAt: string;
  updatedAt: string;
  enrollmentCount: number;
  lessonCount: number;
}

interface CourseStats {
  totalCourses: number;
  coursesByLevel: Record<string, number>;
  coursesByCategory: Record<string, number>;
  recentCourses: Course[];
}

interface CourseEnrollment {
  enrollmentId: number;
  enrolledAt: string;
  student: {
    id: number;
    name: string;
    username: string;
    email: string;
    rollNumber: string | null;
    dob: string | null;
    created_at: string;
  };
}

interface CourseEnrollmentData {
  course: {
    id: number;
    title: string;
    category: string;
    level: string;
  };
  enrollments: CourseEnrollment[];
  totalEnrolled: number;
}

interface CourseFormData {
  title: string;
  description: string;
  category: string;
  level: string;
  imageUrl: string;
  instructor: string;
  duration: string;
}

const INITIAL_FORM_DATA: CourseFormData = {
  title: "",
  description: "",
  category: "",
  level: "beginner",
  imageUrl: "",
  instructor: "",
  duration: "",
};

const COURSE_LEVELS = [
  {
    value: "beginner",
    label: "Beginner",
    color: "bg-green-100 text-green-800",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    color: "bg-yellow-100 text-yellow-800",
  },
  { value: "advanced", label: "Advanced", color: "bg-red-100 text-red-800" },
];

const COURSE_CATEGORIES = [
  "AI/Machine Learning",
  "Web Development",
  "Mobile Development",
  "Data Science",
  "DevOps",
  "Cybersecurity",
  "Cloud Computing",
  "UI/UX Design",
  "Digital Marketing",
  "Business Analytics",
];

export default function AdminCourseManagement() {
  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [coursesPerPage] = useState(10);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEnrollmentsModal, setShowEnrollmentsModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Enrollment data
  const [enrollmentData, setEnrollmentData] = useState<CourseEnrollmentData | null>(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CourseFormData>(INITIAL_FORM_DATA);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<CourseFormData>>({});

  // Load data
  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadCourses();
  }, [currentPage, searchQuery, selectedCategory, selectedLevel]);

  const loadDashboardData = async () => {
    try {
      const [statsData, coursesData] = await Promise.all([
        api.admin.courses.stats(),
        api.admin.courses.detailed({ page: 1, limit: coursesPerPage }),
      ]);

      setStats(statsData.stats);
      setCourses(coursesData.courses);
      setError(null);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const params = {
        page: currentPage,
        limit: coursesPerPage,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCategory !== "all" && { category: selectedCategory }),
        ...(selectedLevel !== "all" && { level: selectedLevel }),
      };

      const data = await api.admin.courses.detailed(params);
      setCourses(data.courses);
    } catch (err) {
      console.error("Failed to load courses:", err);
      setError("Failed to load courses");
    }
  };

  // Form handlers
  const handleInputChange = (field: keyof CourseFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<CourseFormData> = {};

    if (!formData.title.trim()) errors.title = "Title is required";
    if (!formData.description.trim())
      errors.description = "Description is required";
    if (!formData.category.trim()) errors.category = "Category is required";
    if (!formData.instructor.trim())
      errors.instructor = "Instructor is required";
    if (!formData.duration.trim()) errors.duration = "Duration is required";

    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      errors.imageUrl = "Please enter a valid URL";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const handleCreateCourse = async () => {
    if (!validateForm()) return;

    setFormLoading(true);
    try {
      const result = await api.admin.courses.create(formData);

      if (result.success) {
        await loadDashboardData();
        setShowCreateModal(false);
        setFormData(INITIAL_FORM_DATA);
      }
    } catch (err) {
      setError(err.message || "Failed to create course");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!selectedCourse || !validateForm()) return;

    setFormLoading(true);
    try {
      const result = await api.admin.courses.update(
        selectedCourse.id,
        formData,
      );

      if (result.success) {
        await loadDashboardData();
        setShowEditModal(false);
        setSelectedCourse(null);
        setFormData(INITIAL_FORM_DATA);
      }
    } catch (err) {
      setError(err.message || "Failed to update course");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;

    setFormLoading(true);
    try {
      await api.admin.courses.delete(selectedCourse.id);
      await loadDashboardData();
      setShowDeleteModal(false);
      setSelectedCourse(null);
    } catch (err) {
      setError(err.message || "Failed to delete course");
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      imageUrl: course.imageUrl || "",
      instructor: course.instructor,
      duration: course.duration,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (course: Course) => {
    setSelectedCourse(course);
    setShowDeleteModal(true);
  };

  const openEnrollmentsModal = async (course: Course) => {
    setSelectedCourse(course);
    setShowEnrollmentsModal(true);
    setEnrollmentLoading(true);

    try {
      const data = await api.admin.courses.enrollments(course.id);
      setEnrollmentData(data);
    } catch (err) {
      console.error("Failed to load enrollments:", err);
      setError("Failed to load course enrollments");
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const resetModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowEnrollmentsModal(false);
    setSelectedCourse(null);
    setFormData(INITIAL_FORM_DATA);
    setFormErrors({});
    setEnrollmentData(null);
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
          <h1 className="text-2xl font-bold text-gray-900">
            Course Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage courses, lessons, and content
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Course
        </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Courses</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalCourses}
                </p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <BookOpen className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Beginner Courses</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.coursesByLevel.beginner || 0}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Intermediate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.coursesByLevel.intermediate || 0}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Advanced</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.coursesByLevel.advanced || 0}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            {COURSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Levels</option>
            {COURSE_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>

          <button
            onClick={loadCourses}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Instructor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {courses.map((course) => {
                const levelInfo = COURSE_LEVELS.find(
                  (l) => l.value === course.level,
                );

                return (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        {course.imageUrl ? (
                          <img
                            src={course.imageUrl}
                            alt={course.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {course.title}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {course.description.length > 60
                              ? `${course.description.substring(0, 60)}...`
                              : course.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Duration: {course.duration}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {course.category}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          levelInfo?.color || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {levelInfo?.label || course.level}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.instructor}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <button
                          onClick={() => openEnrollmentsModal(course)}
                          className="flex items-center hover:text-indigo-600 transition-colors cursor-pointer"
                          title={`View ${course.enrollmentCount} enrolled students`}
                        >
                          <Users className="w-4 h-4 mr-1" />
                          {course.enrollmentCount}
                        </button>
                        <div className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-1" />
                          {course.lessonCount}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(course)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit course"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(course)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {courses.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No courses found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first course.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Course Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {showCreateModal ? "Create New Course" : "Edit Course"}
                </h2>
                <button
                  onClick={resetModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.title ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="Enter course title"
                  />
                  {formErrors.title && (
                    <p className="text-sm text-red-600 mt-1">
                      {formErrors.title}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.description
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter course description"
                  />
                  {formErrors.description && (
                    <p className="text-sm text-red-600 mt-1">
                      {formErrors.description}
                    </p>
                  )}
                </div>

                {/* Category and Level */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        handleInputChange("category", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.category
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                    >
                      <option value="">Select Category</option>
                      {COURSE_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    {formErrors.category && (
                      <p className="text-sm text-red-600 mt-1">
                        {formErrors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Level *
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) =>
                        handleInputChange("level", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {COURSE_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Instructor and Duration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instructor *
                    </label>
                    <input
                      type="text"
                      value={formData.instructor}
                      onChange={(e) =>
                        handleInputChange("instructor", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.instructor
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                      placeholder="Enter instructor name"
                    />
                    {formErrors.instructor && (
                      <p className="text-sm text-red-600 mt-1">
                        {formErrors.instructor}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration *
                    </label>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) =>
                        handleInputChange("duration", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.duration
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                      placeholder="e.g., 4 weeks, 24 hours"
                    />
                    {formErrors.duration && (
                      <p className="text-sm text-red-600 mt-1">
                        {formErrors.duration}
                      </p>
                    )}
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      handleInputChange("imageUrl", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.imageUrl ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="https://example.com/image.jpg"
                  />
                  {formErrors.imageUrl && (
                    <p className="text-sm text-red-600 mt-1">
                      {formErrors.imageUrl}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetModals}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={
                      showCreateModal ? handleCreateCourse : handleUpdateCourse
                    }
                    disabled={formLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {formLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {showCreateModal ? "Create Course" : "Update Course"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 p-3 rounded-full mr-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  Delete Course
                </h3>
              </div>

              <p className="text-gray-500 mb-4">
                Are you sure you want to delete "{selectedCourse.title}"? This
                action cannot be undone.
              </p>

              {selectedCourse.enrollmentCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ This course has {selectedCourse.enrollmentCount} active
                    enrollments. Please unenroll all students before deleting.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={resetModals}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCourse}
                  disabled={formLoading || selectedCourse.enrollmentCount > 0}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {formLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enrollments Modal */}
      {showEnrollmentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Enrolled Students
                  </h2>
                  {enrollmentData && (
                    <p className="text-gray-600 mt-1">
                      {enrollmentData.course.title} • {enrollmentData.totalEnrolled} students enrolled
                    </p>
                  )}
                </div>
                <button
                  onClick={resetModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {enrollmentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <span className="ml-2 text-gray-600">Loading enrollments...</span>
                </div>
              ) : enrollmentData && enrollmentData.enrollments.length > 0 ? (
                <div className="overflow-y-auto max-h-[60vh]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Roll Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Enrolled Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date of Birth
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {enrollmentData.enrollments.map((enrollment) => (
                          <tr key={enrollment.enrollmentId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <span className="text-sm font-medium text-indigo-800">
                                      {enrollment.student.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {enrollment.student.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    @{enrollment.student.username}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {enrollment.student.rollNumber || "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {enrollment.student.email}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {new Date(enrollment.enrolledAt).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {enrollment.student.dob
                                  ? new Date(enrollment.student.dob).toLocaleDateString()
                                  : "—"
                                }
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No enrolled students
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This course has no students enrolled yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
