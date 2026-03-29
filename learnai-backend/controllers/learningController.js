import {
  getCourseCurriculum,
  getCourseCurriculumWithTools,
  getLessonDetails,
  markLessonComplete,
  updateCurrentLesson,
} from "../models/learningModel.js";
import prisma from "../config/db.js";

/**
 * GET /api/learning/:courseId/curriculum
 * Get curriculum for a course with lesson progress
 * Optional query param: ?includeTools=true to include tools
 */
export const getCurriculum = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { includeTools } = req.query;
    const userId = req.user.userId;

    console.log("🎓 Getting curriculum for course:", courseId, "user:", userId, "includeTools:", includeTools);

    let curriculum;
    if (includeTools === "true") {
      curriculum = await getCourseCurriculumWithTools(userId, courseId);
    } else {
      curriculum = await getCourseCurriculum(userId, courseId);
    }

    console.log("✅ Curriculum fetched, lessons:", curriculum.curriculum?.length || 0);
    res.json(curriculum);
  } catch (error) {
    console.error("❌ Get curriculum error:", error.message);
    console.error("❌ Full error:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

/**
 * GET /api/learning/lesson/:lessonId
 * Get details of a specific lesson
 */
export const getLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.userId;

    const lesson = await getLessonDetails(userId, lessonId);

    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    res.json(lesson);
  } catch (error) {
    console.error("Get lesson error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * POST /api/learning/lesson/:lessonId/complete
 * Mark a lesson as complete
 */
export const completeLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.userId;

    const lessonProgress = await markLessonComplete(userId, lessonId);
    res.json({
      message: "Lesson marked as complete",
      lessonProgress,
    });
  } catch (error) {
    console.error("Complete lesson error:", error);
    if (error.message === "Lesson not found") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * PUT /api/learning/:courseId/current-lesson
 * Update the current lesson being viewed
 */
export const setCurrentLesson = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonOrderIndex } = req.body;
    const userId = req.user.userId;

    if (!lessonOrderIndex) {
      return res.status(400).json({ message: "lessonOrderIndex is required" });
    }

    const courseProgress = await updateCurrentLesson(userId, courseId, lessonOrderIndex);
    res.json({
      message: "Current lesson updated",
      courseProgress,
    });
  } catch (error) {
    console.error("Set current lesson error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * POST /api/learning/:courseId/language
 * Set language preference for a course
 * Body: { language: "english" | "hindi" | "marathi" }
 */
export const setLanguagePreference = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { language } = req.body;
    const userId = req.user.userId;

    // Validate language
    const validLanguages = ["english", "hindi", "marathi"];
    if (!language || !validLanguages.includes(language)) {
      return res.status(400).json({
        message: "Invalid language. Allowed values: english, hindi, marathi"
      });
    }

    // Create or update language preference
    const preference = await prisma.userLanguagePreference.upsert({
      where: {
        userId_courseId: {
          userId: parseInt(userId),
          courseId: parseInt(courseId),
        },
      },
      update: {
        language,
      },
      create: {
        userId: parseInt(userId),
        courseId: parseInt(courseId),
        language,
      },
    });

    console.log(`✅ Language preference set to ${language} for user ${userId} on course ${courseId}`);

    res.json({
      message: "Language preference updated",
      preference,
    });
  } catch (error) {
    console.error("Set language preference error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /api/learning/:courseId/language
 * Get language preference for a course
 */
export const getLanguagePreference = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    const preference = await prisma.userLanguagePreference.findUnique({
      where: {
        userId_courseId: {
          userId: parseInt(userId),
          courseId: parseInt(courseId),
        },
      },
    });

    res.json({
      language: preference?.language || "english",
      preference,
    });
  } catch (error) {
    console.error("Get language preference error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
