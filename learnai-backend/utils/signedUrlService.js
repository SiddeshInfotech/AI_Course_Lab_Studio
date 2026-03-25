import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Signed URL Service for Content Security
 * Provides temporary, secure access to media with expiration
 */

const SECRET_KEY = process.env.SIGNED_URL_SECRET || process.env.JWT_SECRET || 'signed-url-secret-key-change-in-production';
const DEFAULT_EXPIRY_HOURS = 24; // URLs expire after 24 hours by default

/**
 * Generate a signed URL for media access
 * @param {number} mediaId - ID of the media file
 * @param {number} userId - ID of the requesting user
 * @param {Object} options - Options for URL generation
 * @returns {Object} - Signed URL and metadata
 */
export function generateSignedMediaUrl(mediaId, userId, options = {}) {
    const {
        expiresIn = DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000, // milliseconds
        allowedIp = null,
        userAgent = null,
        maxDownloads = null,
        accessType = 'view' // 'view', 'download', 'stream'
    } = options;

    const expiration = Date.now() + expiresIn;
    const nonce = crypto.randomBytes(16).toString('hex');

    // Create payload for the signed URL
    const payload = {
        mediaId,
        userId,
        exp: Math.floor(expiration / 1000), // JWT expects seconds
        iat: Math.floor(Date.now() / 1000),
        nonce,
        ...(allowedIp && { ip: allowedIp }),
        ...(userAgent && { ua: crypto.createHash('md5').update(userAgent).digest('hex') }),
        ...(maxDownloads && { maxDl: maxDownloads }),
        accessType
    };

    // Generate JWT token
    const token = jwt.sign(payload, SECRET_KEY, {
        algorithm: 'HS256'
    });

    // Create the signed URL
    const signedUrl = `/api/media/signed/${token}`;

    return {
        url: signedUrl,
        token,
        expiresAt: new Date(expiration).toISOString(),
        expiresIn: expiresIn / 1000, // seconds
        accessType,
        restrictions: {
            ...(allowedIp && { clientIp: allowedIp }),
            ...(userAgent && { userAgent: 'verified' }),
            ...(maxDownloads && { maxDownloads })
        }
    };
}

/**
 * Verify and decode a signed media URL
 * @param {string} token - JWT token from the signed URL
 * @param {Object} requestInfo - Information about the current request
 * @returns {Object} - Verification result
 */
export function verifySignedMediaUrl(token, requestInfo = {}) {
    try {
        const { clientIp, userAgent } = requestInfo;

        // Verify and decode the JWT
        const payload = jwt.verify(token, SECRET_KEY, {
            algorithms: ['HS256']
        });

        // Check expiration (JWT handles this automatically, but double-check)
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
            return {
                valid: false,
                error: 'URL_EXPIRED',
                message: 'Signed URL has expired'
            };
        }

        // Verify IP restriction if set
        if (payload.ip && clientIp && payload.ip !== clientIp) {
            return {
                valid: false,
                error: 'IP_MISMATCH',
                message: 'Access denied from this IP address'
            };
        }

        // Verify User Agent if set
        if (payload.ua && userAgent) {
            const currentUaHash = crypto.createHash('md5').update(userAgent).digest('hex');
            if (payload.ua !== currentUaHash) {
                return {
                    valid: false,
                    error: 'USER_AGENT_MISMATCH',
                    message: 'Access denied from this browser/client'
                };
            }
        }

        // Check download limits (would need to be tracked in database/cache)
        if (payload.maxDl) {
            const downloadCount = getDownloadCount(token);
            if (downloadCount >= payload.maxDl) {
                return {
                    valid: false,
                    error: 'DOWNLOAD_LIMIT_EXCEEDED',
                    message: 'Maximum download limit reached for this URL'
                };
            }
        }

        return {
            valid: true,
            payload: {
                mediaId: payload.mediaId,
                userId: payload.userId,
                accessType: payload.accessType || 'view',
                expiresAt: payload.exp,
                nonce: payload.nonce
            }
        };

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return {
                valid: false,
                error: 'URL_EXPIRED',
                message: 'Signed URL has expired'
            };
        }

        if (error.name === 'JsonWebTokenError') {
            return {
                valid: false,
                error: 'INVALID_URL',
                message: 'Invalid signed URL'
            };
        }

        console.error('Signed URL verification error:', error);
        return {
            valid: false,
            error: 'VERIFICATION_ERROR',
            message: 'Unable to verify signed URL'
        };
    }
}

/**
 * Create a watermarked URL with user identification
 * @param {number} mediaId - Media file ID
 * @param {number} userId - User ID
 * @param {Object} userInfo - User information for watermarking
 * @returns {Object} - Watermarked URL info
 */
export function generateWatermarkedUrl(mediaId, userId, userInfo = {}) {
    const watermarkData = {
        userId,
        username: userInfo.username || 'User',
        timestamp: new Date().toISOString(),
        mediaId
    };

    // Create watermark hash for verification
    const watermarkHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(watermarkData) + SECRET_KEY)
        .digest('hex')
        .substring(0, 16); // Use first 16 characters

    const signedUrl = generateSignedMediaUrl(mediaId, userId, {
        expiresIn: 2 * 60 * 60 * 1000, // 2 hours for watermarked content
        accessType: 'watermarked'
    });

    return {
        ...signedUrl,
        watermark: {
            text: `${userInfo.username || 'User'} - ${new Date().toLocaleDateString()}`,
            hash: watermarkHash,
            position: 'bottom-right' // where to place the watermark
        },
        accessType: 'watermarked'
    };
}

/**
 * Bulk generate signed URLs for multiple media files
 * @param {Array} mediaIds - Array of media IDs
 * @param {number} userId - User ID
 * @param {Object} options - Options for URL generation
 * @returns {Array} - Array of signed URLs
 */
export function generateBulkSignedUrls(mediaIds, userId, options = {}) {
    return mediaIds.map(mediaId => ({
        mediaId,
        ...generateSignedMediaUrl(mediaId, userId, options)
    }));
}

/**
 * Revoke a signed URL by blacklisting its nonce
 * @param {string} token - JWT token to revoke
 * @returns {boolean} - Success status
 */
export async function revokeSignedUrl(token) {
    try {
        const payload = jwt.verify(token, SECRET_KEY, {
            algorithms: ['HS256'],
            ignoreExpiration: true // Allow revoking expired tokens
        });

        if (payload.nonce) {
            // In production, store revoked nonces in Redis/database
            // For now, we'll use a simple in-memory store
            if (!global.revokedNonces) {
                global.revokedNonces = new Set();
            }
            global.revokedNonces.add(payload.nonce);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error revoking signed URL:', error);
        return false;
    }
}

/**
 * Check if a signed URL has been revoked
 * @param {string} nonce - Nonce from the JWT payload
 * @returns {boolean} - Whether the URL is revoked
 */
export function isUrlRevoked(nonce) {
    if (!global.revokedNonces) {
        return false;
    }
    return global.revokedNonces.has(nonce);
}

/**
 * Get download count for a specific token (mock implementation)
 * In production, this would query a database or cache
 * @param {string} token - JWT token
 * @returns {number} - Download count
 */
function getDownloadCount(token) {
    // Mock implementation - in production, track in Redis/database
    if (!global.downloadCounts) {
        global.downloadCounts = new Map();
    }
    return global.downloadCounts.get(token) || 0;
}

/**
 * Increment download count for a token
 * @param {string} token - JWT token
 */
export function incrementDownloadCount(token) {
    if (!global.downloadCounts) {
        global.downloadCounts = new Map();
    }
    const current = global.downloadCounts.get(token) || 0;
    global.downloadCounts.set(token, current + 1);
}

/**
 * Clean up expired nonces and download counts
 * Call this periodically to prevent memory leaks
 */
export function cleanupExpiredTokens() {
    // In production, this would clean up database/cache entries
    // For now, we'll implement basic cleanup

    if (global.downloadCounts) {
        // Clean up download counts for expired tokens
        // This is simplified - in production, you'd track token expiration
        const now = Date.now();
        for (const [token, count] of global.downloadCounts.entries()) {
            try {
                const payload = jwt.verify(token, SECRET_KEY, { ignoreExpiration: true });
                if (payload.exp * 1000 < now) {
                    global.downloadCounts.delete(token);
                }
            } catch (error) {
                // Invalid token, remove it
                global.downloadCounts.delete(token);
            }
        }
    }

    // Clean up revoked nonces older than 7 days
    // In production, you'd store expiration times
    if (global.revokedNonces && global.revokedNonces.size > 10000) {
        // Simple cleanup when too many nonces accumulate
        global.revokedNonces.clear();
    }
}

// Clean up every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);