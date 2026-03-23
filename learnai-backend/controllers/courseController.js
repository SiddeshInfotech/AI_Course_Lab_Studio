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

// POST /api/courses — protected
export const addCourse = async (req, res) => {
    try {
        const { title, description, category, level, imageUrl, instructor, duration } = req.body;

        if (!title || !description || !category || !level || !instructor || !duration) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const course = await createCourse({
            title,
            description,
            category,
            level,
            imageUrl: imageUrl || null,
            instructor,
            duration,
        });

        res.status(201).json(course);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /api/courses/:id — protected
export const editCourse = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const existing = await getCourseById(id);
        if (!existing) return res.status(404).json({ message: "Course not found" });

        const { title, description, category, level, imageUrl, instructor, duration } = req.body;

        const updated = await updateCourse(id, {
            ...(title && { title }),
            ...(description && { description }),
            ...(category && { category }),
            ...(level && { level }),
            ...(imageUrl !== undefined && { imageUrl }),
            ...(instructor && { instructor }),
            ...(duration && { duration }),
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/courses/:id — protected
export const removeCourse = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const existing = await getCourseById(id);
        if (!existing) return res.status(404).json({ message: "Course not found" });

        await deleteCourse(id);
        res.json({ message: "Course deleted" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
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
