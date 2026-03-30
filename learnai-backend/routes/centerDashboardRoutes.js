import express from "express";
import {
    centerLogin,
    centerRefresh,
    centerLogout,
    getCenterProfile,
} from "../controllers/centerAuthController.js";
import { centerAuth } from "../middleware/centerAuthMiddleware.js";
import {
    getCenterDashboardStats,
    getCenterStudents,
    getStudentDetails,
    getCenterCourses,
    getCenterActivity,
} from "../controllers/centerDashboardController.js";

const router = express.Router();

// Public routes (no authentication required)
router.post("/login", centerLogin);
router.post("/refresh", centerRefresh);
router.post("/logout", centerLogout);

// Protected routes (authentication required)
router.get("/me", centerAuth, getCenterProfile);

// Dashboard routes
router.get("/dashboard/stats", centerAuth, getCenterDashboardStats);
router.get("/students", centerAuth, getCenterStudents);
router.get("/students/:studentId", centerAuth, getStudentDetails);
router.get("/courses", centerAuth, getCenterCourses);
router.get("/activity", centerAuth, getCenterActivity);

export default router;
