import express from "express";
import { getUsageStatus, sendHeartbeat } from "../controllers/usageController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All usage routes require authentication
router.get("/status", authMiddleware, getUsageStatus);
router.post("/heartbeat", authMiddleware, sendHeartbeat);

export default router;
