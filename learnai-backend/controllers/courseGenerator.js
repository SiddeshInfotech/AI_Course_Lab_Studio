import prisma from "../config/db.js";

/**
 * Create a course from input/output tools mapping
 * This is used by admin to quickly generate courses
 */
export const createCourseFromTools = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            level = "beginner",
            instructor,
            duration = "4 weeks",
            inputType,
            outputType,
        } = req.body;

        // Validation
        if (!title || !inputType || !outputType) {
            return res.status(400).json({
                message: "title, inputType, and outputType are required",
            });
        }

        // Create course
        const course = await prisma.course.create({
            data: {
                title,
                description: description || `Course: ${inputType} to ${outputType}`,
                category: category || `${inputType}-to-${outputType}`,
                level,
                instructor: instructor || "Admin",
                duration,
            },
        });

        // Find all tools matching inputType → outputType
        const matchingTools = await prisma.tool.findMany({
            where: {
                category: {
                    in: [inputType, outputType, `${inputType}-${outputType}`],
                },
            },
        });

        // Link tools to course in order
        const linkedTools = [];
        for (let i = 0; i < matchingTools.length; i++) {
            const toolCourse = await prisma.toolCourse.create({
                data: {
                    courseId: course.id,
                    toolId: matchingTools[i].id,
                    orderIndex: i + 1,
                    section: `Day ${i + 1}`,
                    sectionTitle: `${matchingTools[i].name} - ${inputType} to ${outputType}`,
                    description: `Learn ${matchingTools[i].name} for ${inputType} to ${outputType} conversion`,
                    demoVideoUrl: `https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&controls=1&showinfo=0`,
                    isPremium: matchingTools[i].isPremium,
                },
            });
            linkedTools.push(toolCourse);
        }

        res.status(201).json({
            message: "Course created successfully",
            course: {
                ...course,
                toolsLinked: linkedTools.length,
            },
        });
    } catch (error) {
        console.error("Create course from tools error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * List all available input/output type combinations
 */
export const getAvailableToolMappings = async (req, res) => {
    try {
        // Get all unique categories from tools
        const tools = await prisma.tool.findMany({
            distinct: ["category"],
            select: { category: true },
        });

        // Create mappings (simplified - you can expand this)
        const mappings = [
            { inputType: "Text", outputType: "Text" },
            { inputType: "Text", outputType: "Audio" },
            { inputType: "Text", outputType: "Image" },
            { inputType: "Text", outputType: "Video" },
            { inputType: "Text", outputType: "Animation" },
            { inputType: "Image", outputType: "Text" },
            { inputType: "Image", outputType: "Image" },
            { inputType: "Image", outputType: "Video" },
            { inputType: "Image", outputType: "Animation" },
            { inputType: "Audio", outputType: "Text" },
            { inputType: "Audio", outputType: "Audio" },
            { inputType: "Video", outputType: "Text" },
            { inputType: "Video", outputType: "Video" },
            { inputType: "Video", outputType: "Animation" },
        ];

        res.json({
            availableMappings: mappings,
            categories: tools.map((t) => t.category),
        });
    } catch (error) {
        console.error("Get tool mappings error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
