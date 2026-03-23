import express from "express";
import {
    getDashboard,
    getStats,
    getCourses,
    getProfile,
    getStreak,
} from "../controllers/dashboardController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All dashboard routes require authentication
router.use(authMiddleware);

// Main dashboard endpoint (returns everything)
router.get("/", getDashboard);

// Sub-endpoints for specific data
router.get("/stats", getStats);
router.get("/profile", getProfile);
router.get("/courses", getCourses);
router.get("/streak", getStreak);

export default router;
