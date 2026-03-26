import express from "express";
import multer from "multer";
import {
    getAllVideos,
    uploadVideo,
    addExternalVideo,
    deleteVideo,
    getCoursesForVideo,
    getLessonsForVideo,
    linkVideoToLesson,
    getVideoThumbnail,
    initChunkedUpload,
    uploadVideoChunk,
    completeChunkedUpload,
    getChunkedUploadStatus,
    cancelChunkedUpload,
} from "../controllers/videoController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import { createMediaRateLimitMiddleware } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

// Rate limiting for video uploads
const uploadRateLimit = createMediaRateLimitMiddleware('video_upload');

// Configure multer for video uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max for videos
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "video/mp4",
            "video/webm",
            "video/ogg",
            "video/quicktime",
            "video/x-msvideo", // .avi
            "video/x-ms-wmv"   // .wmv
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid video format. Supported formats: MP4, WebM, OGG, QuickTime, AVI, WMV"), false);
        }
    }
});

// Multer error handling middleware (4 params for Express error handling)
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                message: 'File too large. Maximum size is 500MB.',
                error: 'FILE_TOO_LARGE',
                maxSize: '500MB'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                message: 'Unexpected file field. Please use "video" as the field name.',
                error: 'UNEXPECTED_FILE_FIELD'
            });
        }
        return res.status(400).json({
            message: `Upload error: ${err.message}`,
            error: err.code
        });
    }
    if (err) {
        console.error('Upload error:', err.message);
        return res.status(400).json({
            message: err.message || 'Upload failed',
            error: 'UPLOAD_ERROR'
        });
    }
    next();
};

// Wrapper to catch multer errors and pass them to error handler
const wrapMulterUpload = (uploadMiddleware) => {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err) {
                return handleMulterError(err, req, res, next);
            }
            next();
        });
    };
};

// Public thumbnail endpoint (better for caching)
router.get("/:id/thumbnail", getVideoThumbnail);

// All other video routes require admin authentication
router.use(authMiddleware, adminMiddleware);

// Video management routes
router.get("/", getAllVideos);
router.post("/upload", uploadRateLimit, wrapMulterUpload(upload.single("video")), uploadVideo);
router.post("/external", addExternalVideo);
router.delete("/:id", deleteVideo);
router.put("/:id/link", linkVideoToLesson);

// Chunked upload routes
router.post("/chunk/init", uploadRateLimit, initChunkedUpload);
router.post("/chunk/:sessionId/:chunkIndex", wrapMulterUpload(upload.single("chunk")), uploadVideoChunk);
router.post("/chunk/:sessionId/complete", completeChunkedUpload);
router.get("/chunk/:sessionId/status", getChunkedUploadStatus);
router.delete("/chunk/:sessionId", cancelChunkedUpload);

// Course and lesson selection helpers
router.get("/courses", getCoursesForVideo);
router.get("/courses/:courseId/lessons", getLessonsForVideo);

export default router;