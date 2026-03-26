/**
 * Rate Limiting Middleware for Media Access
 * Prevents abuse and protects bandwidth
 */

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map();

// Rate limiting configuration
const RATE_LIMITS = {
    // Requests per time window
    media_access: {
        windowMs: 60 * 1000,    // 1 minute
        maxRequests: 30,         // 30 requests per minute per user
        message: "Too many media requests. Please wait before requesting more content."
    },

    // Download bandwidth limiting
    bandwidth_limit: {
        windowMs: 60 * 1000,    // 1 minute
        maxBytes: 100 * 1024 * 1024, // 100MB per minute per user
        message: "Bandwidth limit exceeded. Please wait before downloading more content."
    },

    // Admin users have higher limits
    admin_media_access: {
        windowMs: 60 * 1000,
        maxRequests: 100,        // 100 requests per minute for admins
        message: "Admin rate limit exceeded."
    },

    // Video upload rate limiting (prevent abuse)
    video_upload: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 10,          // 10 uploads per hour per user
        message: "Too many video uploads. Please wait before uploading more videos."
    },

    // Admin video upload limits (higher)
    admin_video_upload: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 50,          // 50 uploads per hour for admins
        message: "Admin upload rate limit exceeded."
    }
};

/**
 * Create rate limiting middleware for media access
 */
const createMediaRateLimitMiddleware = (limitType = 'media_access') => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.userId;
            const userAgent = req.headers['user-agent'] || 'unknown';
            const clientIp = req.ip || req.connection.remoteAddress;

            // Create unique key for this user/IP combination
            const key = `${limitType}:${userId || clientIp}:${userAgent}`;

            // Get rate limit config (admins get higher limits)
            const user = await getUserById(userId);

            // Determine which config to use based on type and admin status
            let config;
            if (user?.isAdmin) {
                if (limitType === 'video_upload') {
                    config = RATE_LIMITS.admin_video_upload;
                } else {
                    config = RATE_LIMITS.admin_media_access;
                }
            } else {
                config = RATE_LIMITS[limitType];
            }

            if (!config) {
                return next(); // No rate limiting for unknown limit types
            }

            // Get current usage from store
            const now = Date.now();
            const windowStart = now - config.windowMs;

            let userRequests = rateLimitStore.get(key) || [];

            // Clean old requests outside the window
            userRequests = userRequests.filter(timestamp => timestamp > windowStart);

            // Check if limit exceeded
            if (userRequests.length >= config.maxRequests) {
                const resetTime = Math.ceil((userRequests[0] + config.windowMs - now) / 1000);

                res.set({
                    'X-RateLimit-Limit': config.maxRequests,
                    'X-RateLimit-Remaining': 0,
                    'X-RateLimit-Reset': new Date(Date.now() + resetTime * 1000).toISOString(),
                    'Retry-After': resetTime
                });

                return res.status(429).json({
                    message: config.message,
                    retryAfter: resetTime,
                    limit: config.maxRequests,
                    windowMs: config.windowMs
                });
            }

            // Add current request
            userRequests.push(now);
            rateLimitStore.set(key, userRequests);

            // Set rate limit headers
            res.set({
                'X-RateLimit-Limit': config.maxRequests,
                'X-RateLimit-Remaining': config.maxRequests - userRequests.length,
                'X-RateLimit-Reset': new Date(now + config.windowMs).toISOString()
            });

            // Store rate limit info for bandwidth tracking
            req.rateLimitInfo = {
                key,
                config,
                remaining: config.maxRequests - userRequests.length
            };

            next();

        } catch (error) {
            console.error('Rate limiting error:', error);
            // Don't block request if rate limiting fails
            next();
        }
    };
};

/**
 * Bandwidth rate limiting middleware
 * Tracks actual data transfer
 */
const bandwidthRateLimitMiddleware = async (req, res, next) => {
    const originalSend = res.send;
    const userId = req.user?.userId;
    const clientIp = req.ip || req.connection.remoteAddress;
    const key = `bandwidth:${userId || clientIp}`;

    // Override res.send to track bandwidth
    res.send = function (data) {
        try {
            const bytes = Buffer.byteLength(data);
            trackBandwidthUsage(key, bytes);
        } catch (error) {
            console.error('Bandwidth tracking error:', error);
        }

        return originalSend.call(this, data);
    };

    // Check current bandwidth usage
    const config = RATE_LIMITS.bandwidth_limit;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let bandwidthUsage = rateLimitStore.get(key) || [];

    // Clean old usage outside the window
    bandwidthUsage = bandwidthUsage.filter(usage => usage.timestamp > windowStart);

    // Calculate current bandwidth usage
    const totalBytes = bandwidthUsage.reduce((sum, usage) => sum + usage.bytes, 0);

    if (totalBytes >= config.maxBytes) {
        const resetTime = Math.ceil((bandwidthUsage[0].timestamp + config.windowMs - now) / 1000);

        return res.status(429).json({
            message: config.message,
            retryAfter: resetTime,
            bandwidthLimit: formatBytes(config.maxBytes),
            currentUsage: formatBytes(totalBytes)
        });
    }

    // Store updated bandwidth usage
    rateLimitStore.set(key, bandwidthUsage);

    next();
};

/**
 * Track bandwidth usage for a user/IP
 */
function trackBandwidthUsage(key, bytes) {
    const now = Date.now();
    let bandwidthUsage = rateLimitStore.get(key) || [];

    bandwidthUsage.push({
        timestamp: now,
        bytes: bytes
    });

    // Keep only recent usage (last hour)
    const oneHourAgo = now - (60 * 60 * 1000);
    bandwidthUsage = bandwidthUsage.filter(usage => usage.timestamp > oneHourAgo);

    rateLimitStore.set(key, bandwidthUsage);
}

/**
 * Get user by ID (helper function)
 */
async function getUserById(userId) {
    if (!userId) return null;

    try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        return await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, isAdmin: true }
        });
    } catch (error) {
        console.error('Error fetching user for rate limiting:', error);
        return null;
    }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Clean up expired rate limit data (call periodically)
 */
function cleanupRateLimitStore() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, value] of rateLimitStore.entries()) {
        if (Array.isArray(value)) {
            // Handle request counts (array of timestamps)
            const validEntries = value.filter(timestamp => (now - timestamp) < maxAge);
            if (validEntries.length === 0) {
                rateLimitStore.delete(key);
            } else {
                rateLimitStore.set(key, validEntries);
            }
        } else if (value.timestamp && (now - value.timestamp) > maxAge) {
            // Handle other timestamped data
            rateLimitStore.delete(key);
        }
    }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

export {
    createMediaRateLimitMiddleware,
    bandwidthRateLimitMiddleware,
    RATE_LIMITS
};