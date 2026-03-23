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

    return streak;
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
    const completed = await getCompletedCoursesCount(userId);
    const enrolled = await getEnrolledCoursesCount(userId);

    if (enrolled === 0) return 0;
    return Math.round((completed / enrolled) * 100);
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
            getCompletedCoursesCount(userId),
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
