import prisma from "../config/db.js";

// Get user profile
export const getUserProfile = (userId) =>
    prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            username: true,
            email: true,
            created_at: true,
        },
    });

// Get user's streak (days of consecutive usage)
export const getUserStreak = async (userId) => {
    const dailyUsages = await prisma.dailyUsage.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        select: { date: true, totalSeconds: true },
    });

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const usage of dailyUsages) {
        const usageDate = new Date(usage.date);
        usageDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((today.getTime() - usageDate.getTime()) / (1000 * 60 * 60 * 24));

        // Only count if usage is recorded (more than 0 seconds)
        if (usage.totalSeconds > 0) {
            if (daysDiff === streak) {
                streak++;
            } else if (daysDiff > streak) {
                break;
            }
        }
    }

    if (streak > 0) {
        return streak;
    }

    // Fallback: derive streak from real learning activity when heartbeat data is unavailable.
    let lessonCompletions = [];
    let toolCompletions = [];
    let courseTouches = [];

    try {
        [lessonCompletions, toolCompletions, courseTouches] = await Promise.all([
            prisma.lessonProgress.findMany({
                where: { userId, completed: true, completedAt: { not: null } },
                select: { completedAt: true },
                orderBy: { completedAt: "desc" },
            }),
            prisma.toolProgress.findMany({
                where: { userId, completed: true, completedAt: { not: null } },
                select: { completedAt: true },
                orderBy: { completedAt: "desc" },
            }),
            prisma.courseProgress.findMany({
                where: { userId },
                select: { lastAccessedAt: true },
                orderBy: { lastAccessedAt: "desc" },
            }),
        ]);
    } catch (error) {
        // Keep dashboard available even when optional progress tables are not ready.
        console.error("Streak fallback activity query failed:", error.message);
        return 0;
    }

    const activityDays = new Set();
    const toDayKey = (value) => {
        if (!value) return null;
        const date = new Date(value);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    };

    lessonCompletions.forEach((item) => {
        const key = toDayKey(item.completedAt);
        if (key) activityDays.add(key);
    });
    toolCompletions.forEach((item) => {
        const key = toDayKey(item.completedAt);
        if (key) activityDays.add(key);
    });
    courseTouches.forEach((item) => {
        const key = toDayKey(item.lastAccessedAt);
        if (key) activityDays.add(key);
    });

    let fallbackStreak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (activityDays.has(cursor.getTime())) {
        fallbackStreak++;
        cursor.setDate(cursor.getDate() - 1);
    }

    return fallbackStreak;
};

// Get count of completed courses
export const getCompletedCoursesCount = (userId) =>
    prisma.courseProgress.count({
        where: { userId, completed: true },
    });

// Get total enrolled courses count
export const getEnrolledCoursesCount = (userId) =>
    prisma.enrollment.count({
        where: { userId },
    });

// Calculate accuracy (completion rate percentage)
export const calculateAccuracy = async (userId) => {
    try {
        const enrollments = await prisma.enrollment.findMany({
            where: { userId },
            select: {
                courseId: true,
                course: {
                    select: {
                        _count: {
                            select: { lessons: true },
                        },
                    },
                },
            },
        });

        if (enrollments.length === 0) return 0;

        const enrolledCourseIds = enrollments.map((enrollment) => enrollment.courseId);
        const lessonTotalsByCourse = new Map(
            enrollments.map((enrollment) => [enrollment.courseId, enrollment.course._count.lessons])
        );

        const completedLessonsByCourse = await prisma.lessonProgress.groupBy({
            by: ["courseId"],
            where: {
                userId,
                completed: true,
                courseId: { in: enrolledCourseIds },
            },
            _count: {
                _all: true,
            },
        });

        const completedMap = new Map(
            completedLessonsByCourse.map((item) => [item.courseId, item._count._all])
        );

        let totalLessons = 0;
        let completedLessons = 0;

        enrolledCourseIds.forEach((courseId) => {
            const total = lessonTotalsByCourse.get(courseId) || 0;
            const completed = completedMap.get(courseId) || 0;
            totalLessons += total;
            completedLessons += Math.min(completed, total);
        });

        if (totalLessons === 0) return 0;
        return Math.round((completedLessons / totalLessons) * 100);
    } catch (error) {
        console.error("Accuracy calculation fallback:", error.message);
        const completed = await getCompletedCoursesCount(userId);
        const enrolled = await getEnrolledCoursesCount(userId);
        if (enrolled === 0) return 0;
        return Math.round((completed / enrolled) * 100);
    }
};

const getModulesCompletedCount = async (userId) => {
    try {
        const enrollments = await prisma.enrollment.findMany({
            where: { userId },
            select: {
                courseId: true,
                course: {
                    select: {
                        _count: {
                            select: { lessons: true },
                        },
                    },
                },
            },
        });

        if (enrollments.length === 0) return 0;

        const enrolledCourseIds = enrollments.map((enrollment) => enrollment.courseId);
        const lessonTotalsByCourse = new Map(
            enrollments.map((enrollment) => [enrollment.courseId, enrollment.course._count.lessons])
        );

        const [completedLessonsByCourse, courseProgressRecords] = await Promise.all([
            prisma.lessonProgress.groupBy({
                by: ["courseId"],
                where: {
                    userId,
                    completed: true,
                    courseId: { in: enrolledCourseIds },
                },
                _count: {
                    _all: true,
                },
            }),
            prisma.courseProgress.findMany({
                where: {
                    userId,
                    courseId: { in: enrolledCourseIds },
                },
                select: {
                    courseId: true,
                    completed: true,
                },
            }),
        ]);

        const completedMap = new Map(
            completedLessonsByCourse.map((item) => [item.courseId, item._count._all])
        );
        const courseCompletedMap = new Map(
            courseProgressRecords.map((item) => [item.courseId, item.completed])
        );

        let completedModules = 0;

        enrolledCourseIds.forEach((courseId) => {
            const totalLessons = lessonTotalsByCourse.get(courseId) || 0;
            const completedLessons = completedMap.get(courseId) || 0;
            const completedFromProgress = courseCompletedMap.get(courseId) || false;
            const completedFromLessons =
                totalLessons > 0 && completedLessons >= totalLessons;

            if (completedFromProgress || completedFromLessons) {
                completedModules++;
            }
        });

        return completedModules;
    } catch (error) {
        console.error("Modules completed fallback:", error.message);
        return getCompletedCoursesCount(userId);
    }
};

// Get all enrolled courses with their progress
export const getEnrolledCoursesWithProgress = async (userId) => {
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
            id: enrollment.course.id,
            title: enrollment.course.title,
            description: enrollment.course.description,
            category: enrollment.course.category,
            level: enrollment.course.level,
            imageUrl: enrollment.course.imageUrl,
            instructor: enrollment.course.instructor,
            duration: enrollment.course.duration,
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
                        : currentLesson > 0
                            ? "in_progress"
                            : "not_started",
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

// Get complete dashboard data
export const getDashboardData = async (userId) => {
    const [profile, streak, completedCount, enrolledCount, accuracy, courses] =
        await Promise.all([
            getUserProfile(userId),
            getUserStreak(userId),
            getModulesCompletedCount(userId),
            getEnrolledCoursesCount(userId),
            calculateAccuracy(userId),
            getEnrolledCoursesWithProgress(userId),
        ]);

    return {
        user: profile,
        stats: {
            streak,
            modulesCompleted: completedCount,
            modulesEnrolled: enrolledCount,
            accuracy,
        },
        courses,
    };
};
