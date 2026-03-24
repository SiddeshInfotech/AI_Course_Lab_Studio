import prisma from "../config/db.js";

/**
 * TOOL QUERIES
 */
export const getAllTools = (filters = {}) =>
    prisma.tool.findMany({
        where: filters,
        orderBy: { createdAt: "desc" },
    });

export const getToolById = (id) =>
    prisma.tool.findUnique({ where: { id } });

export const createTool = (data) =>
    prisma.tool.create({ data });

export const updateTool = (id, data) =>
    prisma.tool.update({ where: { id }, data });

export const deleteTool = (id) =>
    prisma.tool.delete({ where: { id } });

/**
 * TOOL COURSE QUERIES - Link tools to courses with day/section ordering
 */

/**
 * Get all tools for a specific course organized by day/section
 * @param {number} courseId - The course ID
 * @returns {Promise<Array>} - Array of tools with course-specific metadata
 */
export const getToolsByCourse = async (courseId) =>
    prisma.toolCourse.findMany({
        where: { courseId: parseInt(courseId) },
        include: {
            tool: true,
        },
        orderBy: { orderIndex: "asc" },
    });

/**
 * Get tool course mapping with progress for a user
 * @param {number} userId - The user ID
 * @param {number} courseId - The course ID  
 * @returns {Promise<Array>} - Tools with user progress data
 */
export const getToolsWithProgressByCourse = async (userId, courseId) => {
    const tools = await prisma.toolCourse.findMany({
        where: { courseId: parseInt(courseId) },
        include: {
            tool: true,
            toolProgress: {
                where: { userId: parseInt(userId) },
            },
        },
        orderBy: { orderIndex: "asc" },
    });

    return tools.map((tc) => ({
        id: tc.id,
        courseId: tc.courseId,
        toolId: tc.toolId,
        orderIndex: tc.orderIndex,
        section: tc.section,
        sectionTitle: tc.sectionTitle,
        description: tc.description,
        demoVideoUrl: tc.demoVideoUrl || tc.tool.demoVideoUrl,
        isPremium: tc.isPremium,
        tool: tc.tool,
        progress: tc.toolProgress[0]
            ? {
                id: tc.toolProgress[0].id,
                completed: tc.toolProgress[0].completed,
                completedAt: tc.toolProgress[0].completedAt,
            }
            : null,
    }));
};

/**
 * Get single tool course with progress
 * @param {number} userId - The user ID
 * @param {number} toolCourseId - The tool course mapping ID
 * @returns {Promise<Object>} - Tool course data with progress
 */
export const getToolCourseWithProgress = async (userId, toolCourseId) => {
    const toolCourse = await prisma.toolCourse.findUnique({
        where: { id: parseInt(toolCourseId) },
        include: {
            tool: true,
            toolProgress: {
                where: { userId: parseInt(userId) },
            },
        },
    });

    if (!toolCourse) return null;

    return {
        ...toolCourse,
        demoVideoUrl: toolCourse.demoVideoUrl || toolCourse.tool.demoVideoUrl,
        progress: toolCourse.toolProgress[0] || null,
    };
};

/**
 * Create or update tool course mapping
 * @param {number} courseId - The course ID
 * @param {number} toolId - The tool ID
 * @param {Object} data - Tool course data
 * @returns {Promise<Object>} - Created/updated tool course
 */
export const upsertToolCourse = (courseId, toolId, data) =>
    prisma.toolCourse.upsert({
        where: {
            courseId_toolId: {
                courseId: parseInt(courseId),
                toolId: parseInt(toolId),
            },
        },
        update: data,
        create: {
            courseId: parseInt(courseId),
            toolId: parseInt(toolId),
            ...data,
        },
    });

/**
 * Update tool course
 * @param {number} id - The tool course ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} - Updated tool course
 */
export const updateToolCourse = (id, data) =>
    prisma.toolCourse.update({
        where: { id: parseInt(id) },
        data,
    });

/**
 * Delete tool course
 * @param {number} id - The tool course ID
 * @returns {Promise<Object>} - Deleted tool course
 */
export const deleteToolCourse = (id) =>
    prisma.toolCourse.delete({
        where: { id: parseInt(id) },
    });

/**
 * TOOL PROGRESS QUERIES - Track tool completion by user
 */

/**
 * Mark tool as completed for a user
 * @param {number} userId - The user ID
 * @param {number} toolCourseId - The tool course ID
 * @returns {Promise<Object>} - Tool progress record
 */
export const markToolComplete = async (userId, toolCourseId) => {
    const existing = await prisma.toolProgress.findUnique({
        where: {
            userId_toolCourseId: {
                userId: parseInt(userId),
                toolCourseId: parseInt(toolCourseId),
            },
        },
    });

    if (existing) {
        return prisma.toolProgress.update({
            where: { id: existing.id },
            data: {
                completed: true,
                completedAt: existing.completed ? existing.completedAt : new Date(),
            },
        });
    }

    return prisma.toolProgress.create({
        data: {
            userId: parseInt(userId),
            toolCourseId: parseInt(toolCourseId),
            completed: true,
            completedAt: new Date(),
        },
    });
};

/**
 * Get tool progress for a user in a course
 * @param {number} userId - The user ID
 * @param {number} courseId - The course ID
 * @returns {Promise<Array>} - All tool progress records
 */
export const getUserToolProgressInCourse = (userId, courseId) =>
    prisma.toolProgress.findMany({
        where: {
            userId: parseInt(userId),
            toolCourse: { courseId: parseInt(courseId) },
        },
        include: {
            toolCourse: {
                include: { tool: true },
            },
        },
    });

