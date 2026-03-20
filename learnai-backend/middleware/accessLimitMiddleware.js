import { getRemainingTime } from "../models/usageModel.js";

const accessLimitMiddleware = async (req, res, next) => {
    try {
        // req.user should be set by authMiddleware first
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const usage = await getRemainingTime(req.user.userId);

        // Attach usage info to request for controllers to use
        req.usageInfo = usage;

        if (usage.isLocked) {
            return res.status(403).json({
                message: "Daily access limit reached",
                error: "ACCESS_LIMIT_EXCEEDED",
                usedSeconds: usage.usedSeconds,
                limitSeconds: usage.limitSeconds,
                remainingSeconds: 0,
            });
        }

        next();
    } catch (error) {
        console.error("Access limit middleware error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export default accessLimitMiddleware;
