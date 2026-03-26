import express from "express";
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
} from "../controllers/courseController.js";
import {
    createCourseFromTools,
    getAvailableToolMappings,
} from "../controllers/courseGenerator.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import accessLimitMiddleware from "../middleware/accessLimitMiddleware.js";

const router = express.Router();

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

export default router;
