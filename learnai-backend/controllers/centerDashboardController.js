import prisma from "../config/db.js";

/**
 * GET /api/center/dashboard/stats
 * Get dashboard statistics for center
 */
export const getCenterDashboardStats = async (req, res) => {
    try {
        const centerId = req.centerId;

        // Get center info
        const center = await prisma.center.findUnique({
            where: { id: centerId },
            include: {
                users: {
                    select: {
                        id: true,
                        isAdmin: true,
                    },
                },
            },
        });

        if (!center) {
            return res.status(404).json({ message: "Center not found" });
        }

        const studentIds = center.users.filter(u => !u.isAdmin).map(u => u.id);
        const totalStudents = studentIds.length;

        if (totalStudents === 0) {
            return res.status(200).json({
                stats: {
                    totalStudents: 0,
                    enrolledCourses: 0,
                    completedCourses: 0,
                    inProgressCourses: 0,
                    totalLearningHours: 0,
                    averageProgress: 0,
                    activeToday: 0,
                },
            });
        }

        // Get course stats
        const enrollments = await prisma.enrollment.findMany({
            where: {
                userId: { in: studentIds },
            },
            include: {
                course: {
                    select: { id: true, title: true, lessons: { select: { id: true } } },
                },
            },
        });

        const enrolledCourses = new Set(enrollments.map(e => e.courseId)).size;

        // Get progress stats with lesson counts
        const progress = await prisma.courseProgress.findMany({
            where: {
                userId: { in: studentIds },
            },
        });

        const completedCourses = progress.filter(p => p.completed).length;
        const inProgressCourses = progress.filter(p => !p.completed).length;

        // Get lesson progress for calculating actual percentage
        const lessonProgress = await prisma.lessonProgress.findMany({
            where: {
                userId: { in: studentIds },
            },
            include: {
                lesson: {
                    select: { id: true, courseId: true },
                },
            },
        });

        // Calculate actual progress percentage
        // For each enrollment, calculate completed lessons / total lessons
        let totalProgressPercentage = 0;
        let enrollmentCount = enrollments.length;

        if (enrollmentCount > 0) {
            for (const enrollment of enrollments) {
                const courseLessons = enrollment.course.lessons.length;
                if (courseLessons > 0) {
                    const completedLessons = lessonProgress.filter(
                        lp => lp.lesson.courseId === enrollment.courseId && 
                              lp.userId === enrollment.userId && 
                              lp.completed
                    ).length;
                    totalProgressPercentage += (completedLessons / courseLessons) * 100;
                }
            }
        }

        const averageProgress = enrollmentCount > 0 
            ? Math.round(totalProgressPercentage / enrollmentCount)
            : 0;

        // Get daily usage stats for last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyUsage = await prisma.dailyUsage.findMany({
            where: {
                userId: { in: studentIds },
                date: { gte: sevenDaysAgo },
            },
            select: {
                totalSeconds: true,
                date: true,
            },
        });

        const totalLearningSeconds = dailyUsage.reduce((sum, d) => sum + d.totalSeconds, 0);
        const totalLearningHours = Math.round(totalLearningSeconds / 3600 * 10) / 10;

        // Get unique users active in last 7 days
        const activeUsers = new Set(dailyUsage.map(d => d.userId)).size;

        res.status(200).json({
            stats: {
                totalStudents,
                enrolledCourses,
                completedCourses,
                inProgressCourses,
                totalLearningHours,
                averageProgress: Math.min(averageProgress, 100),
                activeToday: activeUsers,
            },
        });
    } catch (error) {
        console.error("Get center dashboard stats error:", error);
        res.status(500).json({
            message: "Failed to get dashboard statistics",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

/**
 * GET /api/center/students
 * Get all students enrolled at this center
 */
export const getCenterStudents = async (req, res) => {
    try {
        const centerId = req.centerId;
        const { page = 1, limit = 20, search, course } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get center's students
        const center = await prisma.center.findUnique({
            where: { id: centerId },
            include: {
                users: {
                    where: {
                        isAdmin: false, // Only students, not center admin
                        ...(search && {
                            OR: [
                                { name: { contains: search, mode: "insensitive" } },
                                { username: { contains: search, mode: "insensitive" } },
                                { email: { contains: search, mode: "insensitive" } },
                            ],
                        }),
                    },
                    include: {
                        enrollments: course ? {
                            where: { courseId: parseInt(course) },
                            include: {
                                course: {
                                    select: { id: true, title: true },
                                },
                            },
                        } : {
                            include: {
                                course: {
                                    select: { id: true, title: true },
                                },
                            },
                        },
                        courseProgress: true,
                        dailyUsage: {
                            orderBy: { date: "desc" },
                            take: 7,
                        },
                    },
                    orderBy: { created_at: "desc" },
                },
            },
        });

        if (!center) {
            return res.status(404).json({ message: "Center not found" });
        }

        const total = center.users.length;

        // Get all lesson progress and lesson counts for these students to calculate actual progress
        const studentIds = center.users.map(u => u.id);
        
        // Get all lesson progress
        const allLessonProgress = await prisma.lessonProgress.findMany({
            where: {
                userId: { in: studentIds },
            },
            include: {
                lesson: {
                    select: { id: true, courseId: true },
                },
            },
        });

        // Get lesson counts per course
        const coursesWithLessonCounts = await prisma.course.findMany({
            where: {
                lessons: { some: {} },
            },
            select: {
                id: true,
                lessons: { select: { id: true } },
            },
        });

        const lessonCountMap = new Map();
        coursesWithLessonCounts.forEach(course => {
            lessonCountMap.set(course.id, course.lessons.length);
        });

        const students = center.users.slice(skip, skip + parseInt(limit)).map(student => {
            const progress = student.courseProgress || [];
            const completedCourses = progress.filter(p => p.completed).length;
            const totalCourses = student.enrollments?.length || 0;
            
            // Calculate actual progress based on completed lessons
            let totalLessons = 0;
            let completedLessons = 0;
            
            for (const enrollment of student.enrollments || []) {
                const courseLessons = lessonCountMap.get(enrollment.courseId) || 0;
                totalLessons += courseLessons;
                
                const studentCompletedLessons = allLessonProgress.filter(
                    lp => lp.userId === student.id && 
                          lp.lesson.courseId === enrollment.courseId && 
                          lp.completed
                ).length;
                completedLessons += studentCompletedLessons;
            }
            
            const avgProgress = totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0;

            // Get last activity from daily usage
            const lastActivity = student.dailyUsage?.[0]?.date || null;

            return {
                id: student.id,
                name: student.name,
                username: student.username,
                email: student.email,
                rollNumber: student.rollNumber,
                createdAt: student.created_at,
                enrolledCourses: student.enrollments?.map(e => ({
                    id: e.course.id,
                    title: e.course.title,
                    enrolledAt: e.enrolledAt,
                })) || [],
                totalCourses,
                completedCourses,
                avgProgress,
                progress: progress.map(p => ({
                    courseId: p.courseId,
                    completed: p.completed,
                    currentLessonId: p.currentLessonId,
                    startedAt: p.startedAt,
                    completedAt: p.completedAt,
                    lastAccessedAt: p.lastAccessedAt,
                })),
                lastActivity,
                dailyUsageLast7Days: student.dailyUsage?.reduce((sum, d) => sum + d.totalSeconds, 0) || 0,
            };
        });

        res.status(200).json({
            students,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error("Get center students error:", error);
        res.status(500).json({
            message: "Failed to get students",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

/**
 * GET /api/center/students/:studentId
 * Get detailed info for a specific student
 */
export const getStudentDetails = async (req, res) => {
    try {
        const centerId = req.centerId;
        const { studentId } = req.params;

        // Verify student belongs to this center
        const student = await prisma.user.findFirst({
            where: {
                id: parseInt(studentId),
                centerId: centerId,
                isAdmin: false,
            },
            include: {
                enrollments: {
                    include: {
                        course: {
                            select: {
                                id: true,
                                title: true,
                                category: true,
                                level: true,
                                lessons: {
                                    select: { id: true },
                                },
                            },
                        },
                    },
                },
                courseProgress: true,
                lessonProgress: {
                    include: {
                        lesson: {
                            select: {
                                id: true,
                                title: true,
                                orderIndex: true,
                                section: true,
                            },
                        },
                    },
                },
                dailyUsage: {
                    orderBy: { date: "desc" },
                    take: 30,
                },
            },
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Calculate detailed progress for each course
        const coursesProgress = student.enrollments.map(enrollment => {
            const courseProgress = student.courseProgress.find(
                p => p.courseId === enrollment.courseId
            );
            const lessonProgress = student.lessonProgress.filter(
                lp => lp.courseId === enrollment.courseId
            );
            const totalLessons = enrollment.course.lessons.length;
            const completedLessons = lessonProgress.filter(lp => lp.completed).length;
            const progressPercentage = totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0;

            return {
                course: {
                    id: enrollment.course.id,
                    title: enrollment.course.title,
                    category: enrollment.course.category,
                    level: enrollment.course.level,
                    totalLessons,
                },
                enrolledAt: enrollment.enrolledAt,
                progress: {
                    completed: courseProgress?.completed || false,
                    currentLessonId: courseProgress?.currentLessonId || 1,
                    startedAt: courseProgress?.startedAt || enrollment.enrolledAt,
                    completedAt: courseProgress?.completedAt,
                    lastAccessedAt: courseProgress?.lastAccessedAt,
                    completedLessons,
                    progressPercentage,
                },
                lessons: lessonProgress.map(lp => ({
                    lessonId: lp.lessonId,
                    title: lp.lesson.title,
                    section: lp.lesson.section,
                    orderIndex: lp.lesson.orderIndex,
                    completed: lp.completed,
                    completedAt: lp.completedAt,
                })),
            };
        });

        // Calculate total learning time
        const totalLearningSeconds = student.dailyUsage.reduce((sum, d) => sum + d.totalSeconds, 0);
        const totalLearningHours = Math.round(totalLearningSeconds / 3600 * 10) / 10;

        // Get learning streak (consecutive days)
        const dates = student.dailyUsage
            .map(d => d.date.toISOString().split("T")[0])
            .sort()
            .reverse();

        let streak = 0;
        const today = new Date().toISOString().split("T")[0];
        let checkDate = today;

        for (const date of dates) {
            if (date === checkDate || 
                date === new Date(Date.now() - 86400000).toISOString().split("T")[0]) {
                streak++;
                checkDate = new Date(new Date(date).getTime() - 86400000).toISOString().split("T")[0];
            } else {
                break;
            }
        }

        res.status(200).json({
            student: {
                id: student.id,
                name: student.name,
                username: student.username,
                email: student.email,
                rollNumber: student.rollNumber,
                dob: student.dob,
                createdAt: student.created_at,
            },
            coursesProgress,
            totalLearningHours,
            learningStreak: streak,
            dailyUsage: student.dailyUsage.map(d => ({
                date: d.date,
                seconds: d.totalSeconds,
                hours: Math.round(d.totalSeconds / 3600 * 10) / 10,
            })),
        });
    } catch (error) {
        console.error("Get student details error:", error);
        res.status(500).json({
            message: "Failed to get student details",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

/**
 * GET /api/center/courses
 * Get all courses with enrollment stats for this center
 */
export const getCenterCourses = async (req, res) => {
    try {
        const centerId = req.centerId;

        // Get all published courses
        const courses = await prisma.course.findMany({
            where: { status: "Published" },
            select: {
                id: true,
                title: true,
                category: true,
                level: true,
                instructor: true,
                duration: true,
                lessons: {
                    select: { id: true },
                },
            },
        });

        // Get center's students
        const center = await prisma.center.findUnique({
            where: { id: centerId },
            select: {
                users: {
                    where: { isAdmin: false },
                    select: { id: true },
                },
            },
        });

        if (!center) {
            return res.status(404).json({ message: "Center not found" });
        }

        const studentIds = center.users.map(u => u.id);

        // Get enrollment counts for each course
        const enrollments = await prisma.enrollment.findMany({
            where: {
                userId: { in: studentIds },
                courseId: { in: courses.map(c => c.id) },
            },
            include: {
                user: {
                    select: { id: true },
                },
            },
        });

        // Get progress for enrolled students
        const progress = await prisma.courseProgress.findMany({
            where: {
                userId: { in: studentIds },
                courseId: { in: courses.map(c => c.id) },
            },
        });

        const coursesWithStats = courses.map(course => {
            const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
            const courseProgress = progress.filter(p => p.courseId === course.id);
            const completedCount = courseProgress.filter(p => p.completed).length;
            const inProgressCount = courseProgress.filter(p => !p.completed).length;

            return {
                ...course,
                totalLessons: course.lessons.length,
                enrolledStudents: courseEnrollments.length,
                completedStudents: completedCount,
                inProgressStudents: inProgressCount,
                completionRate: courseEnrollments.length > 0
                    ? Math.round((completedCount / courseEnrollments.length) * 100)
                    : 0,
            };
        });

        res.status(200).json({
            courses: coursesWithStats.map(c => ({
                ...c,
                lessons: undefined, // Remove lessons array, just use count
            })),
        });
    } catch (error) {
        console.error("Get center courses error:", error);
        res.status(500).json({
            message: "Failed to get courses",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

/**
 * GET /api/center/activity
 * Get recent activity for all center students
 */
export const getCenterActivity = async (req, res) => {
    try {
        const centerId = req.centerId;
        const { limit = 50 } = req.query;

        // Get center's students
        const center = await prisma.center.findUnique({
            where: { id: centerId },
            select: {
                users: {
                    where: { isAdmin: false },
                    select: { id: true },
                },
            },
        });

        if (!center) {
            return res.status(404).json({ message: "Center not found" });
        }

        const studentIds = center.users.map(u => u.id);

        // Get recent lesson completions
        const recentCompletions = await prisma.lessonProgress.findMany({
            where: {
                userId: { in: studentIds },
                completed: true,
                completedAt: { not: null },
            },
            include: {
                user: {
                    select: { id: true, name: true, username: true },
                },
                lesson: {
                    select: {
                        id: true,
                        title: true,
                        courseId: true,
                    },
                },
            },
            orderBy: { completedAt: "desc" },
            take: parseInt(limit),
        });

        // Get recent course completions
        const recentCourseCompletions = await prisma.courseProgress.findMany({
            where: {
                userId: { in: studentIds },
                completed: true,
                completedAt: { not: null },
            },
            include: {
                user: {
                    select: { id: true, name: true, username: true },
                },
                course: {
                    select: { id: true, title: true },
                },
            },
            orderBy: { completedAt: "desc" },
            take: parseInt(limit),
        });

        // Combine and format activity
        const activities = [
            ...recentCompletions.map(c => ({
                type: "lesson_complete",
                userId: c.user.id,
                userName: c.user.name,
                userUsername: c.user.username,
                timestamp: c.completedAt,
                data: {
                    lessonId: c.lesson.id,
                    lessonTitle: c.lesson.title,
                    courseId: c.lesson.courseId,
                },
            })),
            ...recentCourseCompletions.map(c => ({
                type: "course_complete",
                userId: c.user.id,
                userName: c.user.name,
                userUsername: c.user.username,
                timestamp: c.completedAt,
                data: {
                    courseId: c.course.id,
                    courseTitle: c.course.title,
                },
            })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
         .slice(0, parseInt(limit));

        res.status(200).json({
            activities,
        });
    } catch (error) {
        console.error("Get center activity error:", error);
        res.status(500).json({
            message: "Failed to get activity",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};
