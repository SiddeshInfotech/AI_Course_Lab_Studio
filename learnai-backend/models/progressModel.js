import prisma from "../config/db.js";

// Get user's progress for a specific course
export const getCourseProgress = async (userId, courseId) => {
    return prisma.courseProgress.findUnique({
        where: {
            userId_courseId: { userId, courseId },
        },
        include: {
            course: {
                include: {
                    lessons: {
                        orderBy: { orderIndex: "asc" },
                    },
                },
            },
        },
    });
};

// Start a course (create progress record at lesson 1)
export const startCourse = async (userId, courseId) => {
    return prisma.courseProgress.create({
        data: {
            userId,
            courseId,
            currentLessonId: 1,
        },
        include: {
            course: {
                include: {
                    lessons: {
                        orderBy: { orderIndex: "asc" },
                    },
                },
            },
        },
    });
};

// Update progress to a specific lesson
export const updateProgress = async (userId, courseId, lessonOrderIndex) => {
    return prisma.courseProgress.update({
        where: {
            userId_courseId: { userId, courseId },
        },
        data: {
            currentLessonId: lessonOrderIndex,
            lastAccessedAt: new Date(),
        },
    });
};

// Mark course as completed
export const completeCourse = async (userId, courseId) => {
    return prisma.courseProgress.update({
        where: {
            userId_courseId: { userId, courseId },
        },
        data: {
            completed: true,
            completedAt: new Date(),
            lastAccessedAt: new Date(),
        },
    });
};

// Get all courses with user's progress
export const getUserCoursesWithProgress = async (userId) => {
    const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        include: {
            course: {
                include: {
                    lessons: {
                        orderBy: { orderIndex: "asc" },
                        select: { id: true, orderIndex: true, title: true },
                    },
                },
            },
        },
    });

    const progressRecords = await prisma.courseProgress.findMany({
        where: { userId },
    });

    const progressMap = new Map(
        progressRecords.map((p) => [p.courseId, p])
    );

    return enrollments.map((enrollment) => {
        const progress = progressMap.get(enrollment.courseId);
        const totalLessons = enrollment.course.lessons.length;
        const currentLesson = progress?.currentLessonId || 0;

        return {
            ...enrollment.course,
            enrolledAt: enrollment.enrolledAt,
            progress: progress
                ? {
                    currentLessonId: progress.currentLessonId,
                    totalLessons,
                    percentComplete: totalLessons > 0
                        ? Math.round((currentLesson / totalLessons) * 100)
                        : 0,
                    completed: progress.completed,
                    startedAt: progress.startedAt,
                    lastAccessedAt: progress.lastAccessedAt,
                    status: progress.completed
                        ? "completed"
                        : "in_progress",
                }
                : {
                    currentLessonId: 0,
                    totalLessons,
                    percentComplete: 0,
                    completed: false,
                    status: "not_started",
                },
        };
    });
};

// Get a specific lesson by course and order index
export const getLesson = async (courseId, orderIndex) => {
    return prisma.lesson.findUnique({
        where: {
            courseId_orderIndex: { courseId, orderIndex },
        },
    });
};

// Get total lesson count for a course
export const getLessonCount = async (courseId) => {
    return prisma.lesson.count({
        where: { courseId },
    });
};
