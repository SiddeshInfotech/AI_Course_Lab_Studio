import express from "express";
import prisma from "../config/db.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// All center routes require authentication + admin check
router.use(authMiddleware, adminMiddleware);

router.get("/", async (req, res) => {
    try {
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
        
        // Format response to include totalStudents
        const formattedCenters = centers.map(center => ({
            ...center,
            totalStudents: center._count.users,
        }));
        
        res.json(formattedCenters);
    } catch (error) {
        console.error("Get centers error:", error);
        res.status(500).json({ message: "Internal server error" });
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
                centerAdminPassword,
                status: "Active",
            },
        });

        res.json(center);
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

        const center = await prisma.center.update({
            where: { id: parseInt(id) },
            data: {
                centerName,
                schoolName,
                centerCode: centerCode?.toUpperCase(),
                contactPerson,
                phoneNumber,
                email: email?.toLowerCase(),
                address,
                boardOrCurriculum,
                centerAdminId: centerAdminId?.toUpperCase(),
                centerAdminPassword,
                status,
            },
        });

        res.json(center);
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
