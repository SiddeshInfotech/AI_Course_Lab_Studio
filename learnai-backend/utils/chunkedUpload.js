import { join } from 'path';
import { tmpdir } from 'os';
import { createWriteStream, createReadStream, unlinkSync, existsSync, mkdirSync, readdir, stat } from 'fs';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

const readdirAsync = promisify(readdir);
const statAsync = promisify(stat);

// Chunked upload configuration
const CHUNK_UPLOAD_CONFIG = {
    maxChunkSize: 10 * 1024 * 1024, // 10MB per chunk
    tempDir: join(tmpdir(), 'video-uploads'),
    cleanupInterval: 60 * 60 * 1000, // 1 hour cleanup interval
    maxAge: 24 * 60 * 60 * 1000, // 24 hours max age for incomplete uploads
};

// Ensure temp directory exists
if (!existsSync(CHUNK_UPLOAD_CONFIG.tempDir)) {
    mkdirSync(CHUNK_UPLOAD_CONFIG.tempDir, { recursive: true });
}

// Storage for upload sessions
const uploadSessions = new Map();

/**
 * Initialize a chunked upload session
 */
export const initializeChunkedUpload = (fileInfo) => {
    const sessionId = randomUUID();
    const sessionDir = join(CHUNK_UPLOAD_CONFIG.tempDir, sessionId);

    // Create session directory
    if (!existsSync(sessionDir)) {
        mkdirSync(sessionDir, { recursive: true });
    }

    const session = {
        id: sessionId,
        filename: fileInfo.filename,
        mimeType: fileInfo.mimeType,
        totalSize: fileInfo.totalSize,
        totalChunks: Math.ceil(fileInfo.totalSize / CHUNK_UPLOAD_CONFIG.maxChunkSize),
        uploadedChunks: new Set(),
        createdAt: new Date(),
        sessionDir,
    };

    uploadSessions.set(sessionId, session);

    return {
        sessionId,
        chunkSize: CHUNK_UPLOAD_CONFIG.maxChunkSize,
        totalChunks: session.totalChunks,
    };
};

/**
 * Handle individual chunk upload
 */
export const uploadChunk = async (sessionId, chunkIndex, chunkData) => {
    const session = uploadSessions.get(sessionId);

    if (!session) {
        throw new Error('Upload session not found');
    }

    if (chunkIndex >= session.totalChunks) {
        throw new Error('Invalid chunk index');
    }

    // Save chunk to temporary file
    const chunkPath = join(session.sessionDir, `chunk_${chunkIndex}`);
    const writeStream = createWriteStream(chunkPath);

    return new Promise((resolve, reject) => {
        writeStream.write(chunkData);
        writeStream.end((error) => {
            if (error) {
                reject(error);
            } else {
                session.uploadedChunks.add(chunkIndex);
                resolve({
                    chunkIndex,
                    uploadedChunks: session.uploadedChunks.size,
                    totalChunks: session.totalChunks,
                    isComplete: session.uploadedChunks.size === session.totalChunks,
                });
            }
        });
    });
};

/**
 * Assemble all chunks into final file buffer
 */
export const assembleChunks = async (sessionId) => {
    const session = uploadSessions.get(sessionId);

    if (!session) {
        throw new Error('Upload session not found');
    }

    if (session.uploadedChunks.size !== session.totalChunks) {
        throw new Error('Not all chunks uploaded');
    }

    // Assemble chunks in order
    const chunks = [];
    let totalSize = 0;

    for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = join(session.sessionDir, `chunk_${i}`);

        if (!existsSync(chunkPath)) {
            throw new Error(`Chunk ${i} not found`);
        }

        const chunkData = await promisify(require('fs').readFile)(chunkPath);
        chunks.push(chunkData);
        totalSize += chunkData.length;
    }

    // Combine all chunks
    const finalBuffer = Buffer.concat(chunks, totalSize);

    // Create file object compatible with existing upload system
    const fileObject = {
        originalname: session.filename,
        mimetype: session.mimeType,
        size: finalBuffer.length,
        buffer: finalBuffer,
    };

    // Cleanup session
    await cleanupSession(sessionId);

    return fileObject;
};

/**
 * Get upload session status
 */
export const getUploadStatus = (sessionId) => {
    const session = uploadSessions.get(sessionId);

    if (!session) {
        return null;
    }

    return {
        sessionId: session.id,
        filename: session.filename,
        uploadedChunks: session.uploadedChunks.size,
        totalChunks: session.totalChunks,
        progress: (session.uploadedChunks.size / session.totalChunks) * 100,
        isComplete: session.uploadedChunks.size === session.totalChunks,
        createdAt: session.createdAt,
    };
};

/**
 * Cancel upload session
 */
export const cancelUploadSession = async (sessionId) => {
    await cleanupSession(sessionId);
    return { cancelled: true };
};

/**
 * Cleanup session files and memory
 */
const cleanupSession = async (sessionId) => {
    const session = uploadSessions.get(sessionId);

    if (session && existsSync(session.sessionDir)) {
        try {
            // Remove all chunk files
            const files = await readdirAsync(session.sessionDir);
            for (const file of files) {
                const filePath = join(session.sessionDir, file);
                unlinkSync(filePath);
            }

            // Remove session directory
            require('fs').rmdirSync(session.sessionDir);
        } catch (error) {
            console.error(`Error cleaning up session ${sessionId}:`, error);
        }
    }

    // Remove from memory
    uploadSessions.delete(sessionId);
};

/**
 * Cleanup old/stale upload sessions
 */
export const cleanupStaleUploads = async () => {
    const now = new Date();
    const staleSessions = [];

    for (const [sessionId, session] of uploadSessions.entries()) {
        const age = now.getTime() - session.createdAt.getTime();
        if (age > CHUNK_UPLOAD_CONFIG.maxAge) {
            staleSessions.push(sessionId);
        }
    }

    console.log(`Cleaning up ${staleSessions.length} stale upload sessions`);

    for (const sessionId of staleSessions) {
        await cleanupSession(sessionId);
    }

    return { cleaned: staleSessions.length };
};

// Start automatic cleanup
setInterval(cleanupStaleUploads, CHUNK_UPLOAD_CONFIG.cleanupInterval);

export default {
    initializeChunkedUpload,
    uploadChunk,
    assembleChunks,
    getUploadStatus,
    cancelUploadSession,
    cleanupStaleUploads,
    CHUNK_UPLOAD_CONFIG,
};