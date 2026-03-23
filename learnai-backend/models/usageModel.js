import prisma from "../config/db.js";

const DAILY_LIMIT_SECONDS = 2 * 60 * 60; // 2 hours = 7200 seconds
const HEARTBEAT_INTERVAL = 30; // seconds
const MAX_HEARTBEAT_GAP = 60; // seconds - max allowed gap between heartbeats

// Get today's date in UTC (date only, no time component)
export const getTodayUTC = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

// Get or create today's usage record for a user
export const getOrCreateDailyUsage = async (userId) => {
    const today = getTodayUTC();

    return prisma.dailyUsage.upsert({
        where: {
            userId_date: { userId, date: today },
        },
        update: {},
        create: {
            userId,
            date: today,
            totalSeconds: 0,
        },
    });
};

// Get remaining time and lock status for a user
export const getRemainingTime = async (userId) => {
    const usage = await getOrCreateDailyUsage(userId);
    const remaining = Math.max(0, DAILY_LIMIT_SECONDS - usage.totalSeconds);

    return {
        remainingSeconds: remaining,
        usedSeconds: usage.totalSeconds,
        limitSeconds: DAILY_LIMIT_SECONDS,
        isLocked: remaining <= 0,
    };
};

// Record a heartbeat and accumulate time
export const recordHeartbeat = async (userId) => {
    const now = new Date();

    // Get current usage
    const usage = await getOrCreateDailyUsage(userId);

    // Check if already at limit
    if (usage.totalSeconds >= DAILY_LIMIT_SECONDS) {
        return {
            success: false,
            message: "Daily limit reached",
            ...(await getRemainingTime(userId)),
        };
    }

    // Calculate time to add
    let timeToAdd = HEARTBEAT_INTERVAL;

    if (usage.lastHeartbeat) {
        const secondsSinceLastHeartbeat = (now.getTime() - usage.lastHeartbeat.getTime()) / 1000;

        if (secondsSinceLastHeartbeat <= MAX_HEARTBEAT_GAP) {
            // Normal heartbeat - add actual elapsed time (capped at interval)
            timeToAdd = Math.min(Math.round(secondsSinceLastHeartbeat), HEARTBEAT_INTERVAL);
        }
        // If gap too large, user was idle - still add one interval for new session start
    }

    // Update usage (cap at daily limit)
    const newTotalSeconds = Math.min(usage.totalSeconds + timeToAdd, DAILY_LIMIT_SECONDS);

    await prisma.dailyUsage.update({
        where: { id: usage.id },
        data: {
            totalSeconds: newTotalSeconds,
            lastHeartbeat: now,
        },
    });

    const remaining = Math.max(0, DAILY_LIMIT_SECONDS - newTotalSeconds);

    return {
        success: true,
        addedSeconds: newTotalSeconds - usage.totalSeconds,
        remainingSeconds: remaining,
        usedSeconds: newTotalSeconds,
        limitSeconds: DAILY_LIMIT_SECONDS,
        isLocked: remaining <= 0,
    };
};

export { DAILY_LIMIT_SECONDS, HEARTBEAT_INTERVAL };
