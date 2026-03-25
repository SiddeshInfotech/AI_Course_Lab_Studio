import React from "react";
import { X, Upload, RefreshCw, ExternalLink, Link, Trash2, AlertCircle } from "lucide-react";

// Simple inline fix for the missing upload modal
// Append this JSX right before the closing </div> and ); of the main component

const MODAL_JSX = `
      {/* Upload Video Modal */}
      {activeModal === "upload" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Video</h3>
              <button
                onClick={() => {
                  setActiveModal(null);
                  resetUploadStates();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video File
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {uploadFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course (Optional)
                </label>
                <select
                  value={uploadCourse}
                  onChange={(e) => setUploadCourse(e.target.value === "" ? "" : parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {typeof uploadCourse === "number" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson (Optional)
                  </label>
                  <select
                    value={uploadLesson}
                    onChange={(e) => setUploadLesson(e.target.value === "" ? "" : parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Lesson</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.orderIndex}. {lesson.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Uploading...</span>
                    <span className="text-sm text-gray-600">
                      {chunkedUpload.uploadedChunks}/{chunkedUpload.totalChunks} chunks
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: chunkedUpload.progress + '%' }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setActiveModal(null);
                  resetUploadStates();
                }}
                disabled={uploading}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? 'Uploading...' : 'Upload Video'}
              </button>
            </div>
          </div>
        </div>
      )}
`;

// Create a manual fix by appending to the file