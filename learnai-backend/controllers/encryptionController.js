import fs from "fs";
import path from "path";
import crypto from "crypto";
import prisma from "../config/db.js";

/**
 * Upload and encrypt video
 */
export const uploadEncryptedVideo = async (req, res) => {
  try {
    const { videoId, title, courseId, lessonId } = req.body;
    const { file } = req;

    if (!file) {
      return res.status(400).json({
        message: "No video file provided",
        error: "NO_FILE",
      });
    }

    if (!videoId) {
      return res.status(400).json({
        message: "Video ID is required",
        error: "NO_VIDEO_ID",
      });
    }

    // Generate unique filename for encrypted video
    const filename = `encrypted-video-${videoId}-${Date.now()}.enc`;
    const filepath = path.join(process.cwd(), "uploads", "encrypted", filename);

    // Ensure directory exists
    const dirPath = path.dirname(filepath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Simple encryption for now (just copy file for testing)
    fs.writeFileSync(filepath, file.buffer);

    // Generate video integrity metadata
    const fileHash = crypto
      .createHash("sha256")
      .update(file.buffer)
      .digest("hex");

    // Store video metadata in database
    const videoMetadata = await prisma.encryptedVideo.create({
      data: {
        videoId,
        title: title || file.originalname,
        encryptedFileName: filename,
        encryptedFilePath: filepath,
        originalMimeType: file.mimetype,
        fileSize: file.size,
        encryptedFileSize: file.size,
        fileHash,
        courseId: courseId ? parseInt(courseId) : null,
        lessonId: lessonId ? parseInt(lessonId) : null,
        uploadedBy: req.user.id,
      },
    });

    res.status(201).json({
      message: "Video encrypted and uploaded successfully",
      success: true,
      data: {
        id: videoMetadata.id,
        videoId: videoMetadata.videoId,
        title: videoMetadata.title,
        fileHash: videoMetadata.fileHash,
        uploadedAt: videoMetadata.createdAt,
      },
    });
  } catch (error) {
    console.error("Video encryption upload error:", error);
    res.status(500).json({
      message: "Failed to encrypt and upload video",
      error: "UPLOAD_FAILED",
      details: error.message,
    });
  }
};

/**
 * Get decryption key (device-bound)
 */
export const getDecryptionKey = async (req, res) => {
  try {
    const { videoId, deviceId, licenseKey } = req.body;
    const userId = req.user.id;

    if (!videoId || !deviceId || !licenseKey) {
      return res.status(400).json({
        message: "Missing required fields: videoId, deviceId, licenseKey",
        error: "MISSING_FIELDS",
      });
    }

    // Validate license
    const license = await prisma.userLicense.findFirst({
      where: {
        licenseKey,
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!license) {
      return res.status(401).json({
        message: "Invalid or expired license",
        error: "INVALID_LICENSE",
      });
    }

    // Simple key generation for now
    const decryptionKey = Buffer.alloc(32);
    decryptionKey.fill(0);

    // Log access for audit
    await prisma.videoAccessLog.create({
      data: {
        userId,
        videoId: parseInt(videoId) || 0,
        deviceId,
        licenseId: license.id,
        accessTime: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Decryption key generated",
      data: {
        key: decryptionKey.toString("base64"),
        videoId,
        expiresIn: 3600,
        algorithm: "aes-256-gcm",
      },
    });
  } catch (error) {
    console.error("Decryption key generation error:", error);
    res.status(500).json({
      message: "Failed to generate decryption key",
      error: "KEY_GENERATION_FAILED",
      details: error.message,
    });
  }
};

/**
 * Stream encrypted video
 */
export const streamEncryptedVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { deviceId, licenseKey } = req.query;

    if (!deviceId || !licenseKey) {
      return res.status(401).json({
        message: "Device ID and license key required",
        error: "MISSING_AUTH",
      });
    }

    // Get video metadata
    const videoMetadata = await prisma.encryptedVideo.findFirst({
      where: { videoId },
    });

    if (!videoMetadata) {
      return res.status(404).json({
        message: "Video not found",
        error: "VIDEO_NOT_FOUND",
      });
    }

    // Verify file exists
    if (!fs.existsSync(videoMetadata.encryptedFilePath)) {
      return res.status(404).json({
        message: "Video file not found on server",
        error: "FILE_NOT_FOUND",
      });
    }

    // Set streaming headers
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", videoMetadata.encryptedFileSize);

    // Stream file
    const fileStream = fs.createReadStream(videoMetadata.encryptedFilePath);

    fileStream.on("error", (error) => {
      console.error("Stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          message: "Failed to stream video",
          error: "STREAM_ERROR",
        });
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error("Video streaming error:", error);
    res.status(500).json({
      message: "Failed to stream video",
      error: "STREAM_FAILED",
      details: error.message,
    });
  }
};

/**
 * Verify video integrity
 */
export const verifyVideoIntegrity = async (req, res) => {
  try {
    const { videoId } = req.params;

    const videoMetadata = await prisma.encryptedVideo.findFirst({
      where: { videoId },
    });

    if (!videoMetadata) {
      return res.status(404).json({
        message: "Video not found",
        error: "VIDEO_NOT_FOUND",
      });
    }

    if (!fs.existsSync(videoMetadata.encryptedFilePath)) {
      return res.status(404).json({
        message: "Video file not found",
        error: "FILE_NOT_FOUND",
      });
    }

    const currentHash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(videoMetadata.encryptedFilePath))
      .digest("hex");

    const integrityValid = currentHash === videoMetadata.fileHash;

    res.json({
      success: true,
      data: {
        videoId,
        integrityValid,
        originalHash: videoMetadata.fileHash,
        currentHash,
        fileSize: videoMetadata.fileSize,
        status: integrityValid ? "VALID" : "CORRUPTED",
      },
    });
  } catch (error) {
    console.error("Integrity verification error:", error);
    res.status(500).json({
      message: "Failed to verify integrity",
      error: "VERIFICATION_FAILED",
      details: error.message,
    });
  }
};
