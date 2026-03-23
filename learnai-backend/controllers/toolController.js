import {
    getAllTools,
    getToolById,
    createTool,
    updateTool,
    deleteTool,
} from "../models/toolModel.js";

// GET /api/tools — public (optional ?category=... or ?isPremium=true filter)
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
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/tools/:id — public
export const getTool = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const tool = await getToolById(id);
        if (!tool) return res.status(404).json({ message: "Tool not found" });
        res.json(tool);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/tools — protected
export const addTool = async (req, res) => {
    try {
        const { name, description, category, websiteUrl, imageUrl, isPremium } = req.body;

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
            isPremium: isPremium ?? false,
        });

        res.status(201).json(tool);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /api/tools/:id — protected
export const editTool = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const existing = await getToolById(id);
        if (!existing) return res.status(404).json({ message: "Tool not found" });

        const { name, description, category, websiteUrl, imageUrl, isPremium } = req.body;

        const updated = await updateTool(id, {
            ...(name && { name }),
            ...(description && { description }),
            ...(category && { category }),
            ...(websiteUrl && { websiteUrl }),
            ...(imageUrl !== undefined && { imageUrl }),
            ...(isPremium !== undefined && { isPremium }),
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/tools/:id — protected
export const removeTool = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const existing = await getToolById(id);
        if (!existing) return res.status(404).json({ message: "Tool not found" });

        await deleteTool(id);
        res.json({ message: "Tool deleted" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
