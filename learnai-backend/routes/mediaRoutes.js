import express from "express";
import multer from "multer";
import { getMedia } from "../controllers/uploadController.js";

const router = express.Router();

// Configure multer for memory storage (files stored in buffer)
const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max
    },
});

// Public route to stream/download media
router.get("/:id", getMedia);

export default router;
