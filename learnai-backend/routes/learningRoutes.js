import express from "express";
import {
  getCurriculum,
  getLesson,
  completeLesson,
  setCurrentLesson,
  setLanguagePreference,
  getLanguagePreference,
} from "../controllers/learningController.js";
import {
  getCourseTools,
  linkToolToCourse,
  completeToolLesson,
  getUserCourseToolProgress,
} from "../controllers/toolController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// All learning routes require authentication
router.use(authMiddleware);

// Lesson routes
router.get("/lesson/:lessonId", getLesson);
router.post("/lesson/:lessonId/complete", completeLesson);
router.get("/:courseId/curriculum", getCurriculum);
router.put("/:courseId/current-lesson", setCurrentLesson);

// Language preference routes
router.post("/:courseId/language", setLanguagePreference);
router.get("/:courseId/language", getLanguagePreference);

// Tool course routes - get tools for a course with user progress
router.get("/:courseId/tools", getCourseTools);

// Tool progress tracking
router.post("/tools/:toolCourseId/complete", completeToolLesson);
router.get("/:courseId/tools/progress", getUserCourseToolProgress);

// Admin: Link tools to course
router.post("/:courseId/tools/link", adminMiddleware, linkToolToCourse);

export default router;
