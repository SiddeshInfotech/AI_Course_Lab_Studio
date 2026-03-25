import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugVideoPlayback() {
    console.log('🔍 DEBUGGING VIDEO PLAYBACK ISSUE\n');

    try {
        // 1. Check the current lesson and its video
        const lesson = await prisma.lesson.findUnique({
            where: { id: 159 },
            select: {
                id: true,
                title: true,
                videoUrl: true,
                course: { select: { title: true } }
            }
        });

        if (!lesson) {
            console.log('❌ Lesson 159 not found');
            return;
        }

        console.log('📚 CURRENT LESSON:');
        console.log(`   Course: ${lesson.course.title}`);
        console.log(`   Lesson: ${lesson.title}`);
        console.log(`   Video URL: ${lesson.videoUrl}`);
        console.log('');

        // 2. Extract media ID and check the media file
        const mediaMatch = lesson.videoUrl?.match(/\/api\/media\/(\d+)/);
        if (!mediaMatch) {
            console.log('❌ Invalid video URL format');
            return;
        }

        const mediaId = parseInt(mediaMatch[1]);
        console.log(`🎬 CHECKING MEDIA FILE (ID: ${mediaId}):`);

        const media = await prisma.media.findUnique({
            where: { id: mediaId },
            select: {
                id: true,
                filename: true,
                mimeType: true,
                size: true,
                data: false, // Don't load the actual binary data
                entityType: true,
                entityId: true,
                isCompressed: true,
                originalSize: true,
                compressionRatio: true,
                processingTime: true
            }
        });

        if (!media) {
            console.log(`❌ Media file ${mediaId} not found in database`);
            return;
        }

        console.log(`   ✅ File: ${media.filename}`);
        console.log(`   ✅ Type: ${media.mimeType}`);
        console.log(`   ✅ Size: ${(media.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   ✅ Compressed: ${media.isCompressed}`);
        if (media.isCompressed && media.originalSize) {
            console.log(`   ✅ Original Size: ${(media.originalSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   ✅ Compression Ratio: ${(media.compressionRatio * 100).toFixed(1)}%`);
        }
        console.log(`   ✅ Processing Time: ${media.processingTime || 'N/A'} ms`);
        console.log('');

        // 3. Check if video file size is reasonable for streaming
        console.log('📊 VIDEO STREAMING ANALYSIS:');
        const sizeMB = media.size / 1024 / 1024;
        if (sizeMB > 100) {
            console.log(`   ⚠️  Large file (${sizeMB.toFixed(2)}MB) - may take time to load`);
        } else if (sizeMB > 50) {
            console.log(`   ⚠️  Medium file (${sizeMB.toFixed(2)}MB) - normal loading time`);
        } else {
            console.log(`   ✅ Good size (${sizeMB.toFixed(2)}MB) - should load quickly`);
        }

        // 4. Test video format compatibility
        console.log('🎥 VIDEO FORMAT ANALYSIS:');
        if (media.mimeType === 'video/mp4') {
            console.log('   ✅ MP4 format - widely supported');
        } else if (media.mimeType === 'video/webm') {
            console.log('   ⚠️  WebM format - may not work in all browsers');
        } else if (media.mimeType === 'video/ogg') {
            console.log('   ⚠️  OGG format - limited browser support');
        } else {
            console.log(`   ❌ ${media.mimeType} - may not be supported`);
        }
        console.log('');

        // 5. Check if there are students currently on this lesson
        console.log('👥 STUDENT STATUS:');
        const studentsOnLesson = await prisma.courseProgress.findMany({
            where: { currentLessonId: 159 },
            select: {
                user: { select: { name: true, username: true } },
                lastAccessedAt: true
            }
        });

        if (studentsOnLesson.length === 0) {
            console.log('   ❌ No students are currently on this lesson');
        } else {
            console.log(`   ✅ ${studentsOnLesson.length} student(s) on this lesson:`);
            studentsOnLesson.forEach(progress => {
                console.log(`     - ${progress.user.name || progress.user.username}`);
                console.log(`       Last active: ${progress.lastAccessedAt?.toLocaleString() || 'never'}`);
            });
        }
        console.log('');

        // 6. Provide specific debugging steps
        console.log('🔧 DEBUGGING STEPS FOR SLOW VIDEO LOADING:\n');

        console.log('1️⃣ CHECK BROWSER DEVELOPER TOOLS:');
        console.log('   - Open F12 in browser');
        console.log('   - Go to Network tab');
        console.log('   - Look for requests to: /api/media/2/signed-url');
        console.log('   - Check if request is failing or taking too long\n');

        console.log('2️⃣ MANUAL SIGNED URL TEST:');
        console.log('   - Open test page: file:///Users/pradhanvarpe/Desktop/LearnAI New/AI_Course_Lab_Studio/test-video-playback.html');
        console.log('   - Login first at http://localhost:3001');
        console.log('   - Copy token from localStorage');
        console.log('   - Test with Media ID: 2\n');

        console.log('3️⃣ COMMON ISSUES & SOLUTIONS:');
        console.log('   - Authentication failing → Check if logged in properly');
        console.log('   - Large file loading → Wait 30-60 seconds for initial load');
        console.log('   - Browser compatibility → Try Chrome/Firefox');
        console.log('   - CORS issues → Check if both servers running on correct ports\n');

        console.log('4️⃣ QUICK FIXES TO TRY:');
        console.log('   - Hard refresh page (Ctrl+F5)');
        console.log('   - Clear browser cache');
        console.log('   - Check if both servers are running:');
        console.log('     Backend: curl http://localhost:5001/api');
        console.log('     Frontend: curl http://localhost:3001');
        console.log('');

        console.log('🚀 TESTING INSTRUCTIONS:');
        console.log('   1. Login at: http://localhost:3001');
        console.log('   2. Go to: http://localhost:3001/learning');
        console.log('   3. Open Developer Tools (F12)');
        console.log('   4. Watch Console and Network tabs');
        console.log('   5. Report any error messages you see');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

debugVideoPlayback();