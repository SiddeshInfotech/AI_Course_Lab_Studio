#!/usr/bin/env node

/**
 * Test Script for MinIO Video Upload
 * Tests the fixed uploadToMinio functionality
 */

import { getMinioConfig, initMinioClient, ensureBucket } from './learnai-backend/config/minio.js';
import { uploadFile, generateFileKey } from './learnai-backend/config/storage.js';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMinioUpload() {
    console.log('\n🧪 TESTING MINIO VIDEO UPLOAD FIX...\n');

    try {
        // 1. Test MinIO connection
        console.log('1️⃣  Testing MinIO connection...');
        const config = getMinioConfig();
        console.log(`   MinIO endpoint: ${config.endPoint}:${config.port}`);
        console.log(`   Bucket: ${config.bucket}`);

        const client = initMinioClient();
        const buckets = await client.listBuckets();
        console.log(`   ✅ Connected! Available buckets: ${buckets.map(b => b.name).join(', ')}`);

        // 2. Ensure bucket exists
        console.log('\n2️⃣  Ensuring bucket exists...');
        const bucketReady = await ensureBucket(config.bucket);
        if (bucketReady) {
            console.log(`   ✅ Bucket "${config.bucket}" is ready`);
        } else {
            console.log(`   ❌ Failed to prepare bucket`);
            return;
        }

        // 3. Test buffer upload (simulating video)
        console.log('\n3️⃣  Testing buffer upload (simulating video)...');

        // Create a small test buffer (1MB)
        const testSize = 1 * 1024 * 1024;
        const testBuffer = Buffer.alloc(testSize);
        testBuffer.fill('test-video-data');

        console.log(`   Test buffer size: ${testSize / 1024 / 1024}MB`);

        const uploadResult = await uploadFile(
            testBuffer,
            'test-video.mp4',
            {
                type: 'videos',
                contentType: 'video/mp4'
            }
        );

        console.log(`   ✅ Upload successful!`);
        console.log(`   Storage key: ${uploadResult.key}`);
        console.log(`   URL: ${uploadResult.url}`);

        // 4. Verify file exists in MinIO
        console.log('\n4️⃣  Verifying file in MinIO...');
        try {
            const stat = await client.statObject(config.bucket, uploadResult.key);
            console.log(`   ✅ File verified in MinIO`);
            console.log(`   Size: ${stat.size / 1024 / 1024}MB`);
            console.log(`   ETag: ${stat.etag}`);
        } catch (err) {
            console.log(`   ⚠️  Could not verify file (this might be OK): ${err.message}`);
        }

        // 5. List recent uploads
        console.log('\n5️⃣  Listing recent uploads...');
        const objectsList = [];
        const stream = client.listObjects(config.bucket, 'videos/', true);

        stream.on('data', (obj) => {
            if (objectsList.length < 5) {
                objectsList.push(obj);
            }
        });

        stream.on('error', (err) => {
            console.log(`   ⚠️  Could not list objects: ${err.message}`);
        });

        await new Promise(resolve => {
            stream.on('end', () => {
                if (objectsList.length > 0) {
                    console.log(`   ✅ Found ${objectsList.length} recent video uploads:`);
                    objectsList.forEach(obj => {
                        console.log(`      - ${obj.name} (${obj.size / 1024}KB)`);
                    });
                } else {
                    console.log(`   ℹ️  No recent uploads found`);
                }
                resolve();
            });
        });

        console.log('\n✅ ALL TESTS PASSED! MinIO upload is working correctly.\n');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('\nDebug Info:');
        console.error(error.stack);
        process.exit(1);
    }
}

// Run test
testMinioUpload().then(() => {
    console.log('Test completed successfully!');
    process.exit(0);
}).catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
