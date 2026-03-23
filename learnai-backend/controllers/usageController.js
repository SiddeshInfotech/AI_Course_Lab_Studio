import { getRemainingTime, recordHeartbeat } from "../models/usageModel.js";

// Helper: format seconds to "Xh Ym" format
const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
};

// GET /api/usage/status — get current usage status
export const getUsageStatus = async (req, res) => {
    try {
        const usage = await getRemainingTime(req.user.userId);

        res.json({
            remainingSeconds: usage.remainingSeconds,
            usedSeconds: usage.usedSeconds,
            limitSeconds: usage.limitSeconds,
            isLocked: usage.isLocked,
            remainingFormatted: formatTime(usage.remainingSeconds),
            usedFormatted: formatTime(usage.usedSeconds),
        });
    } catch (error) {
        console.error("Get usage status error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/usage/heartbeat — record activity heartbeat
export const sendHeartbeat = async (req, res) => {
    try {
        const result = await recordHeartbeat(req.user.userId);

        res.json({
            success: result.success,
            remainingSeconds: result.remainingSeconds,
            usedSeconds: result.usedSeconds,
            limitSeconds: result.limitSeconds,
            isLocked: result.isLocked,
            remainingFormatted: formatTime(result.remainingSeconds),
        });
    } catch (error) {
        console.error("Heartbeat error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
