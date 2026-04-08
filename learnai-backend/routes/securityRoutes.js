/**
 * Security & Access Logging Routes
 * Handles:
 * - Access logging for audit trails
 * - Anomaly detection
 * - Device fingerprinting
 */

import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const db = new PrismaClient();

/**
 * Log video access for audit trail
 * POST /api/security/log-access
 */
router.post("/log-access", authMiddleware, async (req, res) => {
  try {
    const { videoId, deviceId } = req.body;
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!videoId) {
      return res.status(400).json({ error: "videoId is required" });
    }

    // Log to database
    const log = await db.videoAccessLog.create({
      data: {
        userId,
        videoId: parseInt(videoId),
        deviceId: deviceId || null,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
        accessTime: new Date(),
      },
    });

    // Check for suspicious patterns
    await checkAnomalies(userId, videoId);

    res.json({ success: true, logId: log.id });
  } catch (error) {
    console.error("Error logging access:", error);
    res.status(500).json({ error: "Failed to log access" });
  }
});

/**
 * Get access logs (admin only)
 * GET /api/security/logs
 */
router.get("/logs", authMiddleware, async (req, res) => {
  try {
    // Only admins can view all logs - query database for isAdmin
    const user = await db.user.findUnique({
      where: { id: req.user.userId || req.user.id },
      select: { isAdmin: true },
    });

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { limit = 100, offset = 0, userId: filterUserId } = req.query;

    const logs = await db.videoAccessLog.findMany({
      where: filterUserId ? { userId: parseInt(filterUserId) } : {},
      orderBy: { accessTime: "desc" },
      take: Math.min(parseInt(limit), 1000),
      skip: parseInt(offset),
    });

    const total = await db.videoAccessLog.count(
      filterUserId ? { where: { userId: parseInt(filterUserId) } } : {}
    );

    res.json({ logs, total, limit, offset });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

/**
 * Get user's own access logs
 * GET /api/security/my-logs
 */
router.get("/my-logs", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const logs = await db.videoAccessLog.findMany({
      where: { userId },
      orderBy: { accessTime: "desc" },
      take: Math.min(parseInt(limit), 100),
      skip: parseInt(offset),
      select: {
        id: true,
        videoId: true,
        deviceId: true,
        accessTime: true,
        userAgent: true,
        ipAddress: true,
      },
    });

    res.json({ logs });
  } catch (error) {
    console.error("Error fetching user logs:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

/**
 * Check for suspicious access patterns
 * Internal function
 */
async function checkAnomalies(userId, videoId) {
  try {
    // Check 1: Same video watched multiple times in short period
    const recentLogs = await db.videoAccessLog.findMany({
      where: {
        userId,
        videoId: videoId ? parseInt(videoId) : undefined,
        accessTime: {
          gte: new Date(Date.now() - 3600000), // Last hour
        },
      },
    });

    if (recentLogs.length > 50) {
      console.warn(`⚠️ ANOMALY: User ${userId} accessed video ${videoId} 50+ times in 1 hour`);
      await flagAnomalousActivity(userId, "high_frequency_access", {
        videoId,
        accessCount: recentLogs.length,
      });
    }

    // Check 2: Multiple devices in short period
    const recentDeviceLogs = await db.videoAccessLog.findMany({
      where: {
        userId,
        accessTime: {
          gte: new Date(Date.now() - 300000), // Last 5 minutes
        },
      },
      select: {
        deviceId: true,
      },
    });

    const uniqueDevices = new Set(recentDeviceLogs.map(log => log.deviceId).filter(Boolean));

    if (uniqueDevices.size > 3) {
      console.warn(`⚠️ ANOMALY: User ${userId} accessed from ${uniqueDevices.size} devices in 5 minutes`);
      await flagAnomalousActivity(userId, "multiple_devices", {
        deviceCount: uniqueDevices.size,
      });
    }

    // Check 3: Rapid content access
    const rapidAccess = await db.videoAccessLog.findMany({
      where: {
        userId,
        accessTime: {
          gte: new Date(Date.now() - 600000), // Last 10 minutes
        },
      },
    });

    if (rapidAccess.length > 20) {
      console.warn(
        `⚠️ ANOMALY: User ${userId} accessed 20+ videos in 10 minutes (possible automated scraping)`
      );
      await flagAnomalousActivity(userId, "rapid_content_access", {
        videoCount: rapidAccess.length,
        timeWindow: "10 minutes",
      });
    }
  } catch (error) {
    console.error("Error checking anomalies:", error);
  }
}

/**
 * Flag suspicious activity for review
 * Internal function
 */
async function flagAnomalousActivity(userId, activityType, details) {
  try {
    // Store in database for admin review
    await db.securityAlert.create({
      data: {
        userId,
        activityType,
        severity: "high",
        details: details,
        reviewed: false,
        timestamp: new Date(),
        createdAt: new Date(),
      },
    });

    // Could also send admin notification here
    console.log(`[SECURITY ALERT] ${activityType} from user ${userId}`);
  } catch (error) {
    console.error("Error flagging anomalous activity:", error);
  }
}

/**
 * Get security alerts (admin only)
 * GET /api/security/alerts
 */
router.get("/alerts", authMiddleware, async (req, res) => {
  try {
    // Check if user is admin in database
    const user = await db.user.findUnique({
      where: { id: req.user.userId || req.user.id },
      select: { isAdmin: true },
    });

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { limit = 50, reviewed = false } = req.query;

    const alerts = await db.securityAlert.findMany({
      where: reviewed === "false" ? { reviewed: false } : {},
      orderBy: { timestamp: "desc" },
      take: Math.min(parseInt(limit), 500),
      include: {
        user: {
          select: { id: true, email: true, username: true },
        },
      },
    });

    res.json({ alerts, count: alerts.length });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

/**
 * Mark security alert as reviewed
 * POST /api/security/alerts/:id/review
 */
router.post("/alerts/:id/review", authMiddleware, async (req, res) => {
  try {
    // Check if user is admin in database
    const user = await db.user.findUnique({
      where: { id: req.user.userId || req.user.id },
      select: { isAdmin: true },
    });

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;
    const { action, notes } = req.body;

    const alert = await db.securityAlert.update({
      where: { id: parseInt(id) },
      data: {
        reviewed: true,
        reviewedAt: new Date(),
        reviewedBy: req.user.userId || req.user.id,
        adminNotes: notes,
        action,
      },
    });

    res.json({ success: true, alert });
  } catch (error) {
    console.error("Error updating alert:", error);
    res.status(500).json({ error: "Failed to update alert" });
  }
});

export default router;
