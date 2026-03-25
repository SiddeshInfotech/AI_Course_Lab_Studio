import prisma from "../config/db.js";

// ========== USER MANAGEMENT ==========
export const getAllUsers = () =>
    prisma.user.findMany({
        select: {
            id: true,
            name: true,
            username: true,
            email: true,
            rollNumber: true,
            dob: true,
            isAdmin: true,
            created_at: true,
            _count: {
                select: { enrollments: true },
            },
        },
        orderBy: { created_at: "desc" },
    });

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
