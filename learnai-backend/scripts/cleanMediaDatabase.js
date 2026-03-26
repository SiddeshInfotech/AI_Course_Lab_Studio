import prisma from '../config/db.js';

async function cleanMediaDatabase() {
  try {
    console.log('🧹 Starting database cleanup...');

    // Delete all video-related media records
    const deletedCount = await prisma.media.deleteMany({
      where: {
        mimeType: {
          startsWith: 'video/'
        }
      }
    });

    console.log(`✅ Deleted ${deletedCount.count} video records from Media table`);

    // Reset all lesson videoUrl to null
    const updatedLessons = await prisma.lesson.updateMany({
      where: {
        videoUrl: {
          not: null
        }
      },
      data: {
        videoUrl: null
      }
    });

    console.log(`✅ Reset videoUrl to null for ${updatedLessons.count} lessons`);

    console.log('🎉 Database cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

cleanMediaDatabase();
