import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEOS_DIR = path.join(__dirname, '..', 'uploads', 'videos');
const BASE_URL = process.env.STATIC_URL || 'http://localhost:5001';

/**
 * Ensure video directory exists
 */
export const ensureVideoDir = async () => {
    try {
        await fsPromises.mkdir(VIDEOS_DIR, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
};

/**
 * Generate unique video filename
 */
export const generateVideoFilename = (originalFilename) => {
    const ext = path.extname(originalFilename) || '.mp4';
    const id = uuidv4();
    return `${id}${ext}`;
};

/**
 * Save video file to disk
 */
export const saveVideoFile = async (buffer, filename) => {
    if (!buffer || buffer.length === 0) {
        throw new Error('Empty file buffer');
    }

    await ensureVideoDir();

    const videoPath = path.join(VIDEOS_DIR, filename);
    await fsPromises.writeFile(videoPath, buffer);

    return {
        filename,
        path: videoPath,
        size: buffer.length,
        url: getVideoPublicUrl(filename)
    };
};

/**
 * Generate public URL for video
 */
export const getVideoPublicUrl = (filename) => {
    return `${BASE_URL}/uploads/videos/${filename}`;
};

/**
 * Get video file path
 */
export const getVideoFilePath = (filename) => {
    return path.join(VIDEOS_DIR, filename);
};

/**
 * Check if video file exists
 */
export const videoExists = async (filename) => {
    try {
        await fsPromises.access(getVideoFilePath(filename), fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
};

/**
 * Delete video file
 */
export const deleteVideoFile = async (filename) => {
    const videoPath = getVideoFilePath(filename);

    try {
        await fsPromises.unlink(videoPath);
        return true;
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn('Error deleting video file:', error);
        }
        return false;
    }
};

/**
 * Create video stream for playback
 */
export const getVideoStream = async (filename) => {
    const videoPath = getVideoFilePath(filename);

    try {
        const exists = await videoExists(filename);
        if (!exists) {
            throw new Error('Video file not found');
        }

        return fs.createReadStream(videoPath);
    } catch (error) {
        throw new Error(`Failed to create video stream: ${error.message}`);
    }
};

/**
 * Get video file stats
 */
export const getVideoStats = async (filename) => {
    try {
        const videoPath = getVideoFilePath(filename);
        const stats = await fsPromises.stat(videoPath);

        return {
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
        };
    } catch (error) {
        throw new Error(`Failed to get video stats: ${error.message}`);
    }
};

export default {
    ensureVideoDir,
    generateVideoFilename,
    saveVideoFile,
    getVideoPublicUrl,
    getVideoFilePath,
    videoExists,
    deleteVideoFile,
    getVideoStream,
    getVideoStats
};
