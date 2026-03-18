import express from "express";
import {
    listTools,
    getTool,
    addTool,
    editTool,
    removeTool,
} from "../controllers/toolController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", listTools);
router.get("/:id", getTool);
router.post("/", authMiddleware, addTool);
router.put("/:id", authMiddleware, editTool);
router.delete("/:id", authMiddleware, removeTool);

export default router;
