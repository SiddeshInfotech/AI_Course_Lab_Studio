import prisma from "../config/db.js";
import bcrypt from "bcrypt";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";

/**
 * POST /api/center/login
 * Login for center administrators
 */
export const centerLogin = async (req, res) => {
    try {
        const { centerAdminId, password } = req.body;

        if (!centerAdminId || !password) {
            return res.status(400).json({
                message: "Center Admin ID and password are required"
            });
        }

        // Find center by admin ID
        const center = await prisma.center.findUnique({
            where: { centerAdminId },
        });

        if (!center) {
            return res.status(401).json({
                message: "Invalid Center Admin ID or password"
            });
        }

        // Check if center is active
        if (center.status !== "Active") {
            return res.status(403).json({
                message: "Center account is not active. Please contact administrator."
            });
        }

        // Verify password - support both bcrypt hashed and plain text passwords
        let isValidPassword = false;
        
        // Check if password is bcrypt hashed (starts with $2)
        if (center.centerAdminPassword.startsWith('$2')) {
            isValidPassword = await bcrypt.compare(password, center.centerAdminPassword);
        } else {
            // Plain text password comparison
            isValidPassword = center.centerAdminPassword === password;
        }

        if (!isValidPassword) {
            return res.status(401).json({
                message: "Invalid Center Admin ID or password"
            });
        }

        // Generate tokens
        const accessToken = signAccessToken({
            id: center.id,
            type: "center",
            centerAdminId: center.centerAdminId,
        });

        const refreshToken = signRefreshToken({
            id: center.id,
            type: "center",
            centerAdminId: center.centerAdminId,
        });

        // For centers, we don't use the Session table since centers aren't users
        // Just return the tokens - the frontend will handle storage

        // Return center info (without sensitive data)
        res.status(200).json({
            message: "Center login successful",
            accessToken,
            refreshToken,
            center: {
                id: center.id,
                centerName: center.centerName,
                schoolName: center.schoolName,
                centerCode: center.centerCode,
                contactPerson: center.contactPerson,
                phoneNumber: center.phoneNumber,
                email: center.email,
                status: center.status,
            },
        });
    } catch (error) {
        console.error("Center login error:", error);
        res.status(500).json({
            message: "Login failed. Please try again.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

/**
 * POST /api/center/refresh
 * Refresh center access token
 */
export const centerRefresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                message: "Refresh token is required"
            });
        }

        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);

        if (decoded.type !== "center") {
            return res.status(401).json({
                message: "Invalid token type"
            });
        }

        // Find center
        const center = await prisma.center.findUnique({
            where: { id: decoded.id },
        });

        if (!center || center.status !== "Active") {
            return res.status(401).json({
                message: "Center not found or inactive"
            });
        }

        // Generate new tokens
        const newAccessToken = signAccessToken({
            id: center.id,
            type: "center",
            centerAdminId: center.centerAdminId,
        });

        const newRefreshToken = signRefreshToken({
            id: center.id,
            type: "center",
            centerAdminId: center.centerAdminId,
        });

        res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        console.error("Center refresh error:", error);
        res.status(401).json({
            message: "Invalid or expired refresh token"
        });
    }
};

/**
 * POST /api/center/logout
 * Logout center administrator
 */
export const centerLogout = async (req, res) => {
    try {
        // For centers, we just return success - tokens are managed by frontend
        // In production, you could maintain a blacklist of revoked tokens
        
        res.status(200).json({
            message: "Center logout successful"
        });
    } catch (error) {
        console.error("Center logout error:", error);
        res.status(500).json({
            message: "Logout failed"
        });
    }
};

/**
 * GET /api/center/me
 * Get current center info
 */
export const getCenterProfile = async (req, res) => {
    try {
        const centerId = req.centerId;

        const center = await prisma.center.findUnique({
            where: { id: centerId },
            select: {
                id: true,
                centerName: true,
                schoolName: true,
                centerCode: true,
                contactPerson: true,
                phoneNumber: true,
                email: true,
                address: true,
                boardOrCurriculum: true,
                status: true,
                createdAt: true,
                users: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!center) {
            return res.status(404).json({
                message: "Center not found"
            });
        }

        res.status(200).json({
            center: {
                ...center,
                totalStudents: center.users.length,
            },
        });
    } catch (error) {
        console.error("Get center profile error:", error);
        res.status(500).json({
            message: "Failed to get center profile"
        });
    }
};
