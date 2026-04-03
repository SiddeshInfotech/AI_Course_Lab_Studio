import express from "express";
import prisma from "../config/db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

const ENCRYPTION_KEY = process.env.PASSWORD_ENCRYPTION_KEY || "default-key-32-chars-minimum!!";
const ALGORITHM = "aes-256-gcm";

function encryptPassword(password) {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decryptPassword(encrypted) {
    try {
        const parts = encrypted.split(':');
        if (parts.length !== 3) return null;
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error("Decryption error:", err);
        return null;
    }
}

// All center routes require authentication + admin check
router.use(authMiddleware, adminMiddleware);

router.get("/", async (req, res) => {
    try {
        console.log("GET /centers called by user:", req.user?.userId);
        
        const centers = await prisma.center.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: {
                        users: true,
                    },
                },
            },
        });
        
        console.log("Found centers in DB:", centers.length);
        
        // Format response to include totalStudents and decrypt passwords for admin
        const formattedCenters = centers.map(center => {
            let decryptedPassword = null;
            try {
                if (center.encryptedPassword) {
                    decryptedPassword = decryptPassword(center.encryptedPassword);
                }
            } catch (decryptErr) {
                console.error("Decrypt error:", decryptErr);
                decryptedPassword = null;
            }
            
            return {
                id: center.id,
                centerName: center.centerName,
                schoolName: center.schoolName,
                centerCode: center.centerCode,
                contactPerson: center.contactPerson,
                phoneNumber: center.phoneNumber,
                email: center.email,
                address: center.address,
                boardOrCurriculum: center.boardOrCurriculum,
                centerAdminId: center.centerAdminId,
                // Return decrypted password for admin viewing, or null if not available
                centerAdminPassword: decryptedPassword,
                status: center.status,
                createdAt: center.createdAt,
                updatedAt: center.updatedAt,
                totalStudents: center._count.users,
            };
        });
        
        console.log("Sending response with", formattedCenters.length, "centers");
        res.json(formattedCenters);
    } catch (error) {
        console.error("Get centers error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const {
            centerName,
            schoolName,
            centerCode,
            contactPerson,
            phoneNumber,
            email,
            address,
            boardOrCurriculum,
            centerAdminId,
            centerAdminPassword,
        } = req.body;

        // Check for duplicate center code
        const existingCode = await prisma.center.findUnique({
            where: { centerCode: centerCode.toUpperCase() },
        });
        if (existingCode) {
            return res.status(400).json({ message: "Center code already exists" });
        }

        // Check for duplicate admin ID
        const existingAdminId = await prisma.center.findUnique({
            where: { centerAdminId: centerAdminId.toUpperCase() },
        });
        if (existingAdminId) {
            return res.status(400).json({ message: "Center admin ID already exists" });
        }

        // Hash the center admin password for authentication
        const hashedPassword = await bcrypt.hash(centerAdminPassword, 10);
        // Store encrypted password for admin viewing
        const encryptedPassword = encryptPassword(centerAdminPassword);

        const center = await prisma.center.create({
            data: {
                centerName,
                schoolName,
                centerCode: centerCode.toUpperCase(),
                contactPerson,
                phoneNumber,
                email: email.toLowerCase(),
                address,
                boardOrCurriculum,
                centerAdminId: centerAdminId.toUpperCase(),
                centerAdminPassword: hashedPassword,
                encryptedPassword: encryptedPassword,
                status: "Active",
            },
        });

        // Return the plain password for admin to copy
        res.json({
            ...center,
            centerAdminPassword: centerAdminPassword,
        });
    } catch (error) {
        console.error("Create center error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.patch("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            centerName,
            schoolName,
            centerCode,
            contactPerson,
            phoneNumber,
            email,
            address,
            boardOrCurriculum,
            centerAdminId,
            centerAdminPassword,
            status,
        } = req.body;

        // Prepare update data
        const updateData = {
            centerName,
            schoolName,
            centerCode: centerCode?.toUpperCase(),
            contactPerson,
            phoneNumber,
            email: email?.toLowerCase(),
            address,
            boardOrCurriculum,
            centerAdminId: centerAdminId?.toUpperCase(),
            status,
        };

        // Hash password if provided and store encrypted version
        if (centerAdminPassword) {
            updateData.centerAdminPassword = await bcrypt.hash(centerAdminPassword, 10);
            updateData.encryptedPassword = encryptPassword(centerAdminPassword);
        }

        const center = await prisma.center.update({
            where: { id: parseInt(id) },
            data: updateData,
        });

        // Return plain password for admin
        res.json({
            ...center,
            centerAdminPassword: centerAdminPassword || decryptPassword(center.encryptedPassword),
        });
    } catch (error) {
        console.error("Update center error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.center.delete({
            where: { id: parseInt(id) },
        });

        res.json({ message: "Center deleted successfully" });
    } catch (error) {
        console.error("Delete center error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
