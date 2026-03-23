import prisma from "../config/db.js";

/**
 * Get curriculum (lessons grouped by sections) for a specific course
 * @param {number} userId - The ID of the user
 * @param {number} courseId - The ID of the course
 * @returns {object} - Curriculum data with sections and lessons
 */
export const getCourseCurriculum = async (userId, courseId) => {
  // Get all lessons for the course
  const lessons = await prisma.lesson.findMany({
    where: { courseId: parseInt(courseId) },
    orderBy: { orderIndex: "asc" },
    include: {
      lessonProgress: {
        where: { userId: parseInt(userId) },
      },
    },
  });

  // Get course progress to determine current lesson
  const courseProgress = await prisma.courseProgress.findUnique({
    where: {
      userId_courseId: {
        userId: parseInt(userId),
        courseId: parseInt(courseId),
      },
    },
  });

  // Group lessons by section
  const sectionsMap = new Map();

  lessons.forEach((lesson) => {
    const section = lesson.section || "General";
    const sectionTitle = lesson.sectionTitle || "Course Content";

    if (!sectionsMap.has(section)) {
      sectionsMap.set(section, {
        id: section,
        day: section,
        title: sectionTitle,
        items: [],
      });
    }

    const isCompleted = lesson.lessonProgress.length > 0 && lesson.lessonProgress[0].completed;
    const isActive = courseProgress ? lesson.orderIndex === courseProgress.currentLessonId : false;

    sectionsMap.get(section).items.push({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      duration: lesson.duration,
      completed: isCompleted,
      active: isActive,
      description: lesson.description,
      content: lesson.content,
      videoUrl: lesson.videoUrl,
      objectives: lesson.objectives ? JSON.parse(lesson.objectives) : [],
      orderIndex: lesson.orderIndex,
    });
  });

  // Convert map to array
  const curriculum = Array.from(sectionsMap.values());

  // Calculate progress
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter(
    (l) => l.lessonProgress.length > 0 && l.lessonProgress[0].completed
  ).length;

  // Find the current active lesson
  const currentLesson = lessons.find(
    (l) => courseProgress && l.orderIndex === courseProgress.currentLessonId
  );

  return {
    curriculum,
    progress: {
      completed: completedLessons,
      total: totalLessons,
      percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    },
    currentLesson: currentLesson
      ? {
        id: currentLesson.id,
        title: currentLesson.title,
        type: currentLesson.type,
        duration: currentLesson.duration,
        description: currentLesson.description,
        content: currentLesson.content,
        videoUrl: currentLesson.videoUrl,
        objectives: currentLesson.objectives ? JSON.parse(currentLesson.objectives) : [],
        orderIndex: currentLesson.orderIndex,
      }
      : null,
  };
};

/**
 * Get details of a specific lesson
 * @param {number} userId - The ID of the user
 * @param {number} lessonId - The ID of the lesson
 * @returns {object} - Lesson details
 */
export const getLessonDetails = async (userId, lessonId) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: parseInt(lessonId) },
    include: {
      lessonProgress: {
        where: { userId: parseInt(userId) },
      },
      course: true,
    },
  });

  if (!lesson) {
    return null;
  }

  const isCompleted = lesson.lessonProgress.length > 0 && lesson.lessonProgress[0].completed;

  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    content: lesson.content,
    videoUrl: lesson.videoUrl,
    duration: lesson.duration,
    section: lesson.section,
    sectionTitle: lesson.sectionTitle,
    type: lesson.type,
    objectives: lesson.objectives ? JSON.parse(lesson.objectives) : [],
    completed: isCompleted,
    orderIndex: lesson.orderIndex,
    course: {
      id: lesson.course.id,
      title: lesson.course.title,
    },
  };
};

/**
 * Mark a lesson as complete
 * @param {number} userId - The ID of the user
 * @param {number} lessonId - The ID of the lesson
 * @returns {object} - Updated lesson progress
 */
export const markLessonComplete = async (userId, lessonId) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: parseInt(lessonId) },
  });

  if (!lesson) {
    throw new Error("Lesson not found");
  }

  // Create or update lesson progress
  const lessonProgress = await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId: parseInt(userId),
        lessonId: parseInt(lessonId),
      },
    },
    update: {
      completed: true,
      completedAt: new Date(),
    },
    create: {
      userId: parseInt(userId),
      lessonId: parseInt(lessonId),
      courseId: lesson.courseId,
      completed: true,
      completedAt: new Date(),
    },
  });

  // Update course progress - move to next lesson if this was the current one
  const courseProgress = await prisma.courseProgress.findUnique({
    where: {
      userId_courseId: {
        userId: parseInt(userId),
        courseId: lesson.courseId,
      },
    },
  });

  if (courseProgress && courseProgress.currentLessonId === lesson.orderIndex) {
    // Find next lesson
    const nextLesson = await prisma.lesson.findFirst({
      where: {
        courseId: lesson.courseId,
        orderIndex: { gt: lesson.orderIndex },
      },
      orderBy: { orderIndex: "asc" },
    });

    if (nextLesson) {
      await prisma.courseProgress.update({
        where: {
          userId_courseId: {
            userId: parseInt(userId),
            courseId: lesson.courseId,
          },
        },
        data: {
          currentLessonId: nextLesson.orderIndex,
          lastAccessedAt: new Date(),
        },
      });
    } else {
      // This was the last lesson, mark course as complete
      await prisma.courseProgress.update({
        where: {
          userId_courseId: {
            userId: parseInt(userId),
            courseId: lesson.courseId,
          },
        },
        data: {
          completed: true,
          completedAt: new Date(),
          lastAccessedAt: new Date(),
        },
      });
    }
  }

  return lessonProgress;
};

/**
 * Update current lesson in course progress
 * @param {number} userId - The ID of the user
 * @param {number} courseId - The ID of the course
 * @param {number} lessonOrderIndex - The orderIndex of the lesson to set as current
 * @returns {object} - Updated course progress
 */
export const updateCurrentLesson = async (userId, courseId, lessonOrderIndex) => {
  const courseProgress = await prisma.courseProgress.update({
    where: {
      userId_courseId: {
        userId: parseInt(userId),
        courseId: parseInt(courseId),
      },
    },
    data: {
      currentLessonId: parseInt(lessonOrderIndex),
      lastAccessedAt: new Date(),
    },
  });

  return courseProgress;
};
