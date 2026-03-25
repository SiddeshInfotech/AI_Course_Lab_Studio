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

const router = express.Router();

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

// Public thumbnail endpoint (better for caching)
router.get("/:id/thumbnail", getVideoThumbnail);

// All other video routes require admin authentication
router.use(authMiddleware, adminMiddleware);

// Video management routes
router.get("/", getAllVideos);
router.post("/upload", upload.single("video"), uploadVideo);
router.post("/external", addExternalVideo);
router.delete("/:id", deleteVideo);
router.put("/:id/link", linkVideoToLesson);

// Chunked upload routes
router.post("/chunk/init", initChunkedUpload);
router.post("/chunk/:sessionId/:chunkIndex", upload.single("chunk"), uploadVideoChunk);
router.post("/chunk/:sessionId/complete", completeChunkedUpload);
router.get("/chunk/:sessionId/status", getChunkedUploadStatus);
router.delete("/chunk/:sessionId", cancelChunkedUpload);

// Course and lesson selection helpers
router.get("/courses", getCoursesForVideo);
router.get("/courses/:courseId/lessons", getLessonsForVideo);

export default router;