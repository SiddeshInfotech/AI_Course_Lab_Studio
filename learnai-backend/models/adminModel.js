import prisma from "../config/db.js";

// ========== USER MANAGEMENT ==========
export const getAllUsers = async () => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            username: true,
            email: true,
            rollNumber: true,
            dob: true,
            isAdmin: true,
            created_at: true,
            centerId: true,
            center: {
                select: {
                    centerName: true,
                    centerCode: true,
                },
            },
            enrollments: {
                select: {
                    courseId: true,
                },
            },
            lessonProgress: {
                select: {
                    completed: true,
                },
            },
        },
        orderBy: { created_at: "desc" },
    });

    // Calculate progress for each user
    const usersWithProgress = await Promise.all(
        users.map(async (user) => {
            // Count total lessons across all enrolled courses
            const enrolledCourseIds = user.enrollments.map((e) => e.courseId);

            let totalLessons = 0;
            if (enrolledCourseIds.length > 0) {
                totalLessons = await prisma.lesson.count({
                    where: {
                        courseId: { in: enrolledCourseIds },
                    },
                });
            }

            // Count completed lessons
            const completedLessons = user.lessonProgress.filter((lp) => lp.completed).length;

            // Calculate progress percentage
            const progressPercentage = totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0;

            return {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                rollNumber: user.rollNumber,
                dob: user.dob,
                isAdmin: user.isAdmin,
                created_at: user.created_at,
                centerId: user.centerId,
                center: user.center,
                _count: {
                    enrollments: user.enrollments.length,
                },
                progress: progressPercentage,
            };
        })
    );

    return usersWithProgress;
};

export const getUserById = (id) =>
    prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            username: true,
            email: true,
            isAdmin: true,
            created_at: true,
            enrollments: {
                include: { course: true },
            },
        },
    });

export const setUserAdmin = (id, isAdmin) =>
    prisma.user.update({
        where: { id },
        data: { isAdmin },
    });

export const createUser = (data) =>
    prisma.user.create({ data });

export const deleteUser = (id) =>
    prisma.user.delete({ where: { id } });

// ========== DASHBOARD STATS ==========
export const getDashboardStats = async () => {
    const [
        totalUsers,
        totalCourses,
        totalLessons,
        totalEnrollments,
        recentUsers,
        recentEnrollments,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.course.count(),
        prisma.lesson.count(),
        prisma.enrollment.count(),
        prisma.user.findMany({
            take: 5,
            orderBy: { created_at: "desc" },
            where: { isAdmin: false },
            select: { id: true, name: true, username: true, email: true, created_at: true },
        }),
        prisma.enrollment.findMany({
            take: 5,
            orderBy: { enrolledAt: "desc" },
            include: {
                user: { select: { name: true, username: true, email: true } },
                course: { select: { title: true } },
            },
        }),
    ]);

    return {
        stats: {
            totalUsers,
            totalCourses,
            totalLessons,
            totalEnrollments,
        },
        recentUsers,
        recentEnrollments,
    };
};
