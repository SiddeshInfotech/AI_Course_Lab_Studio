#!/usr/bin/env node

/**
 * Script to re-process existing unified videos to ensure web compatibility
 * This transcodes videos to H.264/AAC format for better browser support
 */

import prisma from "../config/db.js";
import { processVideoForStorage } from "../utils/videoProcessor.js";
import { uploadFile } from "../config/storage.js";
import { getPublicUrl } from "../config/storage.js";

async function reProcessExistingVideos() {
  console.log("🔄 Starting video re-processing for web compatibility...\n");

  try {
    // Get all lessons with unifiedVideoUrl
    const lessons = await prisma.lesson.findMany({
      where: {
        unifiedVideoUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        unifiedVideoUrl: true,
      },
    });

    console.log(`Found ${lessons.length} lessons with unified videos\n`);

    let processed = 0;
    let failed = 0;

    for (const lesson of lessons) {
      console.log(`\nProcessing lesson ${lesson.id}: ${lesson.title}`);
      console.log(`   Current URL: ${lesson.unifiedVideoUrl}`);

      try {
        // Extract the storage key from the URL
        const urlParts = lesson.unifiedVideoUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        const storageKey = `videos/${filename}`;

        // Check if the file exists and get it
        const storageType = process.env.STORAGE_TYPE || 'local';
        
        let videoBuffer;
        try {
          // Try to download from storage
          const { getFile } = await import('../config/storage.js');
          videoBuffer = await getFile(storageKey);
        } catch (downloadError) {
          console.log(`   ⚠️ Could not download from storage, skipping...`);
          console.log(`   Error: ${downloadError.message}`);
          failed++;
          continue;
        }

        if (!videoBuffer) {
          console.log(`   ⚠️ Could not read video file, skipping...`);
          failed++;
          continue;
        }

        console.log(`   📹 Video size: ${Math.round(videoBuffer.length / 1024 / 1024)}MB`);

        // Process the video for web compatibility
        const processedVideo = await processVideoForStorage(videoBuffer, filename);

        console.log(`   ✅ Video processed successfully`);
        console.log(`   - Original: ${Math.round(videoBuffer.length / 1024 / 1024)}MB`);
        console.log(`   - Processed: ${Math.round(processedVideo.compressedSize / 1024 / 1024)}MB`);
        console.log(`   - New URL: ${processedVideo.url}`);

        // Update the lesson with the new video URL
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: {
            unifiedVideoUrl: processedVideo.url,
          },
        });

        console.log(`   💾 Database updated`);
        processed++;

      } catch (err) {
        console.error(`   ❌ Failed to process: ${err.message}`);
        failed++;
      }
    }

    console.log(`\n\n✅ Re-processing complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Failed: ${failed}`);

  } catch (error) {
    console.error("❌ Re-processing failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

reProcessExistingVideos()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script error:", error);
    process.exit(1);
  });
