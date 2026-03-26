import { Client as MinioClient } from 'minio';

let minioClient = null;
let cachedConfig = null;

const parseEndpoint = (endpoint) => {
    const normalized = endpoint || 'localhost:9000';
    const [endPoint, portStr] = normalized.includes(':')
        ? normalized.split(':')
        : [normalized, '9000'];
    return { endPoint, port: parseInt(portStr) || 9000 };
};

export const getMinioConfig = () => {
    if (cachedConfig) return cachedConfig;

    const { endPoint, port } = parseEndpoint(process.env.MINIO_ENDPOINT);

    cachedConfig = {
        endPoint,
        port,
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        bucket: process.env.MINIO_BUCKET || 'learnai-videos',
        region: process.env.MINIO_REGION || 'us-east-1',
        useSSL: process.env.MINIO_USE_SSL === 'true',
        endpoint: `${endPoint}:${port}`
    };

    return cachedConfig;
};

export const initMinioClient = () => {
    if (minioClient) {
        return minioClient;
    }

    const config = getMinioConfig();

    minioClient = new MinioClient({
        endPoint: config.endPoint,
        port: config.port,
        accessKey: config.accessKey,
        secretKey: config.secretKey,
        useSSL: config.useSSL,
        region: config.region
    });

    console.log(`MinIO client initialized: ${config.endpoint}/${config.bucket}`);

    return minioClient;
};

export const getMinioClient = () => {
    if (!minioClient) {
        initMinioClient();
    }
    return minioClient;
};

export const ensureBucket = async (bucketName) => {
    const client = getMinioClient();
    const config = getMinioConfig();

    try {
        const exists = await client.bucketExists(bucketName);

        if (!exists) {
            await client.makeBucket(bucketName, config.region);
            console.log(`Bucket created: ${bucketName}`);

            await Promise.all([
                setupBucketPolicy(bucketName),
                setupCors(bucketName)
            ]);
        }

        return true;
    } catch (error) {
        console.error('Error ensuring bucket:', error);

        if (error.code === 'ECONNREFUSED') {
            console.error('MinIO server is not running. Please start MinIO first.');
        }

        return false;
    }
};

const setupBucketPolicy = async (bucketName) => {
    const client = getMinioClient();

    const policy = {
        Version: '2012-10-17',
        Statement: [
            {
                Sid: 'PublicReadGetObject',
                Effect: 'Allow',
                Principal: '*',
                Action: [
                    's3:GetObject',
                    's3:GetObjectVersion'
                ],
                Resource: [
                    `arn:aws:s3:::${bucketName}/*`
                ]
            }
        ]
    };

    try {
        await client.setBucketPolicy(bucketName, JSON.stringify(policy));
    } catch (error) {
        console.warn('Could not set bucket policy:', error.message);
    }
};

const setupCors = async (bucketName) => {
    console.log('CORS configuration would be set at server level');
};

export const testMinioConnection = async () => {
    const config = getMinioConfig();

    try {
        const client = getMinioClient();
        const buckets = await client.listBuckets();

        console.log('✅ MinIO connection successful!');
        console.log('Available buckets:', buckets.map(b => b.name).join(', ') || '(none)');

        const bucketExists = await client.bucketExists(config.bucket);
        if (bucketExists) {
            console.log(`✅ Bucket '${config.bucket}' exists`);
        } else {
            console.log(`⚠️ Bucket '${config.bucket}' will be created on first upload`);
        }

        return { success: true, buckets };
    } catch (error) {
        const errorMessage = error.message || 'Unknown error';
        const errorCode = error.code || 'UNKNOWN';

        console.error('❌ MinIO connection failed:', errorMessage);
        console.error(`   Code: ${errorCode}`);
        console.error(`   Endpoint: ${config.endpoint}`);

        if (errorCode === 'ECONNREFUSED') {
            console.error('   → MinIO server is not running at ' + config.endpoint);
            console.error('   → Start MinIO or switch STORAGE_TYPE to "local" in .env');
        } else if (errorCode === 'ERR_TLS_CERT_UNKNOWN') {
            console.error('   → SSL certificate issue. Check MINIO_USE_SSL setting');
        }

        return { success: false, error: errorMessage, code: errorCode };
    }
};

export const uploadBuffer = async (buffer, key, contentType, metadata = {}) => {
    const config = getMinioConfig();
    const client = getMinioClient();

    await ensureBucket(config.bucket);

    const fileBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const fileSize = fileBuffer.length;

    if (!fileSize) {
        throw new Error('Buffer is empty or invalid');
    }

    const fullMetadata = {
        'Content-Type': contentType,
        ...metadata
    };

    try {
        const etag = await client.putObject(
            config.bucket,
            key,
            fileBuffer,
            fileSize,
            fullMetadata
        );

        return {
            etag,
            key,
            url: getPublicUrl(key)
        };
    } catch (error) {
        console.error(`MinIO uploadBuffer error for key ${key}:`, error);
        throw new Error(`Failed to upload to MinIO: ${error.message}`);
    }
};

export const getPublicUrl = (key) => {
    const config = getMinioConfig();
    const protocol = config.useSSL ? 'https' : 'http';
    return `${protocol}://${config.endPoint}:${config.port}/${config.bucket}/${key}`;
};

export default {
    initMinioClient,
    getMinioClient,
    getMinioConfig,
    ensureBucket,
    testMinioConnection,
    uploadBuffer,
    getPublicUrl
};
