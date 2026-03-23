import express from "express";
import {
    listCoursesWithProgress,
    startCourseProgress,
    resumeCourse,
    updateLessonProgress,
    markCourseComplete,
} from "../controllers/progressController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All progress routes require authentication
router.get("/", authMiddleware, listCoursesWithProgress);
router.post("/:courseId/start", authMiddleware, startCourseProgress);
router.get("/:courseId/resume", authMiddleware, resumeCourse);
router.post("/:courseId/lesson/:lessonIndex", authMiddleware, updateLessonProgress);
router.post("/:courseId/complete", authMiddleware, markCourseComplete);

export default router;
