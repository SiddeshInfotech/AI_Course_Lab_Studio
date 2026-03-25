import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigateVideoConnections() {
    console.log('🔍 INVESTIGATING COURSE-LESSON-MEDIA CONNECTIONS\n');

    try {
        // 1. Check Media table for uploaded videos
        console.log('📹 MEDIA TABLE - Uploaded Videos:');
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
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        if (mediaVideos.length === 0) {
            console.log('❌ No video files found in Media table');
        } else {
            console.log(`✅ Found ${mediaVideos.length} video file(s):`);
            mediaVideos.forEach(video => {
                console.log(`   - ID: ${video.id} | ${video.filename}`);
                console.log(`     Type: ${video.mimeType} | Size: ${Math.round(video.size / 1024 / 1024 * 100) / 100}MB`);
                console.log(`     Linked to: ${video.entityType || 'none'}#${video.entityId || 'none'}`);
                console.log(`     Uploaded: ${video.createdAt.toLocaleDateString()}`);
                console.log('');
            });
        }

        // 2. Check Courses
        console.log('📚 COURSES TABLE:');
        const courses = await prisma.course.findMany({
            select: {
                id: true,
                title: true,
                _count: {
                    select: {
                        lessons: true,
                        enrollments: true
                    }
                }
            },
            orderBy: { id: 'asc' }
        });

        if (courses.length === 0) {
            console.log('❌ No courses found');
        } else {
            console.log(`✅ Found ${courses.length} course(s):`);
            courses.forEach(course => {
                console.log(`   - ID: ${course.id} | ${course.title}`);
                console.log(`     Lessons: ${course._count.lessons} | Enrollments: ${course._count.enrollments}`);
            });
        }
        console.log('');

        // 3. Check Lessons and their video URLs
        console.log('📖 LESSONS TABLE - Video URLs:');
        const lessons = await prisma.lesson.findMany({
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

        if (lessons.length === 0) {
            console.log('❌ No lessons found');
        } else {
            console.log(`✅ Found ${lessons.length} lesson(s):`);

            const lessonsWithVideos = lessons.filter(l => l.videoUrl);
            const lessonsWithoutVideos = lessons.filter(l => !l.videoUrl);

            console.log(`   - Lessons WITH videos: ${lessonsWithVideos.length}`);
            console.log(`   - Lessons WITHOUT videos: ${lessonsWithoutVideos.length}`);
            console.log('');

            if (lessonsWithVideos.length > 0) {
                console.log('🎬 LESSONS WITH VIDEOS:');
                lessonsWithVideos.forEach(lesson => {
                    console.log(`   - Course: ${lesson.course.title}`);
                    console.log(`     Lesson ${lesson.orderIndex}: ${lesson.title}`);
                    console.log(`     Video URL: ${lesson.videoUrl}`);

                    // Check if videoUrl points to media table
                    const mediaMatch = lesson.videoUrl?.match(/\/api\/media\/(\d+)/);
                    if (mediaMatch) {
                        const mediaId = parseInt(mediaMatch[1]);
                        const linkedMedia = mediaVideos.find(m => m.id === mediaId);
                        if (linkedMedia) {
                            console.log(`     ✅ Links to Media ID ${mediaId}: ${linkedMedia.filename}`);
                        } else {
                            console.log(`     ❌ Links to Media ID ${mediaId} but media not found`);
                        }
                    } else if (lesson.videoUrl?.includes('youtube')) {
                        console.log(`     🎥 YouTube video detected`);
                    } else {
                        console.log(`     ⚠️  Unknown video URL format`);
                    }
                    console.log('');
                });
            }

            // Show first few lessons without videos
            if (lessonsWithoutVideos.length > 0) {
                console.log(`📝 FIRST 5 LESSONS WITHOUT VIDEOS:`);
                lessonsWithoutVideos.slice(0, 5).forEach(lesson => {
                    console.log(`   - Course: ${lesson.course.title}`);
                    console.log(`     Lesson ${lesson.orderIndex}: ${lesson.title} (ID: ${lesson.id})`);
                });
                console.log('');
            }
        }

        // 4. Check current lesson progress to see which lesson students are viewing
        console.log('👥 STUDENT PROGRESS:');
        const courseProgress = await prisma.courseProgress.findMany({
            select: {
                userId: true,
                courseId: true,
                currentLessonId: true,
                user: {
                    select: {
                        name: true,
                        username: true
                    }
                },
                course: {
                    select: {
                        title: true
                    }
                },
                currentLesson: {
                    select: {
                        title: true,
                        videoUrl: true,
                        orderIndex: true
                    }
                }
            },
            take: 3
        });

        if (courseProgress.length === 0) {
            console.log('❌ No student progress found');
        } else {
            console.log(`✅ Found ${courseProgress.length} student progress record(s):`);
            courseProgress.forEach(progress => {
                console.log(`   - Student: ${progress.user.name} (${progress.user.username})`);
                console.log(`     Course: ${progress.course.title}`);
                if (progress.currentLesson) {
                    console.log(`     Current Lesson: ${progress.currentLesson.orderIndex}. ${progress.currentLesson.title}`);
                    console.log(`     Video URL: ${progress.currentLesson.videoUrl || 'none'}`);
                } else {
                    console.log(`     Current Lesson: none (ID: ${progress.currentLessonId})`);
                }
                console.log('');
            });
        }

        // 5. DIAGNOSIS AND RECOMMENDATIONS
        console.log('🔧 DIAGNOSIS AND RECOMMENDATIONS:\n');

        if (mediaVideos.length === 0) {
            console.log('❌ PROBLEM: No videos uploaded to system');
            console.log('   SOLUTION: Upload videos via admin panel (/admin)');
            console.log('');
        }

        if (mediaVideos.length > 0 && lessonsWithVideos.length === 0) {
            console.log('❌ PROBLEM: Videos exist but no lessons reference them');
            console.log('   SOLUTION: Update lesson videoUrl to format: /api/media/{mediaId}');
            console.log('');

            // Suggest specific connections
            if (lessonsWithoutVideos.length > 0 && mediaVideos.length > 0) {
                console.log('💡 SPECIFIC SUGGESTIONS:');
                const suggestionsCount = Math.min(3, lessonsWithoutVideos.length, mediaVideos.length);
                for (let i = 0; i < suggestionsCount; i++) {
                    const lesson = lessonsWithoutVideos[i];
                    const media = mediaVideos[i];
                    console.log(`   - Link "${media.filename}" to "${lesson.title}"`);
                    console.log(`     UPDATE "Lesson" SET "videoUrl" = '/api/media/${media.id}' WHERE id = ${lesson.id};`);
                }
                console.log('');
            }
        }

        if (lessonsWithVideos.length > 0) {
            console.log('✅ VIDEOS ARE LINKED: Check student learning page now');
            console.log('   - Go to: http://localhost:3001/learning');
            console.log('   - Check browser console for any errors');
            console.log('');
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

investigateVideoConnections();