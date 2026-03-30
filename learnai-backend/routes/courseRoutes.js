import express from "express";
import multer from "multer";
import {
    listCourses,
    listEnrolledCourses,
    getCourse,
    getCourseContent,
    addCourse,
    editCourse,
    removeCourse,
    updateCourseStatus,
    enroll,
    listLessons,
    addLesson,
    editLesson,
    removeLesson,
    getAdminCourseStats,
    getAdminCourseList,
    getCourseEnrollments,
    uploadLessonVideo,
    uploadUnifiedVideo,
} from "../controllers/courseController.js";
import {
    createCourseFromTools,
    getAvailableToolMappings,
} from "../controllers/courseGenerator.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import accessLimitMiddleware from "../middleware/accessLimitMiddleware.js";

const router = express.Router();

// Configure multer for video uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max for videos
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("video/")) {
            cb(null, true);
        } else {
            cb(new Error("Only video files are allowed"));
        }
    },
});

// Configure multer for unified video + audio uploads
const unifiedUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["video/", "audio/"];
        if (allowedTypes.some(type => file.mimetype.startsWith(type))) {
            cb(null, true);
        } else {
            cb(new Error("Only video and audio files are allowed"));
        }
    },
});

// Course routes (CRUD operations require admin privileges)
router.get("/", listCourses);
router.get("/enrolled", authMiddleware, listEnrolledCourses);
router.get("/:id", getCourse);
router.get("/:id/content", authMiddleware, accessLimitMiddleware, getCourseContent);
router.post("/", authMiddleware, adminMiddleware, addCourse);
router.put("/:id", authMiddleware, adminMiddleware, editCourse);
router.patch("/:id/status", authMiddleware, adminMiddleware, updateCourseStatus);
router.delete("/:id", authMiddleware, adminMiddleware, removeCourse);
router.post("/:id/enroll", authMiddleware, enroll);

// Admin: Course management and statistics
router.get("/admin/stats", authMiddleware, adminMiddleware, getAdminCourseStats);
router.get("/admin/detailed", authMiddleware, adminMiddleware, getAdminCourseList);
router.get("/admin/enrollments/:courseId", authMiddleware, adminMiddleware, getCourseEnrollments);
router.get("/admin/mappings", authMiddleware, adminMiddleware, getAvailableToolMappings);
router.post("/admin/generate-from-tools", authMiddleware, adminMiddleware, createCourseFromTools);

// Lesson routes (CRUD operations require admin privileges)
router.get("/:id/lessons", listLessons);
router.post("/:id/lessons", authMiddleware, adminMiddleware, addLesson);
router.put("/:courseId/lessons/:lessonId", authMiddleware, adminMiddleware, editLesson);
router.delete("/:courseId/lessons/:lessonId", authMiddleware, adminMiddleware, removeLesson);

// Admin: Upload lesson video with language support
router.post("/:courseId/lessons/:lessonId/upload-video", authMiddleware, adminMiddleware, upload.single("video"), uploadLessonVideo);

// Admin: Upload unified video with multiple audio tracks
router.post("/:courseId/lessons/:lessonId/upload-unified-video", 
    authMiddleware, 
    adminMiddleware, 
    unifiedUpload.fields([
        { name: "video", maxCount: 1 },
        { name: "audioEnglish", maxCount: 1 },
        { name: "audioHindi", maxCount: 1 },
        { name: "audioMarathi", maxCount: 1 },
    ]), 
    uploadUnifiedVideo
);

export default router;
