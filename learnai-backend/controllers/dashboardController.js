import {
    getDashboardData,
    getUserProfile,
    getUserStreak,
    getEnrolledCoursesWithProgress,
} from "../models/dashboardModel.js";

// GET /api/dashboard — get complete dashboard data
export const getDashboard = async (req, res) => {
    try {
        const dashboardData = await getDashboardData(req.user.userId);
        res.json(dashboardData);
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/dashboard/stats — get only stats (lightweight)
export const getStats = async (req, res) => {
    try {
        const dashboardData = await getDashboardData(req.user.userId);
        res.json({
            user: dashboardData.user,
            stats: dashboardData.stats,
        });
    } catch (error) {
        console.error("Stats error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/dashboard/courses — get enrolled courses with progress
export const getCourses = async (req, res) => {
    try {
        const courses = await getEnrolledCoursesWithProgress(req.user.userId);
        res.json(courses);
    } catch (error) {
        console.error("Get courses error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/dashboard/profile — get user profile
export const getProfile = async (req, res) => {
    try {
        const profile = await getUserProfile(req.user.userId);
        if (!profile) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(profile);
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/dashboard/streak — get user streak
export const getStreak = async (req, res) => {
    try {
        const streak = await getUserStreak(req.user.userId);
        res.json({ streak });
    } catch (error) {
        console.error("Get streak error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
