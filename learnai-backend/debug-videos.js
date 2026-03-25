import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugVideoState() {
    console.log('🔍 Debugging LearnAI Video System State...\n');

    try {
        // Check Media table for any video records
        console.log('📹 CHECKING MEDIA TABLE:');
        const mediaVideos = await prisma.media.findMany({
            where: {
                mimeType: {
                    startsWith: 'video/'
                }
            },
            select: {
                id: true,
                filename: true,
                mimeType: true,
                size: true,
                entityType: true,
                entityId: true,
                isCompressed: true,
                originalSize: true,
                compressionRatio: true
            }
        });

        if (mediaVideos.length === 0) {
            console.log('❌ No video records found in Media table');
        } else {
            console.log(`✅ Found ${mediaVideos.length} video record(s):`);
            mediaVideos.forEach(video => {
                console.log(`   - ID: ${video.id}, File: ${video.filename}`);
                console.log(`     Type: ${video.mimeType}, Size: ${Math.round(video.size / 1024 / 1024 * 100) / 100}MB`);
                console.log(`     Entity: ${video.entityType}#${video.entityId}, Compressed: ${video.isCompressed}`);
                if (video.compressionRatio) {
                    console.log(`     Compression: ${Math.round(video.compressionRatio * 100)}%, Original: ${Math.round((video.originalSize || 0) / 1024 / 1024 * 100) / 100}MB`);
                }
                console.log('');
            });
        }

        // Check Lesson table for videoUrl fields
        console.log('📚 CHECKING LESSON TABLE:');
        const lessonsWithVideos = await prisma.lesson.findMany({
            where: {
                videoUrl: {
                    not: null
                }
            },
            select: {
                id: true,
                title: true,
                videoUrl: true,
                orderIndex: true,
                courseId: true,
                course: {
                    select: {
                        title: true
                    }
                }
            },
            orderBy: [
                { courseId: 'asc' },
                { orderIndex: 'asc' }
            ]
        });

        if (lessonsWithVideos.length === 0) {
            console.log('❌ No lessons with videoUrl found');
        } else {
            console.log(`✅ Found ${lessonsWithVideos.length} lesson(s) with video URLs:`);
            lessonsWithVideos.forEach(lesson => {
                console.log(`   - ${lesson.course.title} #${lesson.orderIndex}: ${lesson.title}`);
                console.log(`     Video URL: ${lesson.videoUrl}`);
                console.log('');
            });
        }

        // Check some sample lessons without videos
        console.log('📝 CHECKING ALL LESSONS (first 5):');
        const sampleLessons = await prisma.lesson.findMany({
            take: 5,
            select: {
                id: true,
                title: true,
                videoUrl: true,
                orderIndex: true,
                course: {
                    select: {
                        title: true
                    }
                }
            },
            orderBy: [
                { courseId: 'asc' },
                { orderIndex: 'asc' }
            ]
        });

        sampleLessons.forEach(lesson => {
            console.log(`   - ${lesson.course.title} #${lesson.orderIndex}: ${lesson.title}`);
            console.log(`     Video URL: ${lesson.videoUrl || '(none)'}`);
        });

        // Summary
        console.log('\n📊 SUMMARY:');
        console.log(`   - Media videos: ${mediaVideos.length}`);
        console.log(`   - Lessons with videos: ${lessonsWithVideos.length}`);
        console.log(`   - Total lessons checked: ${sampleLessons.length}`);

        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        if (mediaVideos.length === 0) {
            console.log('   1. Upload videos through admin panel (/admin)');
            console.log('   2. Videos should be uploaded with course/lesson associations');
        }
        if (lessonsWithVideos.length === 0 && mediaVideos.length > 0) {
            console.log('   1. Media videos exist but lessons don\'t reference them');
            console.log('   2. Update lesson videoUrl to format: /api/media/{mediaId}');
        }
        if (lessonsWithVideos.length > 0) {
            console.log('   1. Check if videoUrl format matches: /api/media/{number}');
            console.log('   2. Verify authentication is working on learning page');
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

debugVideoState();