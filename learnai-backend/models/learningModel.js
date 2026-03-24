import prisma from "../config/db.js";

// Safe JSON parse helper
const safeJsonParse = (jsonStr, defaultValue = []) => {
  if (!jsonStr) return defaultValue;
  try {
    return typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
  } catch (error) {
    console.error("❌ JSON parse error:", error);
    return defaultValue;
  }
};

// Convert YouTube URLs to proper embed format for ReactPlayer and iframes
const convertYouTubeUrl = (url) => {
  if (!url) return url;

  try {
    // Extract video ID from different YouTube URL formats
    let videoId = null;

    // youtu.be/VIDEO_ID format
    if (url.includes("youtu.be/")) {
      videoId = url.match(/youtu\.be\/([^?&]+)/)?.[1];
    }
    // youtube.com/watch?v=VIDEO_ID format
    else if (url.includes("youtube.com/watch")) {
      videoId = url.match(/v=([^&]+)/)?.[1];
    }
    // youtube.com/embed/VIDEO_ID format
    else if (url.includes("youtube.com/embed/")) {
      videoId = url.match(/embed\/([^?&]+)/)?.[1];
    }

    // Return embed format URL - most reliable for ReactPlayer
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&modestbranding=1&rel=0`;
    }
  } catch (error) {
    console.error("❌ Error converting YouTube URL:", error);
  }

  // Return original URL if conversion fails
  return url;
};

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
      videoUrl: convertYouTubeUrl(lesson.videoUrl),
      objectives: safeJsonParse(lesson.objectives, []),
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
        videoUrl: convertYouTubeUrl(currentLesson.videoUrl),
        objectives: safeJsonParse(currentLesson.objectives, []),
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
    videoUrl: convertYouTubeUrl(lesson.videoUrl),
    duration: lesson.duration,
    section: lesson.section,
    sectionTitle: lesson.sectionTitle,
    type: lesson.type,
    objectives: safeJsonParse(lesson.objectives, []),
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

/**
 * Get curriculum with both lessons and tools for a course
 * @param {number} userId - The ID of the user
 * @param {number} courseId - The ID of the course
 * @returns {object} - Curriculum with lessons and tools
 */
export const getCourseCurriculumWithTools = async (userId, courseId) => {
  // Get lessons
  const lessons = await prisma.lesson.findMany({
    where: { courseId: parseInt(courseId) },
    orderBy: { orderIndex: "asc" },
    include: {
      lessonProgress: {
        where: { userId: parseInt(userId) },
      },
    },
  });

  // Get tools
  const toolCourses = await prisma.toolCourse.findMany({
    where: { courseId: parseInt(courseId) },
    include: {
      tool: true,
      toolProgress: {
        where: { userId: parseInt(userId) },
      },
    },
    orderBy: { orderIndex: "asc" },
  });

  // Get course progress
  const courseProgress = await prisma.courseProgress.findUnique({
    where: {
      userId_courseId: {
        userId: parseInt(userId),
        courseId: parseInt(courseId),
      },
    },
  });

  // Build sections map combining lessons and tools by day
  const sectionsMap = new Map();

  // Add lessons
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
      type: "lesson",
      contentType: lesson.type,
      duration: lesson.duration,
      completed: isCompleted,
      active: isActive,
      description: lesson.description,
      content: lesson.content,
      videoUrl: convertYouTubeUrl(lesson.videoUrl),
      objectives: safeJsonParse(lesson.objectives, []),
      orderIndex: lesson.orderIndex,
    });
  });

  // Add tools
  toolCourses.forEach((tc) => {
    const section = tc.section || "General";
    const sectionTitle = tc.sectionTitle || "Tools";

    if (!sectionsMap.has(section)) {
      sectionsMap.set(section, {
        id: section,
        day: section,
        title: sectionTitle,
        items: [],
      });
    }

    const isCompleted = tc.toolProgress.length > 0 && tc.toolProgress[0].completed;

    sectionsMap.get(section).items.push({
      id: tc.id,
      toolId: tc.toolId,
      title: tc.tool.name,
      type: "tool",
      contentType: "demo video",
      duration: null,
      completed: isCompleted,
      active: false,
      description: tc.description || tc.tool.description,
      demoVideoUrl: tc.demoVideoUrl || tc.tool.demoVideoUrl,
      tool: {
        id: tc.tool.id,
        name: tc.tool.name,
        description: tc.tool.description,
        websiteUrl: tc.tool.websiteUrl,
        imageUrl: tc.tool.imageUrl,
      },
      isPremium: tc.isPremium,
      orderIndex: tc.orderIndex,
    });
  });

  // Convert map to array
  const curriculum = Array.from(sectionsMap.values());

  // Calculate progress (lessons + tools)
  const totalItems = lessons.length + toolCourses.length;
  const completedItems =
    lessons.filter((l) => l.lessonProgress.length > 0 && l.lessonProgress[0].completed).length +
    toolCourses.filter((tc) => tc.toolProgress.length > 0 && tc.toolProgress[0].completed).length;

  // Find the current active lesson
  const currentLesson = lessons.find(
    (l) => courseProgress && l.orderIndex === courseProgress.currentLessonId
  );

  return {
    curriculum,
    progress: {
      completed: completedItems,
      total: totalItems,
      percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    },
    currentLesson: currentLesson
      ? {
        id: currentLesson.id,
        title: currentLesson.title,
        type: "lesson",
        contentType: currentLesson.type,
        duration: currentLesson.duration,
        description: currentLesson.description,
        content: currentLesson.content,
        videoUrl: convertYouTubeUrl(currentLesson.videoUrl),
        objectives: safeJsonParse(currentLesson.objectives, []),
        orderIndex: currentLesson.orderIndex,
      }
      : null,
  };
};
