import {
    getAllCourses,
    getCourseById,
    getCourseWithLessons,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollUser,
    getEnrollment,
    getUserEnrollments,
    getLessonsByCourse,
    getLessonById,
    createLesson,
    updateLesson,
    deleteLesson,
} from "../models/courseModel.js";
import prisma from "../config/db.js";

// Helper function for URL validation
const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

// GET /api/courses — public
export const listCourses = async (req, res) => {
    try {
        const courses = await getAllCourses();
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/courses/enrolled — protected
export const listEnrolledCourses = async (req, res) => {
    try {
        const enrollments = await getUserEnrollments(req.user.userId);
        const courses = enrollments.map((e) => ({
            ...e.course,
            enrolledAt: e.enrolledAt,
        }));
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/courses/:id — public
export const getCourse = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const course = await getCourseById(id);
        if (!course) return res.status(404).json({ message: "Course not found" });
        res.json(course);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/courses/:id/content — protected with access limit
export const getCourseContent = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const course = await getCourseWithLessons(id);
        if (!course) return res.status(404).json({ message: "Course not found" });

        // Return course with lessons and usage info from middleware
        res.json({
            course,
            usageInfo: req.usageInfo,
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/courses — protected (admin only)
export const addCourse = async (req, res) => {
    try {
        const { title, description, category, level, imageUrl, instructor, duration, status = 'published' } = req.body;

        // Enhanced validation
        if (!title || !description || !category || !level || !instructor || !duration) {
            return res.status(400).json({
                message: "Missing required fields",
                required: ["title", "description", "category", "level", "instructor", "duration"]
            });
        }

        // Validate field lengths
        if (title.length > 200) {
            return res.status(400).json({ message: "Title must be 200 characters or less" });
        }

        if (description.length > 2000) {
            return res.status(400).json({ message: "Description must be 2000 characters or less" });
        }

        // Validate level enum
        const validLevels = ['beginner', 'intermediate', 'advanced'];
        if (!validLevels.includes(level.toLowerCase())) {
            return res.status(400).json({
                message: "Invalid level",
                validLevels: validLevels
            });
        }

        // Validate URL if provided
        if (imageUrl && !isValidUrl(imageUrl)) {
            return res.status(400).json({ message: "Invalid image URL format" });
        }

        const course = await createCourse({
            title: title.trim(),
            description: description.trim(),
            category: category.trim(),
            level: level.toLowerCase(),
            imageUrl: imageUrl ? imageUrl.trim() : null,
            instructor: instructor.trim(),
            duration: duration.trim(),
        });

        res.status(201).json({
            success: true,
            course,
            message: "Course created successfully"
        });
    } catch (error) {
        console.error("Create course error:", error);

        // Handle duplicate course titles
        if (error.code === 'P2002' && error.meta?.target?.includes('title')) {
            return res.status(400).json({ message: "Course with this title already exists" });
        }

        res.status(500).json({ message: "Failed to create course" });
    }
};

// PUT /api/courses/:id — protected (admin only)
export const editCourse = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid course ID" });
        }

        const existing = await getCourseById(id);
        if (!existing) {
            return res.status(404).json({ message: "Course not found" });
        }

        const { title, description, category, level, imageUrl, instructor, duration, status } = req.body;

        // Validate provided fields
        if (title && title.length > 200) {
            return res.status(400).json({ message: "Title must be 200 characters or less" });
        }

        if (description && description.length > 2000) {
            return res.status(400).json({ message: "Description must be 2000 characters or less" });
        }

        if (level) {
            const validLevels = ['beginner', 'intermediate', 'advanced'];
            if (!validLevels.includes(level.toLowerCase())) {
                return res.status(400).json({
                    message: "Invalid level",
                    validLevels: validLevels
                });
            }
        }

        if (imageUrl && !isValidUrl(imageUrl)) {
            return res.status(400).json({ message: "Invalid image URL format" });
        }

        const updateData = {};
        if (title) updateData.title = title.trim();
        if (description) updateData.description = description.trim();
        if (category) updateData.category = category.trim();
        if (level) updateData.level = level.toLowerCase();
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl ? imageUrl.trim() : null;
        if (instructor) updateData.instructor = instructor.trim();
        if (duration) updateData.duration = duration.trim();

        const updated = await updateCourse(id, updateData);

        res.json({
            success: true,
            course: updated,
            message: "Course updated successfully"
        });
    } catch (error) {
        console.error("Update course error:", error);

        // Handle duplicate course titles
        if (error.code === 'P2002' && error.meta?.target?.includes('title')) {
            return res.status(400).json({ message: "Course with this title already exists" });
        }

        res.status(500).json({ message: "Failed to update course" });
    }
};

// DELETE /api/courses/:id — protected (admin only)
export const removeCourse = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid course ID" });
        }

        const existing = await getCourseById(id);
        if (!existing) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Check if course has enrollments (prevent deletion if students are enrolled)
        const enrollments = await getUserEnrollments(id);
        if (enrollments && enrollments.length > 0) {
            return res.status(400).json({
                message: "Cannot delete course with active enrollments",
                enrollmentCount: enrollments.length,
                suggestion: "Unenroll all students before deleting the course"
            });
        }

        await deleteCourse(id);

        res.json({
            success: true,
            message: "Course deleted successfully",
            deletedCourse: { id, title: existing.title }
        });
    } catch (error) {
        console.error("Delete course error:", error);
        res.status(500).json({ message: "Failed to delete course" });
    }
};

// POST /api/courses/:id/enroll — protected
export const enroll = async (req, res) => {
    try {
        const courseId = parseInt(req.params.id);
        const userId = req.user.userId;

        const course = await getCourseById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        const existing = await getEnrollment(userId, courseId);
        if (existing) return res.status(400).json({ message: "Already enrolled" });

        await enrollUser(userId, courseId);
        res.status(201).json({ message: "Enrolled successfully" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/courses/:id/lessons — get all lessons for a course
export const listLessons = async (req, res) => {
    try {
        const courseId = parseInt(req.params.id);
        const course = await getCourseById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        const lessons = await getLessonsByCourse(courseId);
        res.json(lessons);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/courses/:id/lessons — add a lesson to a course
export const addLesson = async (req, res) => {
    try {
        const courseId = parseInt(req.params.id);
        const course = await getCourseById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        const { title, description, content, videoUrl, orderIndex, duration } = req.body;

        if (!title || orderIndex === undefined) {
            return res.status(400).json({ message: "Title and orderIndex are required" });
        }

        const lesson = await createLesson({
            courseId,
            title,
            description: description || null,
            content: content || null,
            videoUrl: videoUrl || null,
            orderIndex,
            duration: duration || null,
        });

        res.status(201).json(lesson);
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(400).json({ message: "Lesson with this orderIndex already exists" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /api/courses/:courseId/lessons/:lessonId — update a lesson
export const editLesson = async (req, res) => {
    try {
        const lessonId = parseInt(req.params.lessonId);
        const existing = await getLessonById(lessonId);
        if (!existing) return res.status(404).json({ message: "Lesson not found" });

        const { title, description, content, videoUrl, orderIndex, duration } = req.body;

        const updated = await updateLesson(lessonId, {
            ...(title && { title }),
            ...(description !== undefined && { description }),
            ...(content !== undefined && { content }),
            ...(videoUrl !== undefined && { videoUrl }),
            ...(orderIndex !== undefined && { orderIndex }),
            ...(duration !== undefined && { duration }),
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/courses/:courseId/lessons/:lessonId — delete a lesson
export const removeLesson = async (req, res) => {
    try {
        const lessonId = parseInt(req.params.lessonId);
        const existing = await getLessonById(lessonId);
        if (!existing) return res.status(404).json({ message: "Lesson not found" });

        await deleteLesson(lessonId);
        res.json({ message: "Lesson deleted" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// ========================================
// ADMIN-SPECIFIC ENDPOINTS
// ========================================

// GET /api/courses/admin/stats — admin dashboard statistics
export const getAdminCourseStats = async (req, res) => {
    try {
        const courses = await getAllCourses();

        // Calculate course statistics
        const totalCourses = courses.length;
        const coursesByLevel = courses.reduce((acc, course) => {
            acc[course.level] = (acc[course.level] || 0) + 1;
            return acc;
        }, {});

        const coursesByCategory = courses.reduce((acc, course) => {
            acc[course.category] = (acc[course.category] || 0) + 1;
            return acc;
        }, {});

        res.json({
            success: true,
            stats: {
                totalCourses,
                coursesByLevel,
                coursesByCategory,
                recentCourses: courses
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 5)
            }
        });
    } catch (error) {
        console.error("Get course stats error:", error);
        res.status(500).json({ message: "Failed to get course statistics" });
    }
};

// GET /api/courses/admin/detailed — admin course list with enrollment counts
export const getAdminCourseList = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, level, search } = req.query;

        let courses = await getAllCourses();

        // Apply filters
        if (category && category !== 'all') {
            courses = courses.filter(course =>
                course.category.toLowerCase() === category.toLowerCase()
            );
        }

        if (level && level !== 'all') {
            courses = courses.filter(course =>
                course.level.toLowerCase() === level.toLowerCase()
            );
        }

        if (search) {
            const searchLower = search.toLowerCase();
            courses = courses.filter(course =>
                course.title.toLowerCase().includes(searchLower) ||
                course.description.toLowerCase().includes(searchLower) ||
                course.instructor.toLowerCase().includes(searchLower)
            );
        }

        // Add enrollment counts for each course
        const coursesWithMetadata = await Promise.all(
            courses.map(async (course) => {
                try {
                    const [lessons, enrollmentCount] = await Promise.all([
                        getLessonsByCourse(course.id),
                        prisma.enrollment.count({
                            where: { courseId: course.id }
                        })
                    ]);

                    return {
                        ...course,
                        lessonCount: lessons?.length || 0,
                        enrollmentCount: enrollmentCount || 0
                    };
                } catch (error) {
                    console.error(`Error fetching metadata for course ${course.id}:`, error);
                    return {
                        ...course,
                        lessonCount: 0,
                        enrollmentCount: 0,
                    };
                }
            })
        );

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedCourses = coursesWithMetadata.slice(startIndex, endIndex);

        res.json({
            success: true,
            courses: paginatedCourses,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(coursesWithMetadata.length / limit),
                totalCourses: coursesWithMetadata.length,
                coursesPerPage: parseInt(limit)
            },
            filters: { category, level, search }
        });
    } catch (error) {
        console.error("Get admin course list error:", error);
        res.status(500).json({ message: "Failed to get course list" });
    }
};

// GET /api/courses/admin/enrollments/:courseId — get all enrolled students for a course
export const getCourseEnrollments = async (req, res) => {
    try {
        const courseId = parseInt(req.params.courseId);

        if (isNaN(courseId)) {
            return res.status(400).json({ message: "Invalid course ID" });
        }

        // Check if course exists
        const course = await getCourseById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Get all enrollments with user details
        const enrollments = await prisma.enrollment.findMany({
            where: { courseId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                        rollNumber: true,
                        dob: true,
                        created_at: true,
                    }
                }
            },
            orderBy: {
                enrolledAt: 'desc'
            }
        });

        const enrolledStudents = enrollments.map(enrollment => ({
            enrollmentId: enrollment.id,
            enrolledAt: enrollment.enrolledAt,
            student: enrollment.user
        }));

        res.json({
            success: true,
            course: {
                id: course.id,
                title: course.title,
                category: course.category,
                level: course.level
            },
            enrollments: enrolledStudents,
            totalEnrolled: enrolledStudents.length
        });
    } catch (error) {
        console.error("Get course enrollments error:", error);
        res.status(500).json({ message: "Failed to get course enrollments" });
    }
};
