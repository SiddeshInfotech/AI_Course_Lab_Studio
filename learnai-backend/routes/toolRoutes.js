import express from "express";
import {
    listTools,
    getTool,
    addTool,
    editTool,
    removeTool,
    getCourseTools,
    linkToolToCourse,
    updateToolCourseMapping,
    unlinkToolFromCourse,
    completeToolLesson,
    getUserCourseToolProgress,
    getToolCourseDetail,
} from "../controllers/toolController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// Tool management (public read, admin write)
router.get("/", listTools);
router.get("/:id", getTool);
router.post("/", authMiddleware, adminMiddleware, addTool);
router.put("/:id", authMiddleware, adminMiddleware, editTool);
router.delete("/:id", authMiddleware, adminMiddleware, removeTool);

// Tool course mappings (link tools to courses with ordering)
router.get("/course/:toolCourseId", getToolCourseDetail);
router.post("/course/:toolCourseId/update", authMiddleware, adminMiddleware, updateToolCourseMapping);
router.delete("/course/:toolCourseId", authMiddleware, adminMiddleware, unlinkToolFromCourse);

export default router;
