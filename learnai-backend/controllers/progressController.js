import {
    getCourseProgress,
    startCourse,
    updateProgress,
    completeCourse,
    getUserCoursesWithProgress,
    getLesson,
    getLessonCount,
} from "../models/progressModel.js";
import { getCourseById, getEnrollment } from "../models/courseModel.js";

// GET /api/progress — get all enrolled courses with progress
export const listCoursesWithProgress = async (req, res) => {
    try {
        const courses = await getUserCoursesWithProgress(req.user.userId);
        res.json(courses);
    } catch (error) {
        console.error("List courses with progress error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/progress/:courseId/start — start a course
export const startCourseProgress = async (req, res) => {
    try {
        const courseId = parseInt(req.params.courseId);
        const userId = req.user.userId;

        // Check course exists
        const course = await getCourseById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Check user is enrolled
        const enrollment = await getEnrollment(userId, courseId);
        if (!enrollment) {
            return res.status(403).json({ message: "Not enrolled in this course" });
        }

        // Check if already started
        const existingProgress = await getCourseProgress(userId, courseId);
        if (existingProgress) {
            return res.status(400).json({
                message: "Course already started",
                progress: existingProgress,
            });
        }

        // Start the course
        const progress = await startCourse(userId, courseId);

        res.status(201).json({
            message: "Course started",
            progress,
        });
    } catch (error) {
        console.error("Start course error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/progress/:courseId/resume — get current position to resume
export const resumeCourse = async (req, res) => {
    try {
        const courseId = parseInt(req.params.courseId);
        const userId = req.user.userId;

        // Check course exists
        const course = await getCourseById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Get progress
        const progress = await getCourseProgress(userId, courseId);
        if (!progress) {
            return res.status(404).json({
                message: "Course not started yet",
                action: "start",
            });
        }

        // Get current lesson
        const currentLesson = await getLesson(courseId, progress.currentLessonId);
        const totalLessons = await getLessonCount(courseId);

        res.json({
            courseId,
            currentLessonId: progress.currentLessonId,
            currentLesson,
            totalLessons,
            completed: progress.completed,
            lastAccessedAt: progress.lastAccessedAt,
            percentComplete: totalLessons > 0
                ? Math.round((progress.currentLessonId / totalLessons) * 100)
                : 0,
        });
    } catch (error) {
        console.error("Resume course error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/progress/:courseId/lesson/:lessonIndex — update progress to lesson
export const updateLessonProgress = async (req, res) => {
    try {
        const courseId = parseInt(req.params.courseId);
        const lessonIndex = parseInt(req.params.lessonIndex);
        const userId = req.user.userId;

        // Validate lesson exists
        const lesson = await getLesson(courseId, lessonIndex);
        if (!lesson) {
            return res.status(404).json({ message: "Lesson not found" });
        }

        // Check progress exists
        const existingProgress = await getCourseProgress(userId, courseId);
        if (!existingProgress) {
            return res.status(400).json({ message: "Course not started yet" });
        }

        // Update progress
        const progress = await updateProgress(userId, courseId, lessonIndex);

        // Check if course is complete
        const totalLessons = await getLessonCount(courseId);
        if (lessonIndex >= totalLessons) {
            await completeCourse(userId, courseId);
        }

        res.json({
            message: "Progress updated",
            currentLessonId: progress.currentLessonId,
            totalLessons,
            percentComplete: totalLessons > 0
                ? Math.round((lessonIndex / totalLessons) * 100)
                : 0,
        });
    } catch (error) {
        console.error("Update progress error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/progress/:courseId/complete — mark course as completed
export const markCourseComplete = async (req, res) => {
    try {
        const courseId = parseInt(req.params.courseId);
        const userId = req.user.userId;

        // Check progress exists
        const existingProgress = await getCourseProgress(userId, courseId);
        if (!existingProgress) {
            return res.status(400).json({ message: "Course not started yet" });
        }

        if (existingProgress.completed) {
            return res.status(400).json({ message: "Course already completed" });
        }

        await completeCourse(userId, courseId);

        res.json({ message: "Course marked as completed" });
    } catch (error) {
        console.error("Complete course error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
