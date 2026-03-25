/**
 * Watermarking Service for Media Content Protection
 * Adds user identification to images and videos for content security
 */

import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

/**
 * Add watermark to image using Sharp
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} watermarkOptions - Watermark configuration
 * @returns {Buffer} - Watermarked image buffer
 */
export async function addImageWatermark(imageBuffer, watermarkOptions = {}) {
    try {
        const {
            text = 'Protected Content',
            position = 'bottom-right',
            opacity = 0.7,
            fontSize = 24,
            color = 'white',
            backgroundColor = 'rgba(0,0,0,0.5)',
            margin = 20
        } = watermarkOptions;

        // Get image metadata
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();

        // Create watermark text overlay
        const watermarkSvg = createWatermarkSVG(text, {
            fontSize,
            color,
            backgroundColor,
            opacity,
            width: metadata.width,
            height: metadata.height,
            position,
            margin
        });

        // Apply watermark
        const watermarkedBuffer = await image
            .composite([{
                input: Buffer.from(watermarkSvg),
                gravity: getSharpGravity(position)
            }])
            .jpeg({ quality: 90 })
            .toBuffer();

        return watermarkedBuffer;

    } catch (error) {
        console.error('Image watermarking error:', error);
        throw new Error('Failed to add watermark to image');
    }
}

/**
 * Add watermark to video using FFmpeg
 * @param {Buffer} videoBuffer - Original video buffer
 * @param {Object} watermarkOptions - Watermark configuration
 * @returns {Promise<Buffer>} - Watermarked video buffer
 */
export async function addVideoWatermark(videoBuffer, watermarkOptions = {}) {
    try {
        const {
            text = 'Protected Content',
            position = 'bottom-right',
            opacity = 0.7,
            fontSize = 24,
            color = 'white',
            duration = null // null means entire video
        } = watermarkOptions;

        // Create temporary files for processing
        const inputPath = `/tmp/input-${crypto.randomBytes(8).toString('hex')}.mp4`;
        const outputPath = `/tmp/output-${crypto.randomBytes(8).toString('hex')}.mp4`;

        // Write input buffer to temporary file
        await fs.writeFile(inputPath, videoBuffer);

        // Create FFmpeg command
        const watermarkFilter = createFFmpegWatermarkFilter(text, {
            position,
            opacity,
            fontSize,
            color,
            duration
        });

        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .videoFilters(watermarkFilter)
                .outputOptions([
                    '-c:v libx264',
                    '-c:a aac',
                    '-preset fast',
                    '-crf 23'
                ])
                .output(outputPath)
                .on('end', async () => {
                    try {
                        const watermarkedBuffer = await fs.readFile(outputPath);

                        // Clean up temporary files
                        await Promise.all([
                            fs.unlink(inputPath).catch(() => { }),
                            fs.unlink(outputPath).catch(() => { })
                        ]);

                        resolve(watermarkedBuffer);
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', async (error) => {
                    // Clean up temporary files on error
                    await Promise.all([
                        fs.unlink(inputPath).catch(() => { }),
                        fs.unlink(outputPath).catch(() => { })
                    ]);
                    reject(error);
                })
                .run();
        });

    } catch (error) {
        console.error('Video watermarking error:', error);
        throw new Error('Failed to add watermark to video');
    }
}

/**
 * Create SVG watermark for images
 */
function createWatermarkSVG(text, options) {
    const { fontSize, color, backgroundColor, opacity, width, height, position, margin } = options;

    // Calculate position coordinates
    const coords = calculateWatermarkPosition(position, width, height, margin);

    return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <style>
                    .watermark-text {
                        font-family: Arial, sans-serif;
                        font-size: ${fontSize}px;
                        font-weight: bold;
                        fill: ${color};
                        opacity: ${opacity};
                    }
                    .watermark-bg {
                        fill: ${backgroundColor};
                        opacity: ${opacity * 0.8};
                    }
                </style>
            </defs>
            <rect x="${coords.x - 10}" y="${coords.y - fontSize}"
                  width="${text.length * fontSize * 0.6 + 20}" height="${fontSize + 20}"
                  class="watermark-bg" rx="5"/>
            <text x="${coords.x}" y="${coords.y}" class="watermark-text">${text}</text>
        </svg>
    `;
}

/**
 * Create FFmpeg watermark filter for videos
 */
function createFFmpegWatermarkFilter(text, options) {
    const { position, opacity, fontSize, color } = options;

    // Convert position to FFmpeg coordinates
    const coords = getFFmpegPosition(position);

    return [
        `drawtext=text='${text}':fontcolor=${color}:fontsize=${fontSize}:x=${coords.x}:y=${coords.y}:alpha=${opacity}:box=1:boxcolor=black@0.5:boxborderw=5`
    ];
}

/**
 * Calculate watermark position coordinates
 */
function calculateWatermarkPosition(position, width, height, margin = 20) {
    const positions = {
        'top-left': { x: margin, y: margin },
        'top-right': { x: width - margin - 200, y: margin },
        'bottom-left': { x: margin, y: height - margin },
        'bottom-right': { x: width - margin - 200, y: height - margin },
        'center': { x: width / 2 - 100, y: height / 2 }
    };

    return positions[position] || positions['bottom-right'];
}

/**
 * Convert position to Sharp gravity
 */
function getSharpGravity(position) {
    const gravityMap = {
        'top-left': 'northwest',
        'top-right': 'northeast',
        'bottom-left': 'southwest',
        'bottom-right': 'southeast',
        'center': 'center'
    };

    return gravityMap[position] || 'southeast';
}

/**
 * Convert position to FFmpeg coordinates
 */
function getFFmpegPosition(position) {
    const positions = {
        'top-left': { x: 10, y: 10 },
        'top-right': { x: 'w-tw-10', y: 10 },
        'bottom-left': { x: 10, y: 'h-th-10' },
        'bottom-right': { x: 'w-tw-10', y: 'h-th-10' },
        'center': { x: '(w-tw)/2', y: '(h-th)/2' }
    };

    return positions[position] || positions['bottom-right'];
}

/**
 * Advanced watermark with user avatar/logo
 * @param {Buffer} contentBuffer - Original content buffer
 * @param {Object} options - Advanced watermark options
 */
export async function addAdvancedWatermark(contentBuffer, options = {}) {
    const {
        mimeType,
        userInfo,
        logoPath = null,
        includeTimestamp = true,
        includeUserInfo = true,
        customText = null
    } = options;

    // Build watermark text
    let watermarkText = customText || '';

    if (includeUserInfo && userInfo) {
        watermarkText += `${userInfo.username || `User ${userInfo.id}`}`;
    }

    if (includeTimestamp) {
        const timestamp = new Date().toLocaleDateString();
        watermarkText += watermarkText ? ` • ${timestamp}` : timestamp;
    }

    const watermarkOptions = {
        text: watermarkText,
        position: 'bottom-right',
        opacity: 0.8,
        fontSize: mimeType.startsWith('video/') ? 18 : 24,
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.6)'
    };

    // Apply appropriate watermarking method
    if (mimeType.startsWith('image/')) {
        return await addImageWatermark(contentBuffer, watermarkOptions);
    } else if (mimeType.startsWith('video/')) {
        return await addVideoWatermark(contentBuffer, watermarkOptions);
    } else {
        throw new Error(`Watermarking not supported for MIME type: ${mimeType}`);
    }
}

/**
 * Batch watermark multiple files
 * @param {Array} files - Array of {buffer, mimeType, options}
 * @returns {Array} - Array of watermarked buffers
 */
export async function batchWatermark(files) {
    const results = [];

    for (const file of files) {
        try {
            const watermarked = await addAdvancedWatermark(file.buffer, {
                mimeType: file.mimeType,
                ...file.options
            });

            results.push({
                success: true,
                buffer: watermarked,
                originalSize: file.buffer.length,
                watermarkedSize: watermarked.length
            });
        } catch (error) {
            results.push({
                success: false,
                error: error.message,
                originalSize: file.buffer.length
            });
        }
    }

    return results;
}

/**
 * Verify if content has been watermarked
 * @param {Buffer} contentBuffer - Content to check
 * @param {string} mimeType - MIME type of content
 * @returns {Object} - Verification result
 */
export async function verifyWatermark(contentBuffer, mimeType) {
    try {
        // This is a simplified verification - in production you'd use more sophisticated methods
        // such as steganography detection or digital signatures

        if (mimeType.startsWith('image/')) {
            const image = sharp(contentBuffer);
            const metadata = await image.metadata();

            // Check for metadata indicating watermarking
            const hasWatermarkMetadata = metadata.exif &&
                Buffer.from(metadata.exif).includes(Buffer.from('watermarked'));

            return {
                isWatermarked: hasWatermarkMetadata,
                method: 'metadata',
                confidence: hasWatermarkMetadata ? 'high' : 'unknown'
            };
        }

        // For videos, you could check for specific watermark frames or metadata
        return {
            isWatermarked: false,
            method: 'none',
            confidence: 'unknown'
        };

    } catch (error) {
        console.error('Watermark verification error:', error);
        return {
            isWatermarked: false,
            method: 'error',
            confidence: 'unknown',
            error: error.message
        };
    }
}

// Optional: Install required packages
// npm install sharp fluent-ffmpeg canvas

export default {
    addImageWatermark,
    addVideoWatermark,
    addAdvancedWatermark,
    batchWatermark,
    verifyWatermark
};