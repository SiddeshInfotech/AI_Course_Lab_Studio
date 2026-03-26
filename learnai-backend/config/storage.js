import { ensureDir, getLocalClient, getFilePath } from './localStorage.js';
import { getMinioClient, ensureBucket, getMinioConfig, getPublicUrl as getMinioPublicUrl } from './minio.js';
import { getS3Client } from './s3.js';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

let cachedStorageType = null;
let cachedStorageConfig = null;

function getStorageType() {
    if (cachedStorageType) return cachedStorageType;
    cachedStorageType = process.env.STORAGE_TYPE || 'minio';
    return cachedStorageType;
}

function getStorageConfig() {
    if (cachedStorageConfig) return cachedStorageConfig;

    const type = getStorageType();

    switch (type) {
        case 'local':
            cachedStorageConfig = {
                type: 'local',
                basePath: process.env.UPLOAD_PATH || './uploads',
                staticUrl: process.env.STATIC_URL || `http://localhost:${process.env.PORT || 5001}`
            };
            break;
        case 'minio':
            const minioConfig = getMinioConfig();
            cachedStorageConfig = {
                type: 'minio',
                ...minioConfig
            };
            break;
        case 's3':
            cachedStorageConfig = {
                type: 's3',
                region: process.env.AWS_REGION || 'ap-southeast-1',
                bucket: process.env.AWS_S3_BUCKET
            };
            break;
        default:
            throw new Error(`Unknown storage type: ${type}`);
    }

    return cachedStorageConfig;
}

export const generateFileKey = (filename, type = 'videos') => {
    const ext = path.extname(filename);
    const uuid = uuidv4();
    const timestamp = Date.now();
    return `${type}/${timestamp}-${uuid}${ext}`;
};

export const getPublicUrl = (key) => {
    const config = getStorageConfig();

    switch (config.type) {
        case 'local':
            return `${config.staticUrl}/uploads/${key}`;
        case 'minio':
            return getMinioPublicUrl(key);
        case 's3':
            return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
        default:
            return key;
    }
};

export const uploadFile = async (buffer, filename, options = {}) => {
    const config = getStorageConfig();
    const { type = 'videos', contentType = 'video/mp4' } = options;

    const key = generateFileKey(filename, type);

    console.log(`📤 Starting upload: ${filename} (${buffer.length / 1024 / 1024}MB) to ${config.type}...`);

    try {
        let result;
        switch (config.type) {
            case 'local':
                result = await uploadToLocal(buffer, key, options);
                break;
            case 'minio':
                result = await uploadToMinio(buffer, key, contentType, options);
                break;
            case 's3':
                result = await uploadToS3(buffer, key, contentType, options);
                break;
            default:
                throw new Error(`Unsupported storage type: ${config.type}`);
        }

        console.log(`✅ Upload successful: ${key} → ${result.url}`);
        return result;
    } catch (error) {
        console.error(`❌ Upload failed for ${filename}:`, error);
        throw error;
    }
};

const uploadToLocal = async (buffer, key, options = {}) => {
    const config = getStorageConfig();
    const filePath = getFilePath(key);

    await ensureDir(path.dirname(filePath));
    await fsPromises.writeFile(filePath, buffer);

    const url = getPublicUrl(key);

    return {
        key,
        path: filePath,
        url,
        size: buffer.length
    };
};

const uploadToMinio = async (buffer, key, contentType, options = {}) => {
    const minioClient = getMinioClient();
    const config = getStorageConfig();

    await ensureBucket(config.bucket);

    const fileBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const fileSize = fileBuffer.length;

    if (!fileSize) {
        throw new Error('Buffer is empty or invalid');
    }

    const metadata = {
        'Content-Type': contentType,
        ...(options.metadata || {})
    };

    console.log(`📤 Uploading to MinIO: ${key} (${fileSize} bytes, type: ${contentType})`);

    try {
        await minioClient.putObject(
            config.bucket,
            key,
            fileBuffer,
            fileSize,
            metadata
        );
        console.log(`✅ MinIO upload successful: ${key}`);
    } catch (error) {
        console.error(`❌ MinIO upload error for key ${key}:`, error.message);
        console.error(`   Endpoint: ${config.endPoint}:${config.port}`);
        console.error(`   Bucket: ${config.bucket}`);
        console.error(`   Buffer size: ${fileSize}`);
        throw new Error(`Failed to upload to MinIO: ${error.message}`);
    }

    const url = getPublicUrl(key);

    return {
        key,
        url,
        size: fileSize
    };
};

const uploadToS3 = async (buffer, key, contentType, options = {}) => {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3Client = getS3Client();
    const config = getStorageConfig();

    const fileBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

    const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType
    });

    await s3Client.send(command);

    const url = getPublicUrl(key);

    return {
        key,
        url,
        size: fileBuffer.length
    };
};

export const deleteFile = async (key) => {
    const config = getStorageConfig();

    switch (config.type) {
        case 'local':
            return deleteFromLocal(key);
        case 'minio':
            return deleteFromMinio(key);
        case 's3':
            return deleteFromS3(key);
        default:
            throw new Error(`Unsupported storage type: ${config.type}`);
    }
};

const deleteFromLocal = async (key) => {
    const filePath = getFilePath(key);

    try {
        await fsPromises.unlink(filePath);
        return true;
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn('Error deleting local file:', error);
        }
        return false;
    }
};

const deleteFromMinio = async (key) => {
    const config = getStorageConfig();
    const minioClient = getMinioClient();

    try {
        await minioClient.removeObject(config.bucket, key);
        return true;
    } catch (error) {
        console.error('MinIO delete error:', error);
        return false;
    }
};

const deleteFromS3 = async (key) => {
    const config = getStorageConfig();
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const s3Client = getS3Client();

    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: config.bucket,
            Key: key
        }));
        return true;
    } catch (error) {
        console.error('S3 delete error:', error);
        return false;
    }
};

export const getSignedUrl = async (key, expiresIn = 3600) => {
    const config = getStorageConfig();

    switch (config.type) {
        case 'local':
            return getLocalSignedUrl(key, expiresIn);
        case 'minio':
            return getMinioSignedUrl(key, expiresIn);
        case 's3':
            return getS3SignedUrl(key, expiresIn);
        default:
            throw new Error(`Unsupported storage type: ${config.type}`);
    }
};

const getLocalSignedUrl = async (key, expiresIn) => {
    const config = getStorageConfig();
    const filePath = getFilePath(key);
    const expiresAt = Date.now() + (expiresIn * 1000);

    const jwt = await import('jsonwebtoken');

    const token = jwt.default.sign(
        { key, path: filePath, exp: Math.floor(expiresAt / 1000) },
        process.env.JWT_SECRET || 'default-secret',
        { algorithm: 'HS256' }
    );

    return `${config.staticUrl}/api/media/signed/${token}`;
};

const getMinioSignedUrl = async (key, expiresIn) => {
    const config = getStorageConfig();
    const minioClient = getMinioClient();

    try {
        const signedUrl = await minioClient.presignedGetObject(
            config.bucket,
            key,
            expiresIn
        );
        return signedUrl;
    } catch (error) {
        console.error('MinIO signed URL error:', error);
        throw error;
    }
};

const getS3SignedUrl = async (key, expiresIn) => {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const s3Client = getS3Client();
    const config = getStorageConfig();

    const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: key
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
};

export const fileExists = async (key) => {
    const config = getStorageConfig();

    switch (config.type) {
        case 'local':
            return fileExistsLocal(key);
        case 'minio':
            return fileExistsMinio(key);
        case 's3':
            return fileExistsS3(key);
        default:
            return false;
    }
};

const fileExistsLocal = async (key) => {
    const filePath = getFilePath(key);
    try {
        await fsPromises.access(filePath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
};

const fileExistsMinio = async (key) => {
    const config = getStorageConfig();
    const minioClient = getMinioClient();

    try {
        await minioClient.statObject(config.bucket, key);
        return true;
    } catch {
        return false;
    }
};

const fileExistsS3 = async (key) => {
    const config = getStorageConfig();
    const { S3Client, HeadObjectCommand } = await import('@aws-sdk/client-s3');
    const s3Client = getS3Client();

    try {
        await s3Client.send(new HeadObjectCommand({
            Bucket: config.bucket,
            Key: key
        }));
        return true;
    } catch {
        return false;
    }
};

export const getFileStream = async (key) => {
    const config = getStorageConfig();

    switch (config.type) {
        case 'local':
            return getLocalFileStream(key);
        case 'minio':
            return getMinioFileStream(key);
        case 's3':
            return getS3FileStream(key);
        default:
            throw new Error(`Unsupported storage type: ${config.type}`);
    }
};

const getLocalFileStream = async (key) => {
    const filePath = getFilePath(key);

    try {
        return fs.createReadStream(filePath);
    } catch (error) {
        throw new Error('File not found');
    }
};

const getMinioFileStream = async (key) => {
    const config = getStorageConfig();
    const minioClient = getMinioClient();

    try {
        const stream = await minioClient.getObject(config.bucket, key);
        return stream;
    } catch (error) {
        throw new Error('File not found in MinIO');
    }
};

const getS3FileStream = async (key) => {
    const config = getStorageConfig();
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const s3Client = getS3Client();

    const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: key
    });

    const response = await s3Client.send(command);
    return response.Body;
};

export { getStorageConfig, getStorageType };
export default {
    uploadFile,
    deleteFile,
    getSignedUrl,
    getPublicUrl,
    fileExists,
    getFileStream,
    generateFileKey,
    getStorageType,
    getStorageConfig
};
