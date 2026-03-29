import express from "express";
import {
  uploadEncryptedVideo,
  getDecryptionKey,
  streamEncryptedVideo,
  verifyVideoIntegrity,
} from "../controllers/encryptionController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import multer from "multer";

const router = express.Router();

// Configure multer for encrypted video uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/octet-stream", "application/x-encrypted"];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.enc')) {
      cb(null, true);
    } else {
      cb(new Error("Invalid encrypted video format"), false);
    }
  },
});

// Multer error handling
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        message: 'File too large. Maximum size is 500MB.',
        error: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({
      message: `Upload error: ${err.message}`,
      error: err.code,
    });
  }
  if (err) {
    return res.status(400).json({
      message: err.message || 'Upload failed',
      error: 'UPLOAD_ERROR',
    });
  }
  next();
};

const wrapMulterUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  };
};

// All encryption routes require authentication
router.use(authMiddleware);

// Upload encrypted video (admin only)
router.post(
  "/upload",
  adminMiddleware,
  wrapMulterUpload(upload.single("video")),
  uploadEncryptedVideo
);

// Get decryption key for streaming (device-bound)
router.post("/decrypt-key", getDecryptionKey);

// Stream encrypted video
router.get("/stream/:videoId", streamEncryptedVideo);

// Verify video integrity
router.post("/verify/:videoId", adminMiddleware, verifyVideoIntegrity);

export default router;
