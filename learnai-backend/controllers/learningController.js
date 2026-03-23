import {
  getCourseCurriculum,
  getLessonDetails,
  markLessonComplete,
  updateCurrentLesson,
} from "../models/learningModel.js";

/**
 * GET /api/learning/:courseId/curriculum
 * Get curriculum for a course with lesson progress
 */
export const getCurriculum = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    const curriculum = await getCourseCurriculum(userId, courseId);
    res.json(curriculum);
  } catch (error) {
    console.error("Get curriculum error:", error);
    res.status(500).json({ message: "Internal server error" });
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
