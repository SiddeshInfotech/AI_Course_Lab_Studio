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

/**
 * Process video URL - converts YouTube URLs to embed format
 * and preserves internal /api/media/ URLs as-is
 * @param {string} url - The video URL
 * @returns {string} - Processed URL
 */
const processVideoUrl = (url) => {
  if (!url) return url;

  // Internal media URLs - return as-is (they use signed URLs on frontend)
  if (url.startsWith("/api/media/") || url.includes("/api/media/")) {
    return url;
  }

  // Uploads folder URLs - return as-is
  if (url.startsWith("/uploads/") || url.includes("/uploads/")) {
    return url;
  }

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
 * Get video URL based on preferred language
 * @param {object} lesson - The lesson object
 * @param {string} preferredLanguage - User's preferred language
 * @returns {string|null} - Processed video URL
 */
const getVideoUrlByLanguage = (lesson, preferredLanguage) => {
  // If unified video with audio tracks exists, return it
  if (lesson.unifiedVideoUrl) {
    return processVideoUrl(lesson.unifiedVideoUrl);
  }

  // Fallback to legacy language-specific URLs
  const urlEnglish = lesson.videoUrlEnglish || lesson.videoUrl;
  const urlHindi = lesson.videoUrlHindi;
  const urlMarathi = lesson.videoUrlMarathi;

  switch (preferredLanguage) {
    case "hindi":
      return processVideoUrl(urlHindi || urlEnglish);
    case "marathi":
      return processVideoUrl(urlMarathi || urlEnglish);
    case "english":
    default:
      return processVideoUrl(urlEnglish);
  }
};

/**
 * Get audio tracks for a lesson
 * @param {object} lesson - The lesson object
 * @returns {Array} - Array of audio track objects
 */
const getAudioTracks = (lesson) => {
  if (!lesson.audioTracks) return [];
  return safeJsonParse(lesson.audioTracks, []);
};

/**
 * Get preferred audio track index for a lesson
 * @param {object} lesson - The lesson object
 * @param {string} preferredLanguage - User's preferred language
 * @returns {number} - Audio track index (0 = first audio track)
 */
const getPreferredAudioTrackIndex = (lesson, preferredLanguage) => {
  const tracks = getAudioTracks(lesson);
  if (tracks.length === 0) return 0;

  const trackIndex = tracks.findIndex(
    track => track.language === preferredLanguage
  );

  return trackIndex >= 0 ? trackIndex : 0;
};

/**
 * Get curriculum (lessons grouped by sections) for a specific course
 * @param {number} userId - The ID of the user
 * @param {number} courseId - The ID of the course
 * @returns {object} - Curriculum data with sections and lessons
 */
export const getCourseCurriculum = async (userId, courseId) => {
  const parsedUserId = parseInt(userId);
  const parsedCourseId = parseInt(courseId);

  // Get course details first
  const course = await prisma.course.findUnique({
    where: { id: parsedCourseId },
  });

  // Get all lessons for the course
  const lessons = await prisma.lesson.findMany({
    where: { courseId: parsedCourseId },
    orderBy: { orderIndex: "asc" },
    include: {
      lessonProgress: {
        where: { userId: parsedUserId },
      },
      lessonActivities: {
        where: { userId: parsedUserId },
      },
    },
  });

  console.log("📚 getCourseCurriculum - found lessons:", lessons.length, "courseId:", parsedCourseId);
  if (lessons.length > 0) {
    console.log("📚 First lesson content:", lessons[0].content?.substring(0, 200));
  }

  // Get course progress to determine current lesson
  const courseProgress = await prisma.courseProgress.findUnique({
    where: {
      userId_courseId: {
        userId: parsedUserId,
        courseId: parsedCourseId,
      },
    },
  });

  // Get user's language preference for this course
  let userLanguagePreference = await prisma.userLanguagePreference.findUnique({
    where: {
      userId_courseId: {
        userId: parsedUserId,
        courseId: parsedCourseId,
      },
    },
  });

  // Default to English if no preference exists
  const preferredLanguage = userLanguagePreference?.language || "english";

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
    
    // Get lesson activity for video/quiz status
    const activity = lesson.lessonActivities.length > 0 ? lesson.lessonActivities[0] : null;
    
    // Check for quiz content - ANY lesson can have quiz content (not just type === 'quiz')
    let hasQuiz = false;
    if (lesson.content) {
      try {
        const parsed = JSON.parse(lesson.content);
        hasQuiz = Array.isArray(parsed) && parsed.length > 0 && parsed[0].question && parsed[0].options;
      } catch (e) {
        hasQuiz = false;
      }
    }
    
    // Determine if lesson is fully complete
    const videoCompleted = activity?.videoCompleted || false;
    const quizCompleted = activity?.quizCompleted || false;
    const isLessonFullyComplete = hasQuiz 
      ? (videoCompleted && quizCompleted) 
      : videoCompleted;

    sectionsMap.get(section).items.push({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      duration: lesson.duration,
      completed: isLessonFullyComplete,
      active: isActive,
      description: lesson.description,
      content: lesson.content,
      videoUrl: getVideoUrlByLanguage(lesson, preferredLanguage),
      // Legacy support for language-specific videos
      languages: {
        english: processVideoUrl(lesson.videoUrlEnglish || lesson.videoUrl),
        hindi: processVideoUrl(lesson.videoUrlHindi),
        marathi: processVideoUrl(lesson.videoUrlMarathi),
      },
      // New unified video with audio tracks support
      unifiedVideoUrl: lesson.unifiedVideoUrl ? processVideoUrl(lesson.unifiedVideoUrl) : null,
      audioTracks: getAudioTracks(lesson),
      preferredAudioTrack: getPreferredAudioTrackIndex(lesson, preferredLanguage),
      objectives: safeJsonParse(lesson.objectives, []),
      orderIndex: lesson.orderIndex,
      // NEW: Video/Quiz specific progress
      hasQuiz: hasQuiz,
      videoCompleted: videoCompleted,
      quizCompleted: quizCompleted,
      quizScore: activity?.quizScore || null,
      quizStarted: activity?.quizStarted || false,
    });

    // Log quiz lessons
    if (hasQuiz) {
      console.log(`📚 Quiz found: Lesson ${lesson.id} (${lesson.title})`);
    }
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
      ? (() => {
        const currActivity = currentLesson.lessonActivities.length > 0 ? currentLesson.lessonActivities[0] : null;
        let currHasQuiz = false;
        if (currentLesson.content) {
          try {
            const parsed = JSON.parse(currentLesson.content);
            currHasQuiz = Array.isArray(parsed) && parsed.length > 0 && parsed[0].question && parsed[0].options;
          } catch (e) {
            currHasQuiz = false;
          }
        }
        return {
          id: currentLesson.id,
          title: currentLesson.title,
          type: currentLesson.type,
          duration: currentLesson.duration,
          description: currentLesson.description,
          content: currentLesson.content,
          completed: currentLesson.lessonProgress.length > 0 && currentLesson.lessonProgress[0].completed,
          active: true,
          videoUrl: getVideoUrlByLanguage(currentLesson, preferredLanguage),
          // Legacy support for language-specific videos
          languages: {
            english: processVideoUrl(currentLesson.videoUrlEnglish || currentLesson.videoUrl),
            hindi: processVideoUrl(currentLesson.videoUrlHindi),
            marathi: processVideoUrl(currentLesson.videoUrlMarathi),
          },
          // New unified video with audio tracks support
          unifiedVideoUrl: currentLesson.unifiedVideoUrl ? processVideoUrl(currentLesson.unifiedVideoUrl) : null,
          audioTracks: getAudioTracks(currentLesson),
          preferredAudioTrack: getPreferredAudioTrackIndex(currentLesson, preferredLanguage),
          objectives: safeJsonParse(currentLesson.objectives, []),
          orderIndex: currentLesson.orderIndex,
          // Video/Quiz progress
          hasQuiz: currHasQuiz,
          videoCompleted: currActivity?.videoCompleted || false,
          quizCompleted: currActivity?.quizCompleted || false,
          quizScore: currActivity?.quizScore || null,
          quizStarted: currActivity?.quizStarted || false,
        };
      })()
      : null,
    preferredLanguage,
    courseTitle: course?.title || "Course",
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
    videoUrl: getVideoUrlByLanguage(lesson, "english"),
    languages: {
      english: processVideoUrl(lesson.videoUrlEnglish || lesson.videoUrl),
      hindi: processVideoUrl(lesson.videoUrlHindi),
      marathi: processVideoUrl(lesson.videoUrlMarathi),
    },
    unifiedVideoUrl: lesson.unifiedVideoUrl ? processVideoUrl(lesson.unifiedVideoUrl) : null,
    audioTracks: getAudioTracks(lesson),
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
  const courseProgress = await prisma.courseProgress.upsert({
    where: {
      userId_courseId: {
        userId: parseInt(userId),
        courseId: parseInt(courseId),
      },
    },
    update: {
      currentLessonId: parseInt(lessonOrderIndex),
      lastAccessedAt: new Date(),
    },
    create: {
      userId: parseInt(userId),
      courseId: parseInt(courseId),
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

  // Get user's language preference for this course
  let userLanguagePreference = await prisma.userLanguagePreference.findUnique({
    where: {
      userId_courseId: {
        userId: parseInt(userId),
        courseId: parseInt(courseId),
      },
    },
  });

  // Default to English if no preference exists
  const preferredLanguage = userLanguagePreference?.language || "english";

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
      videoUrl: getVideoUrlByLanguage(lesson, preferredLanguage),
      // Legacy support for language-specific videos
      languages: {
        english: processVideoUrl(lesson.videoUrlEnglish || lesson.videoUrl),
        hindi: processVideoUrl(lesson.videoUrlHindi),
        marathi: processVideoUrl(lesson.videoUrlMarathi),
      },
      // New unified video with audio tracks support
      unifiedVideoUrl: lesson.unifiedVideoUrl ? processVideoUrl(lesson.unifiedVideoUrl) : null,
      audioTracks: getAudioTracks(lesson),
      preferredAudioTrack: getPreferredAudioTrackIndex(lesson, preferredLanguage),
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
        completed: currentLesson.lessonProgress.length > 0 && currentLesson.lessonProgress[0].completed,
        active: true,
        videoUrl: getVideoUrlByLanguage(currentLesson, preferredLanguage),
        // Legacy support for language-specific videos
        languages: {
          english: processVideoUrl(currentLesson.videoUrlEnglish || currentLesson.videoUrl),
          hindi: processVideoUrl(currentLesson.videoUrlHindi),
          marathi: processVideoUrl(currentLesson.videoUrlMarathi),
        },
        // New unified video with audio tracks support
        unifiedVideoUrl: currentLesson.unifiedVideoUrl ? processVideoUrl(currentLesson.unifiedVideoUrl) : null,
        audioTracks: getAudioTracks(currentLesson),
        preferredAudioTrack: getPreferredAudioTrackIndex(currentLesson, preferredLanguage),
        objectives: safeJsonParse(currentLesson.objectives, []),
        orderIndex: currentLesson.orderIndex,
      }
      : null,
    preferredLanguage,
  };
};

/**
 * Update video progress for a lesson
 * @param {number} userId - User ID
 * @param {number} lessonId - Lesson ID  
 * @param {object} data - { videoStarted, videoCompleted, videoWatchTime }
 * @returns {object} - Updated activity
 */
export const updateVideoProgress = async (userId, lessonId, data) => {
  const parsedUserId = parseInt(userId);
  const parsedLessonId = parseInt(lessonId);
  
  // Get lesson to find courseId
  const lesson = await prisma.lesson.findUnique({
    where: { id: parsedLessonId },
    select: { courseId: true }
  });
  
  if (!lesson) {
    throw new Error("Lesson not found");
  }
  
  console.log("📹 updateVideoProgress:", { userId: parsedUserId, lessonId: parsedLessonId, courseId: lesson.courseId, data });
  
  // Upsert lesson activity
  const activity = await prisma.lessonActivity.upsert({
    where: {
      userId_lessonId: {
        userId: parsedUserId,
        lessonId: parsedLessonId,
      }
    },
    create: {
      userId: parsedUserId,
      lessonId: parsedLessonId,
      courseId: lesson.courseId,
      videoStarted: data.videoStarted || false,
      videoCompleted: data.videoCompleted || false,
      videoStartedAt: data.videoStarted ? new Date() : null,
      videoCompletedAt: data.videoCompleted ? new Date() : null,
      videoWatchTime: data.videoWatchTime || 0,
    },
    update: {
      videoStarted: data.videoStarted !== undefined ? data.videoStarted : undefined,
      videoCompleted: data.videoCompleted !== undefined ? data.videoCompleted : undefined,
      videoCompletedAt: data.videoCompleted ? new Date() : undefined,
      videoWatchTime: data.videoWatchTime !== undefined ? data.videoWatchTime : undefined,
    },
  });
  
  console.log("📹 activity after upsert:", activity);
  return activity;
};

/**
 * Submit quiz for a lesson
 * @param {number} userId - User ID
 * @param {number} lessonId - Lesson ID
 * @param {object} data - { answers: object, score: number }
 * @returns {object} - Updated activity with quiz results
 */
export const submitQuiz = async (userId, lessonId, data) => {
  const parsedUserId = parseInt(userId);
  const parsedLessonId = parseInt(lessonId);
  
  // Get lesson to find courseId
  const lesson = await prisma.lesson.findUnique({
    where: { id: parsedLessonId },
    select: { courseId: true }
  });
  
  if (!lesson) {
    throw new Error("Lesson not found");
  }
  
  // First get existing activity to check if quiz was started
  const existingActivity = await prisma.lessonActivity.findUnique({
    where: {
      userId_lessonId: {
        userId: parsedUserId,
        lessonId: parsedLessonId,
      }
    }
  });
  
  // Upsert lesson activity with quiz data
  const activity = await prisma.lessonActivity.upsert({
    where: {
      userId_lessonId: {
        userId: parsedUserId,
        lessonId: parsedLessonId,
      }
    },
    create: {
      userId: parsedUserId,
      lessonId: parsedLessonId,
      courseId: lesson.courseId,
      quizStarted: true,
      quizCompleted: true,
      quizStartedAt: new Date(),
      quizCompletedAt: new Date(),
      quizScore: data.score,
      quizAnswers: JSON.stringify(data.answers),
    },
    update: {
      quizStarted: true,
      quizCompleted: true,
      quizCompletedAt: new Date(),
      quizScore: data.score,
      quizAnswers: JSON.stringify(data.answers),
    },
  });
  
  // Also mark lesson as completed in LessonProgress
  await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId: parsedUserId,
        lessonId: parsedLessonId,
      }
    },
    create: {
      userId: parsedUserId,
      lessonId: parsedLessonId,
      courseId: lesson.courseId,
      completed: true,
      completedAt: new Date(),
    },
    update: {
      completed: true,
      completedAt: new Date(),
    },
  });
  
  return activity;
};

/**
 * Get lesson activity for a specific lesson
 * @param {number} userId - User ID
 * @param {number} lessonId - Lesson ID
 * @returns {object|null} - Lesson activity or null
 */
export const getLessonActivity = async (userId, lessonId) => {
  const activity = await prisma.lessonActivity.findUnique({
    where: {
      userId_lessonId: {
        userId: parseInt(userId),
        lessonId: parseInt(lessonId),
      }
    }
  });
  
  if (activity?.quizAnswers) {
    return {
      ...activity,
      quizAnswers: JSON.parse(activity.quizAnswers)
    };
  }
  
  return activity;
};

/**
 * Reset quiz progress for a lesson to allow retake
 * @param {number} userId - User ID
 * @param {number} lessonId - Lesson ID
 * @returns {object} - Reset activity
 */
export const resetQuiz = async (userId, lessonId) => {
  const parsedUserId = parseInt(userId);
  const parsedLessonId = parseInt(lessonId);
  
  // Get lesson to find courseId
  const lesson = await prisma.lesson.findUnique({
    where: { id: parsedLessonId },
    select: { courseId: true }
  });
  
  if (!lesson) {
    throw new Error("Lesson not found");
  }
  
  // Reset quiz in lesson activity (keep video progress intact)
  const activity = await prisma.lessonActivity.upsert({
    where: {
      userId_lessonId: {
        userId: parsedUserId,
        lessonId: parsedLessonId,
      }
    },
    update: {
      quizStarted: false,
      quizCompleted: false,
      quizStartedAt: null,
      quizCompletedAt: null,
      quizScore: null,
      quizAnswers: null,
    },
    create: {
      userId: parsedUserId,
      lessonId: parsedLessonId,
      courseId: lesson.courseId,
      videoStarted: false,
      videoCompleted: false,
    },
  });
  
  return activity;
};
