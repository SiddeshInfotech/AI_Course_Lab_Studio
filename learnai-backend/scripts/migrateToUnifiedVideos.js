import prisma from "../config/db.js";

async function migrateToUnifiedVideos() {
  console.log("Starting migration to unified video format...\n");

  try {
    // Get all lessons with language-specific videos
    const lessons = await prisma.lesson.findMany({
      where: {
        OR: [
          { videoUrlEnglish: { not: null } },
          { videoUrlHindi: { not: null } },
          { videoUrlMarathi: { not: null } },
        ],
      },
    });

    console.log(`Found ${lessons.length} lessons with language-specific videos\n`);

    for (const lesson of lessons) {
      console.log(`\nProcessing lesson ID ${lesson.id}: ${lesson.title}`);
      
      // Check if this lesson already has unified video
      if (lesson.unifiedVideoUrl) {
        console.log(`  ⏭️  Already has unified video, skipping...`);
        continue;
      }

      // Build audio tracks array from existing language videos
      const audioTracks = [];
      
      if (lesson.videoUrlEnglish) {
        audioTracks.push({
          language: "english",
          label: "English",
          audioUrl: lesson.videoUrlEnglish,
        });
        console.log(`  ✅ Found English video: ${lesson.videoUrlEnglish}`);
      }
      
      if (lesson.videoUrlHindi) {
        audioTracks.push({
          language: "hindi",
          label: "Hindi",
          audioUrl: lesson.videoUrlHindi,
        });
        console.log(`  ✅ Found Hindi video: ${lesson.videoUrlHindi}`);
      }
      
      if (lesson.videoUrlMarathi) {
        audioTracks.push({
          language: "marathi",
          label: "Marathi",
          audioUrl: lesson.videoUrlMarathi,
        });
        console.log(`  ✅ Found Marathi video: ${lesson.videoUrlMarathi}`);
      }

      if (audioTracks.length === 0) {
        console.log(`  ⚠️  No audio tracks found, skipping...`);
        continue;
      }

      // For migration purposes, we'll use the English video as the "unified" video
      // since it contains the video content. In reality, you would need to:
      // 1. Extract the video stream from one of the files
      // 2. Extract audio streams from all language files
      // 3. Merge them into a single video with multiple audio tracks
      const unifiedVideoUrl = lesson.videoUrlEnglish || lesson.videoUrlHindi || lesson.videoUrlMarathi;

      // Update lesson with unified video URL and audio tracks
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          unifiedVideoUrl: unifiedVideoUrl,
          audioTracks: JSON.stringify(audioTracks),
        },
      });

      console.log(`  ✅ Updated lesson ${lesson.id} with unified video format`);
      console.log(`     Unified video: ${unifiedVideoUrl}`);
      console.log(`     Audio tracks: ${audioTracks.length} languages`);
    }

    console.log("\n\nMigration completed successfully!");
    console.log("\nNote: This migration creates 'unified' videos by referencing the existing");
    console.log("language-specific videos. For a true unified video with embedded audio tracks,");
    console.log("you would need to use FFmpeg to merge the video and audio streams.");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateToUnifiedVideos()
  .then(() => {
    console.log("\nMigration script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nMigration script failed:", error);
    process.exit(1);
  });
