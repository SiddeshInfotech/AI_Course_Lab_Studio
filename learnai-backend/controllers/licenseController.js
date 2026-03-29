import prisma from "../config/db.js";
import crypto from "crypto";

const getAuthenticatedUserId = (req) => {
  const userId = req.user?.userId ?? req.user?.id;

  if (typeof userId === "number") {
    return userId;
  }

  if (typeof userId === "string" && userId.trim()) {
    const parsedUserId = Number.parseInt(userId, 10);
    return Number.isNaN(parsedUserId) ? null : parsedUserId;
  }

  return null;
};

/**
 * Generate license for a user
 */
export const generateLicense = async (req, res) => {
  try {
    const { userId, deviceId, daysValid, courseId } = req.body;
    const adminId = getAuthenticatedUserId(req);

    if (!adminId) {
      return res.status(401).json({
        message: "Authentication required",
        error: "AUTH_REQUIRED",
      });
    }

    if (!userId || !daysValid) {
      return res.status(400).json({
        message: "Missing required fields: userId, daysValid",
        error: "MISSING_FIELDS",
      });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        error: "USER_NOT_FOUND",
      });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysValid);

    // Generate license key
    const licenseKey = `LICENSE_${crypto.randomBytes(32).toString("hex")}`;

    // Store license in database
    const license = await prisma.userLicense.create({
      data: {
        licenseKey,
        userId: parseInt(userId),
        courseId: courseId ? parseInt(courseId) : null,
        deviceId: deviceId || null,
        expiresAt,
        createdBy: adminId,
        generatedBy: "ADMIN",
      },
    });

    res.status(201).json({
      success: true,
      message: "License generated successfully",
      data: {
        id: license.id,
        licenseKey: license.licenseKey,
        userId: license.userId,
        deviceId: license.deviceId,
        expiresAt: license.expiresAt,
        validDays: daysValid,
        createdAt: license.createdAt,
      },
    });
  } catch (error) {
    console.error("License generation error:", error);
    res.status(500).json({
      message: "Failed to generate license",
      error: "GENERATION_FAILED",
      details: error.message,
    });
  }
};

/**
 * Validate license
 */
export const validateLicense = async (req, res) => {
  try {
    const { licenseKey, deviceId } = req.body;
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        error: "AUTH_REQUIRED",
      });
    }

    if (!licenseKey) {
      return res.status(400).json({
        message: "License key is required",
        error: "MISSING_LICENSE_KEY",
      });
    }

    // Find license
    const license = await prisma.userLicense.findFirst({
      where: {
        licenseKey,
        userId,
        revokedAt: null,
      },
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "License not found",
        error: "LICENSE_NOT_FOUND",
      });
    }

    // Check if expired
    if (new Date() > license.expiresAt) {
      return res.status(401).json({
        success: false,
        message: "License has expired",
        error: "LICENSE_EXPIRED",
        expiredAt: license.expiresAt,
      });
    }

    // Check device binding
    if (license.deviceId && license.deviceId !== deviceId) {
      return res.status(403).json({
        success: false,
        message: "License is bound to a different device",
        error: "DEVICE_MISMATCH",
        boundDevice: license.deviceId.substring(0, 8) + "***",
      });
    }

    // Update last validated time
    await prisma.userLicense.update({
      where: { id: license.id },
      data: { lastValidatedAt: new Date() },
    });

    const remainingDays = Math.ceil(
      (license.expiresAt - new Date()) / (1000 * 60 * 60 * 24)
    );

    res.json({
      success: true,
      message: "License is valid",
      data: {
        id: license.id,
        licenseKey: license.licenseKey,
        userId: license.userId,
        valid: true,
        expiresAt: license.expiresAt,
        remainingDays,
        courseId: license.courseId,
      },
    });
  } catch (error) {
    console.error("License validation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate license",
      error: "VALIDATION_FAILED",
      details: error.message,
    });
  }
};

/**
 * Validate whether the authenticated user still has access to a course
 */
export const validateCourseAccess = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const rawCourseId = req.query.courseId ?? req.body?.courseId;
    const courseId =
      typeof rawCourseId === "number"
        ? rawCourseId
        : Number.parseInt(String(rawCourseId || ""), 10);

    if (!userId) {
      return res.status(401).json({
        success: false,
        licensesValid: false,
        message: "Authentication required",
        error: "AUTH_REQUIRED",
      });
    }

    if (Number.isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        licensesValid: false,
        message: "courseId is required",
        error: "MISSING_COURSE_ID",
      });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: {
        course: {
          select: {
            title: true,
            status: true,
          },
        },
      },
    });

    if (!enrollment) {
      return res.json({
        success: true,
        licensesValid: false,
        message: "You are not enrolled in this course",
        error: "NOT_ENROLLED",
      });
    }

    if (enrollment.course.status === "Draft") {
      return res.json({
        success: true,
        licensesValid: false,
        message: "This course is not currently available",
        error: "COURSE_UNAVAILABLE",
      });
    }

    const applicableLicenses = await prisma.userLicense.findMany({
      where: {
        userId,
        OR: [{ courseId }, { courseId: null }],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const now = new Date();
    const validLicense = applicableLicenses.find(
      (license) => !license.revokedAt && license.expiresAt > now
    );

    if (validLicense) {
      await prisma.userLicense.update({
        where: { id: validLicense.id },
        data: { lastValidatedAt: now },
      });

      return res.json({
        success: true,
        licensesValid: true,
        message: "Course access is valid",
        data: {
          courseId,
          licenseId: validLicense.id,
          source: validLicense.courseId === courseId ? "COURSE_LICENSE" : "GLOBAL_LICENSE",
          expiresAt: validLicense.expiresAt,
        },
      });
    }

    if (applicableLicenses.length > 0) {
      const latestLicense = applicableLicenses[0];
      const message = latestLicense.revokedAt
        ? "Your access to this course has been revoked"
        : "Your license for this course has expired";

      return res.json({
        success: true,
        licensesValid: false,
        message,
        error: latestLicense.revokedAt ? "LICENSE_REVOKED" : "LICENSE_EXPIRED",
        data: {
          courseId,
          revokedAt: latestLicense.revokedAt,
          revokedReason: latestLicense.revokedReason,
          expiresAt: latestLicense.expiresAt,
        },
      });
    }

    return res.json({
      success: true,
      licensesValid: true,
      message: "Course access is valid",
      data: {
        courseId,
        source: "ENROLLMENT",
      },
    });
  } catch (error) {
    console.error("Course access validation error:", error);
    return res.status(500).json({
      success: false,
      licensesValid: false,
      message: "Failed to validate course access",
      error: "COURSE_VALIDATION_FAILED",
      details: error.message,
    });
  }
};

/**
 * Revoke license
 */
export const revokeLicense = async (req, res) => {
  try {
    const { licenseId } = req.params;
    const { reason } = req.body;
    const adminId = getAuthenticatedUserId(req);

    if (!adminId) {
      return res.status(401).json({
        message: "Authentication required",
        error: "AUTH_REQUIRED",
      });
    }

    const license = await prisma.userLicense.findUnique({
      where: { id: parseInt(licenseId) },
    });

    if (!license) {
      return res.status(404).json({
        message: "License not found",
        error: "LICENSE_NOT_FOUND",
      });
    }

    // Revoke license
    const revokedLicense = await prisma.userLicense.update({
      where: { id: parseInt(licenseId) },
      data: {
        revokedAt: new Date(),
        revokedBy: adminId,
        revokedReason: reason || "No reason provided",
      },
    });

    res.json({
      success: true,
      message: "License revoked successfully",
      data: {
        id: revokedLicense.id,
        licenseKey: revokedLicense.licenseKey,
        revokedAt: revokedLicense.revokedAt,
      },
    });
  } catch (error) {
    console.error("License revocation error:", error);
    res.status(500).json({
      message: "Failed to revoke license",
      error: "REVOCATION_FAILED",
      details: error.message,
    });
  }
};

/**
 * Extend license validity
 */
export const extendLicense = async (req, res) => {
  try {
    const { licenseId } = req.params;
    const { additionalDays } = req.body;
    const adminId = getAuthenticatedUserId(req);

    if (!adminId) {
      return res.status(401).json({
        message: "Authentication required",
        error: "AUTH_REQUIRED",
      });
    }

    if (!additionalDays || additionalDays < 1) {
      return res.status(400).json({
        message: "additionalDays must be at least 1",
        error: "INVALID_DAYS",
      });
    }

    const license = await prisma.userLicense.findUnique({
      where: { id: parseInt(licenseId) },
    });

    if (!license) {
      return res.status(404).json({
        message: "License not found",
        error: "LICENSE_NOT_FOUND",
      });
    }

    if (license.revokedAt) {
      return res.status(400).json({
        message: "Cannot extend a revoked license",
        error: "LICENSE_REVOKED",
      });
    }

    // Calculate new expiration
    const newExpiresAt = new Date(license.expiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + additionalDays);

    const extendedLicense = await prisma.userLicense.update({
      where: { id: parseInt(licenseId) },
      data: {
        expiresAt: newExpiresAt,
        extendedAt: new Date(),
        extendedBy: adminId,
      },
    });

    res.json({
      success: true,
      message: "License extended successfully",
      data: {
        id: extendedLicense.id,
        licenseKey: extendedLicense.licenseKey,
        oldExpiresAt: license.expiresAt,
        newExpiresAt: extendedLicense.expiresAt,
        additionalDays,
      },
    });
  } catch (error) {
    console.error("License extension error:", error);
    res.status(500).json({
      message: "Failed to extend license",
      error: "EXTENSION_FAILED",
      details: error.message,
    });
  }
};

/**
 * Get user's licenses
 */
export const getUserLicenses = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
        error: "AUTH_REQUIRED",
      });
    }

    const licenses = await prisma.userLicense.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const licensesWithStatus = licenses.map((license) => {
      const now = new Date();
      let status = "VALID";
      if (license.revokedAt) {
        status = "REVOKED";
      } else if (now > license.expiresAt) {
        status = "EXPIRED";
      }

      return {
        id: license.id,
        licenseKey: license.licenseKey.substring(0, 20) + "***",
        status,
        deviceBound: !!license.deviceId,
        createdAt: license.createdAt,
        expiresAt: license.expiresAt,
        remainingDays: Math.ceil(
          (license.expiresAt - now) / (1000 * 60 * 60 * 24)
        ),
      };
    });

    res.json({
      success: true,
      data: licensesWithStatus,
    });
  } catch (error) {
    console.error("Get user licenses error:", error);
    res.status(500).json({
      message: "Failed to fetch licenses",
      error: "FETCH_FAILED",
      details: error.message,
    });
  }
};

/**
 * Get license status
 */
export const getLicenseStatus = async (req, res) => {
  try {
    const { licenseId } = req.params;

    const license = await prisma.userLicense.findUnique({
      where: { id: parseInt(licenseId) },
    });

    if (!license) {
      return res.status(404).json({
        message: "License not found",
        error: "LICENSE_NOT_FOUND",
      });
    }

    const now = new Date();
    let status = "VALID";
    if (license.revokedAt) {
      status = "REVOKED";
    } else if (now > license.expiresAt) {
      status = "EXPIRED";
    }

    const remainingDays = Math.ceil(
      (license.expiresAt - now) / (1000 * 60 * 60 * 24)
    );

    res.json({
      success: true,
      data: {
        id: license.id,
        licenseKey: license.licenseKey,
        userId: license.userId,
        status,
        deviceBound: !!license.deviceId,
        createdAt: license.createdAt,
        expiresAt: license.expiresAt,
        remainingDays: remainingDays < 0 ? 0 : remainingDays,
        createdBy: license.createdBy,
        revokedAt: license.revokedAt,
        revokedReason: license.revokedReason,
        lastValidatedAt: license.lastValidatedAt,
      },
    });
  } catch (error) {
    console.error("Get license status error:", error);
    res.status(500).json({
      message: "Failed to get license status",
      error: "STATUS_FAILED",
      details: error.message,
    });
  }
};
