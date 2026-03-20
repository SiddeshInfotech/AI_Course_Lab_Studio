import prisma from "../config/db.js";

const adminMiddleware = async (req, res, next) => {
    try {
        // req.user should be set by authMiddleware first
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { isAdmin: true },
        });

        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: "Admin access required" });
        }

        next();
    } catch (error) {
        console.error("Admin middleware error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export default adminMiddleware;
