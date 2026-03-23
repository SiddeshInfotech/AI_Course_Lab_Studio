import express from "express";
import {
    listCourses,
    listEnrolledCourses,
    getCourse,
    getCourseContent,
    addCourse,
    editCourse,
    removeCourse,
    enroll,
    listLessons,
    addLesson,
    editLesson,
    removeLesson,
} from "../controllers/courseController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import accessLimitMiddleware from "../middleware/accessLimitMiddleware.js";

const router = express.Router();

// Course routes
router.get("/", listCourses);
router.get("/enrolled", authMiddleware, listEnrolledCourses);
router.get("/:id", getCourse);
router.get("/:id/content", authMiddleware, accessLimitMiddleware, getCourseContent);
router.post("/", authMiddleware, addCourse);
router.put("/:id", authMiddleware, editCourse);
router.delete("/:id", authMiddleware, removeCourse);
router.post("/:id/enroll", authMiddleware, enroll);

// Lesson routes
router.get("/:id/lessons", listLessons);
router.post("/:id/lessons", authMiddleware, addLesson);
router.put("/:courseId/lessons/:lessonId", authMiddleware, editLesson);
router.delete("/:courseId/lessons/:lessonId", authMiddleware, removeLesson);

export default router;
