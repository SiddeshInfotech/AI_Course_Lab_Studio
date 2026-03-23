import express from "express";
import {
  getCurriculum,
  getLesson,
  completeLesson,
  setCurrentLesson,
} from "../controllers/learningController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All learning routes require authentication
router.use(authMiddleware);

// More specific routes first (ones with literal path segments)
// Get details of a specific lesson
router.get("/lesson/:lessonId", getLesson);

// Mark a lesson as complete
router.post("/lesson/:lessonId/complete", completeLesson);

// Generic routes with parameters after
// Get curriculum for a course
router.get("/:courseId/curriculum", getCurriculum);

// Update current lesson
router.put("/:courseId/current-lesson", setCurrentLesson);

export default router;
