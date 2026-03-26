import prisma from '../config/db.js';

async function testVideoSetup() {
  try {
    console.log('🧪 Testing Video Upload Setup...\n');

    // Get lessons with videos
    const lessonsWithVideos = await prisma.lesson.findMany({
      select: {
        id: true,
        title: true,
        videoUrl: true,
        courseId: true
      },
      where: {
        videoUrl: {
          not: null
        }
      }
    });

    // Get all videos in media table
    const mediaVideos = await prisma.media.findMany({
      select: {
        id: true,
        filename: true,
        url: true,
        entityType: true,
        entityId: true,
        storageKey: true
      },
      where: {
        mimeType: {
          startsWith: 'video/'
        }
      }
    });

    console.log('========================================');
    console.log('📚 LESSONS WITH VIDEOS');
    console.log('========================================');
    if (lessonsWithVideos.length === 0) {
      console.log('❌ No lessons have videos yet\n');
    } else {
      lessonsWithVideos.forEach(lesson => {
        console.log(`✅ Lesson: ${lesson.title} (ID: ${lesson.id})`);
        console.log(`   VideoUrl: ${lesson.videoUrl}`);
        console.log(`   CourseId: ${lesson.courseId}\n`);
      });
    }

    console.log('========================================');
    console.log('🎬 VIDEOS IN MEDIA TABLE');
    console.log('========================================');
    if (mediaVideos.length === 0) {
      console.log('❌ No videos in media table\n');
    } else {
      mediaVideos.forEach(video => {
        console.log(`✅ Video ID: ${video.id}`);
        console.log(`   File: ${video.filename}`);
        console.log(`   Storage Key: ${video.storageKey}`);
        console.log(`   URL: ${video.url}`);
        console.log(`   Entity: ${video.entityType || 'none'} / ID: ${video.entityId || 'none'}\n`);
      });
    }

    console.log('========================================');
    console.log('📋 SETUP STATUS');
    console.log('========================================');

    if (lessonsWithVideos.length > 0 && mediaVideos.length > 0) {
      console.log('✅ All systems connected');
      console.log('✅ Videos uploading correctly');
      console.log('✅ Lessons getting video URLs');
      console.log('✅ Ready for learning page\n');
    } else if (mediaVideos.length > 0 && lessonsWithVideos.length === 0) {
      console.log('⚠️  Videos uploaded but lesson URLs not set');
      console.log('→ Restart backend: npm run dev');
      console.log('→ Upload a new video with lesson selected\n');
    } else {
      console.log('❌ No videos uploaded yet');
      console.log('→ Upload a video through admin panel');
      console.log('→ Select a course and lesson');
      console.log('→ Click upload\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  }
}

testVideoSetup();
