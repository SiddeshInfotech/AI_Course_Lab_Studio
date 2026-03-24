import {
    getAllTools,
    getToolById,
    createTool,
    updateTool,
    deleteTool,
    getToolsByCourse,
    getToolsWithProgressByCourse,
    getToolCourseWithProgress,
    upsertToolCourse,
    updateToolCourse,
    deleteToolCourse,
    markToolComplete,
    getUserToolProgressInCourse,
} from "../models/toolModel.js";
import prisma from "../config/db.js";

/**
 * GET /api/tools — public (optional ?category=... or ?isPremium=true filter)
 */
export const listTools = async (req, res) => {
    try {
        const filters = {};
        if (req.query.category) filters.category = req.query.category;
        if (req.query.isPremium !== undefined) {
            filters.isPremium = req.query.isPremium === "true";
        }
        const tools = await getAllTools(filters);
        res.json(tools);
    } catch (error) {
        console.error("List tools error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * GET /api/tools/:id — public
 */
export const getTool = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const tool = await getToolById(id);
        if (!tool) return res.status(404).json({ message: "Tool not found" });
        res.json(tool);
    } catch (error) {
        console.error("Get tool error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * POST /api/tools — protected (admin)
 */
export const addTool = async (req, res) => {
    try {
        const { name, description, category, websiteUrl, imageUrl, demoVideoUrl, isPremium } = req.body;

        if (!name || !description || !category || !websiteUrl) {
            return res.status(400).json({
                message: "name, description, category, and websiteUrl are required",
            });
        }

        const tool = await createTool({
            name,
            description,
            category,
            websiteUrl,
            imageUrl: imageUrl || null,
            demoVideoUrl: demoVideoUrl || null,
            isPremium: isPremium ?? false,
        });

        res.status(201).json(tool);
    } catch (error) {
        console.error("Add tool error:", error);
        if (error.code === "P2002") {
            return res.status(400).json({ message: "Tool name already exists" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * PUT /api/tools/:id — protected (admin)
 */
export const editTool = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const existing = await getToolById(id);
        if (!existing) return res.status(404).json({ message: "Tool not found" });

        const { name, description, category, websiteUrl, imageUrl, demoVideoUrl, isPremium } = req.body;

        const updated = await updateTool(id, {
            ...(name && { name }),
            ...(description && { description }),
            ...(category && { category }),
            ...(websiteUrl && { websiteUrl }),
            ...(imageUrl !== undefined && { imageUrl }),
            ...(demoVideoUrl !== undefined && { demoVideoUrl }),
            ...(isPremium !== undefined && { isPremium }),
        });

        res.json(updated);
    } catch (error) {
        console.error("Edit tool error:", error);
        if (error.code === "P2002") {
            return res.status(400).json({ message: "Tool name already exists" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * DELETE /api/tools/:id — protected (admin)
 */
export const removeTool = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const existing = await getToolById(id);
        if (!existing) return res.status(404).json({ message: "Tool not found" });

        await deleteTool(id);
        res.json({ message: "Tool deleted" });
    } catch (error) {
        console.error("Remove tool error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * GET /api/courses/:courseId/tools — public
 * Get all tools for a course with user progress
 */
export const getCourseTools = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user?.userId;

        if (!courseId) {
            return res.status(400).json({ message: "courseId is required" });
        }

        let tools;
        if (userId) {
            tools = await getToolsWithProgressByCourse(userId, courseId);
        } else {
            tools = await getToolsByCourse(courseId);
        }

        res.json(tools);
    } catch (error) {
        console.error("Get course tools error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * POST /api/courses/:courseId/tools — protected (admin)
 * Link a tool to a course with ordering and metadata
 */
export const linkToolToCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { toolId, orderIndex, section, sectionTitle, description, demoVideoUrl, isPremium } = req.body;

        if (!toolId || orderIndex === undefined) {
            return res.status(400).json({
                message: "toolId and orderIndex are required"
            });
        }

        const toolCourse = await upsertToolCourse(courseId, toolId, {
            orderIndex: parseInt(orderIndex),
            section: section || `Day ${orderIndex}`,
            sectionTitle: sectionTitle || null,
            description: description || null,
            demoVideoUrl: demoVideoUrl || null,
            isPremium: isPremium ?? false,
        });

        res.status(201).json(toolCourse);
    } catch (error) {
        console.error("Link tool to course error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * PUT /api/tools/course/:toolCourseId — protected (admin)
 * Update tool course mapping
 */
export const updateToolCourseMapping = async (req, res) => {
    try {
        const { toolCourseId } = req.params;
        const { orderIndex, section, sectionTitle, description, demoVideoUrl, isPremium } = req.body;

        const updated = await updateToolCourse(toolCourseId, {
            ...(orderIndex !== undefined && { orderIndex: parseInt(orderIndex) }),
            ...(section && { section }),
            ...(sectionTitle !== undefined && { sectionTitle }),
            ...(description !== undefined && { description }),
            ...(demoVideoUrl !== undefined && { demoVideoUrl }),
            ...(isPremium !== undefined && { isPremium }),
        });

        res.json(updated);
    } catch (error) {
        console.error("Update tool course mapping error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * DELETE /api/tools/course/:toolCourseId — protected (admin)
 * Unlink tool from course
 */
export const unlinkToolFromCourse = async (req, res) => {
    try {
        const { toolCourseId } = req.params;

        await deleteToolCourse(toolCourseId);
        res.json({ message: "Tool unlinked from course" });
    } catch (error) {
        console.error("Unlink tool from course error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * POST /api/learning/tools/:toolCourseId/complete — protected
 * Mark tool as completed by user
 */
export const completeToolLesson = async (req, res) => {
    try {
        const { toolCourseId } = req.params;
        const userId = req.user.userId;

        if (!toolCourseId) {
            return res.status(400).json({ message: "toolCourseId is required" });
        }

        const progress = await markToolComplete(userId, toolCourseId);
        res.json({
            message: "Tool marked as complete",
            progress,
        });
    } catch (error) {
        console.error("Complete tool lesson error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * GET /api/learning/:courseId/tools/progress — protected
 * Get user's tool progress in a course
 */
export const getUserCourseToolProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.userId;

        const progress = await getUserToolProgressInCourse(userId, courseId);
        res.json(progress);
    } catch (error) {
        console.error("Get tool progress error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * GET /api/tools/course/:toolCourseId — public
 * Get detailed tool course info with user progress if logged in
 */
export const getToolCourseDetail = async (req, res) => {
    try {
        const { toolCourseId } = req.params;
        const userId = req.user?.userId;

        let toolCourse;
        if (userId) {
            toolCourse = await getToolCourseWithProgress(userId, toolCourseId);
        } else {
            toolCourse = await prisma.toolCourse.findUnique({
                where: { id: parseInt(toolCourseId) },
                include: { tool: true },
            });
        }

        if (!toolCourse) {
            return res.status(404).json({ message: "Tool course not found" });
        }

        res.json(toolCourse);
    } catch (error) {
        console.error("Get tool course detail error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
