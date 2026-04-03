import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { createWriteStream, createReadStream, unlinkSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { v4 as uuidv4 } from "uuid";
import { uploadFile, deleteFile, getSignedUrl, getPublicUrl, getStorageType } from "../config/storage.js";
import { getMinioClient, ensureBucket, getMinioConfig } from "../config/minio.js";

let ffmpegAvailable = false;
let ffmpegPath = null;

try {
    if (ffmpegStatic) {
        ffmpegPath = ffmpegStatic;
        ffmpeg.setFfmpegPath(ffmpegStatic);
        ffmpegAvailable = true;
        console.log("FFmpeg path set to:", ffmpegStatic);
    } else {
        console.warn("FFmpeg static not available, using placeholder thumbnails");
        ffmpegAvailable = false;
    }
} catch (err) {
    console.warn("FFmpeg not available, videos will be uploaded without compression:", err.message);
    ffmpegAvailable = false;
}

const ensureDir = (dirPath) => {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
};

const getTempPath = (filename) => {
    const tempDir = tmpdir();
    ensureDir(tempDir);
    return join(tempDir, filename);
};

export const generateVideoThumbnail = async (inputPath, storageKey = null) => {
    if (!ffmpegAvailable || !ffmpegPath) {
        console.warn("FFmpeg not available, using placeholder thumbnail");
        return createPlaceholderThumbnail();
    }

    // Check if input file exists
    if (!existsSync(inputPath)) {
        console.warn("Input video file not found for thumbnail, using placeholder");
        return createPlaceholderThumbnail();
    }

    return new Promise(async (resolve, reject) => {
        const thumbnailFilename = `thumbnail-${uuidv4()}.jpg`;
        const thumbnailPath = getTempPath(thumbnailFilename);

        let inputForFfmpeg = inputPath;
        const storage = getStorageType();

        if (storageKey && storage !== 'local') {
            try {
                inputForFfmpeg = getTempPath(`video-${uuidv4()}.mp4`);
                await downloadFromStorage(storageKey, inputForFfmpeg);
            } catch (err) {
                console.error("Failed to download from storage for thumbnail:", err);
                inputForFfmpeg = inputPath;
            }
        }

        try {
            ffmpeg(inputForFfmpeg)
                .outputOptions(['-ss', '00:00:01', '-vframes', '1', '-s', '320x180'])
                .output(thumbnailPath)
                .on("end", async () => {
                    try {
                        if (!existsSync(thumbnailPath)) {
                            resolve(createPlaceholderThumbnail());
                            return;
                        }
                        const thumbnailBuffer = await readFileAsBuffer(thumbnailPath);

                        const thumbnailResult = await uploadFile(
                            thumbnailBuffer,
                            thumbnailFilename,
                            { type: 'thumbnails', contentType: 'image/jpeg' }
                        );

                        unlinkSync(thumbnailPath);
                        if (inputForFfmpeg !== inputPath && existsSync(inputForFfmpeg)) {
                            unlinkSync(inputForFfmpeg);
                        }

                        resolve({
                            storageKey: thumbnailResult.key,
                            url: thumbnailResult.url
                        });
                    } catch (err) {
                        console.error("Error processing thumbnail:", err);
                        resolve(createPlaceholderThumbnail());
                    }
                })
                .on("error", (err) => {
                    console.error("Thumbnail generation error:", err.message);
                    resolve(createPlaceholderThumbnail());
                })
                .run();
        } catch (err) {
            console.error("FFmpeg execution error:", err);
            resolve(createPlaceholderThumbnail());
        }
    });
};

const createPlaceholderThumbnail = async () => {
    const placeholderSvg = `
        <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
            <rect width="320" height="180" fill="#1f2937"/>
            <circle cx="160" cy="90" r="30" fill="#3b82f6" opacity="0.8"/>
            <polygon points="150,75 150,105 180,90" fill="white"/>
            <text x="160" y="150" text-anchor="middle" fill="white" font-family="Arial" font-size="14">Video</text>
        </svg>
    `;

    const svgBuffer = Buffer.from(placeholderSvg);
    const result = await uploadFile(
        svgBuffer,
        `placeholder-${uuidv4()}.svg`,
        { type: 'thumbnails', contentType: 'image/svg+xml' }
    );

    return { storageKey: result.key, url: result.url };
};

const readFileAsBuffer = (filePath) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        const stream = createReadStream(filePath);

        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });
};

const downloadFromStorage = async (key, localPath) => {
    const { getFileStream } = await import('../config/storage.js');
    const fs = await import('fs');

    const stream = await getFileStream(key);
    const writer = createWriteStream(localPath);

    return new Promise((resolve, reject) => {
        stream.pipe(writer);
        writer.on('close', resolve);
        writer.on('error', reject);
    });
};

export const compressVideo = async (inputPath, outputPath) => {
    if (!ffmpegAvailable) {
        console.warn("FFmpeg not available, skipping compression");
        // Copy original file as compressed (no actual compression)
        const fs = await import('fs');
        fs.copyFileSync(inputPath, outputPath);
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .videoCodec("libx264")
            .audioCodec("aac")
            .videoFilters([
                "scale=-2:720",
                "fps=30"
            ])
            .outputOptions([
                "-preset medium",
                "-crf 28",
                "-movflags +faststart",
            ])
            .on("progress", (progress) => {
                if (progress.percent) {
                    console.log(`Compression: ${Math.round(progress.percent)}%`);
                }
            })
            .on("end", () => resolve())
            .on("error", (err) => {
                console.error("Compression error:", err.message);
                reject(err);
            })
            .save(outputPath);
    });
};

export const processVideoForStorage = async (fileBuffer, originalName) => {
    const startTime = Date.now();
    const videoId = uuidv4();
    const storageType = getStorageType();

    const tempInputPath = getTempPath(`input-${videoId}-${originalName}`);
    const tempOutputPath = getTempPath(`output-${videoId}.mp4`);

    try {
        await writeBufferToFile(fileBuffer, tempInputPath);

        const originalSize = fileBuffer.length;
        console.log(`Processing video: ${originalName} (${Math.round(originalSize / (1024 * 1024))}MB)`);

        let compressionSuccess = false;
        let compressedBuffer = null;
        let compressedSize = originalSize;

        try {
            await compressVideo(tempInputPath, tempOutputPath);
            if (existsSync(tempOutputPath)) {
                compressedBuffer = await readFileAsBuffer(tempOutputPath);
                compressedSize = compressedBuffer.length;
                compressionSuccess = true;
            }
        } catch (compressErr) {
            console.warn("Compression failed, using original:", compressErr.message);
            compressedBuffer = null;
        }

        // If compression failed or file doesn't exist, use original
        if (!compressionSuccess || !compressedBuffer) {
            console.log("Using original video without compression");
            compressedBuffer = fileBuffer;
            compressedSize = originalSize;
        }

        let thumbnailResult;
        try {
            // Use the file that exists (compressed or original)
            const thumbnailSource = compressionSuccess ? tempOutputPath : tempInputPath;
            thumbnailResult = await generateVideoThumbnail(thumbnailSource);
        } catch (thumbErr) {
            console.warn("Thumbnail generation failed:", thumbErr.message);
            thumbnailResult = await createPlaceholderThumbnail();
        }

        const uploadResult = await uploadFile(
            compressedBuffer,
            `${videoId}.mp4`,
            { type: 'videos', contentType: 'video/mp4' }
        );

        const processingTime = Date.now() - startTime;

        console.log(`Video processing completed in ${processingTime}ms:`);
        console.log(`- Original size: ${Math.round(originalSize / (1024 * 1024))}MB`);
        console.log(`- Compressed size: ${Math.round(compressedSize / (1024 * 1024))}MB`);
        console.log(`- Compression ratio: ${Math.round((compressedSize / originalSize) * 100)}%`);

        cleanupTempFiles([tempInputPath, tempOutputPath]);

        return {
            storageKey: uploadResult.key,
            url: uploadResult.url,
            thumbnailStorageKey: thumbnailResult.storageKey,
            thumbnailUrl: thumbnailResult.url,
            originalSize,
            compressedSize,
            compressionRatio: compressedSize / originalSize,
            processingTime,
            mimeType: "video/mp4",
            storageType
        };
    } catch (error) {
        console.error("Video processing failed:", error);

        // Fallback: upload original without any processing
        const uploadResult = await uploadFile(
            fileBuffer,
            `${videoId}-original.mp4`,
            { type: 'videos', contentType: 'video/mp4' }
        );

        const thumbnailResult = await createPlaceholderThumbnail();

        cleanupTempFiles([tempInputPath, tempOutputPath]);

        return {
            storageKey: uploadResult.key,
            url: uploadResult.url,
            thumbnailStorageKey: thumbnailResult.storageKey,
            thumbnailUrl: thumbnailResult.url,
            originalSize: fileBuffer.length,
            compressedSize: fileBuffer.length,
            compressionRatio: 1,
            processingTime: Date.now() - startTime,
            mimeType: fileBuffer.type || "video/mp4",
            storageType
        };
    }
};

export const processImageForStorage = async (fileBuffer, originalName, mimeType = 'image/jpeg') => {
    const { v4: uuidv4 } = await import("uuid");
    const imageId = uuidv4();

    const uploadResult = await uploadFile(
        fileBuffer,
        `${imageId}-${originalName}`,
        { type: 'images', contentType: mimeType }
    );

    return {
        storageKey: uploadResult.key,
        url: uploadResult.url,
        size: fileBuffer.length,
        storageType: getStorageType()
    };
};

export const processDocumentForStorage = async (fileBuffer, originalName, mimeType = 'application/pdf') => {
    const { v4: uuidv4 } = await import("uuid");
    const docId = uuidv4();

    const uploadResult = await uploadFile(
        fileBuffer,
        `${docId}-${originalName}`,
        { type: 'documents', contentType: mimeType }
    );

    return {
        storageKey: uploadResult.key,
        url: uploadResult.url,
        size: fileBuffer.length,
        storageType: getStorageType()
    };
};

const writeBufferToFile = (buffer, filePath) => {
    return new Promise((resolve, reject) => {
        const stream = createWriteStream(filePath);
        stream.write(buffer);
        stream.end();
        stream.on("finish", resolve);
        stream.on("error", reject);
    });
};

const cleanupTempFiles = (files) => {
    files.forEach((file) => {
        try {
            if (existsSync(file)) {
                unlinkSync(file);
            }
        } catch (e) {
            // Ignore cleanup errors
        }
    });
};

export const deleteVideoFiles = async (videoStorageKey, thumbnailStorageKey) => {
    try {
        if (videoStorageKey) {
            await deleteFile(videoStorageKey);
        }
        if (thumbnailStorageKey) {
            await deleteFile(thumbnailStorageKey);
        }
        return true;
    } catch (error) {
        console.error("Error deleting video files:", error);
        return false;
    }
};

export const getVideoSignedUrl = async (storageKey, expiresIn = 3600) => {
    try {
        const signedUrl = await getSignedUrl(storageKey, expiresIn);
        return signedUrl;
    } catch (error) {
        console.error("Error generating signed URL:", error);
        throw error;
    }
};

export const getVideoPublicUrl = (storageKey) => {
    return getPublicUrl(storageKey);
};

export const getThumbnailSignedUrl = async (storageKey, expiresIn = 3600) => {
    try {
        const signedUrl = await getSignedUrl(storageKey, expiresIn);
        return signedUrl;
    } catch (error) {
        console.error("Error generating thumbnail signed URL:", error);
        throw error;
    }
};

export default {
    processVideoForStorage,
    processImageForStorage,
    processDocumentForStorage,
    generateVideoThumbnail,
    deleteVideoFiles,
    getVideoSignedUrl,
    getVideoPublicUrl,
    getThumbnailSignedUrl
};
