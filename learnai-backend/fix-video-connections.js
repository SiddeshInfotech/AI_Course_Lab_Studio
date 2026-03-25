import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixVideoConnections() {
    console.log('🔧 FIXING COURSE-LESSON-MEDIA CONNECTIONS\n');

    try {
        // 1. Find media files linked to lessons but lessons don't have videoUrl
        const mediaWithLessonLinks = await prisma.media.findMany({
            where: {
                entityType: 'lesson',
                entityId: { not: null },
                mimeType: { startsWith: 'video/' }
            },
            select: {
                id: true,
                filename: true,
                entityId: true,
                mimeType: true,
                size: true
            }
        });

        if (mediaWithLessonLinks.length === 0) {
            console.log('❌ No media files are linked to lessons');
            return;
        }

        console.log(`✅ Found ${mediaWithLessonLinks.length} media file(s) linked to lessons:`);

        for (const media of mediaWithLessonLinks) {
            const lessonId = media.entityId;
            console.log(`\n📹 Processing: ${media.filename} (Media ID: ${media.id})`);
            console.log(`   Linked to Lesson ID: ${lessonId}`);

            // Check if lesson exists
            const lesson = await prisma.lesson.findUnique({
                where: { id: lessonId },
                select: {
                    id: true,
                    title: true,
                    videoUrl: true,
                    orderIndex: true,
                    course: { select: { title: true } }
                }
            });

            if (!lesson) {
                console.log(`   ❌ Lesson ID ${lessonId} not found in database`);
                continue;
            }

            console.log(`   📚 Lesson: ${lesson.course.title} #${lesson.orderIndex} - ${lesson.title}`);
            console.log(`   Current videoUrl: ${lesson.videoUrl || 'none'}`);

            const expectedVideoUrl = `/api/media/${media.id}`;

            if (lesson.videoUrl === expectedVideoUrl) {
                console.log(`   ✅ Already correctly linked`);
            } else {
                // Update the lesson's videoUrl
                console.log(`   🔄 Updating videoUrl to: ${expectedVideoUrl}`);

                const updatedLesson = await prisma.lesson.update({
                    where: { id: lessonId },
                    data: { videoUrl: expectedVideoUrl }
                });

                console.log(`   ✅ Successfully updated lesson ${lessonId}`);
            }
        }

        // 2. Verify the fixes
        console.log('\n📊 VERIFICATION - Lessons with videos after fix:');
        const lessonsWithVideos = await prisma.lesson.findMany({
            where: {
                videoUrl: { not: null }
            },
            select: {
                id: true,
                title: true,
                videoUrl: true,
                orderIndex: true,
                course: { select: { title: true } }
            },
            orderBy: [
                { courseId: 'asc' },
                { orderIndex: 'asc' }
            ]
        });

        if (lessonsWithVideos.length === 0) {
            console.log('❌ Still no lessons with videos found');
        } else {
            console.log(`✅ Now ${lessonsWithVideos.length} lesson(s) have videos:`);
            lessonsWithVideos.forEach(lesson => {
                console.log(`   - ${lesson.course.title} #${lesson.orderIndex}: ${lesson.title}`);
                console.log(`     Video: ${lesson.videoUrl}`);
            });
        }

        // 3. Check if any students have these lessons as current
        console.log('\n👥 CHECKING STUDENT PROGRESS:');
        const studentsOnVideoLessons = await prisma.courseProgress.findMany({
            where: {
                currentLessonId: {
                    in: lessonsWithVideos.map(l => l.id)
                }
            },
            select: {
                user: { select: { name: true, username: true } },
                course: { select: { title: true } },
                currentLessonId: true
            }
        });

        if (studentsOnVideoLessons.length === 0) {
            console.log('ℹ️  No students currently on lessons with videos');

            // Set first lesson with video as current for testing
            if (lessonsWithVideos.length > 0) {
                const firstVideoLesson = lessonsWithVideos[0];
                console.log(`\n🎯 SETTING UP TEST: Making lesson "${firstVideoLesson.title}" current for all enrolled students`);

                const courseEnrollments = await prisma.enrollment.findMany({
                    where: { courseId: firstVideoLesson.course.title === 'Complete AI Tools Mastery: 50 Essential Tools' ? 6 : undefined },
                    select: { userId: true }
                });

                for (const enrollment of courseEnrollments) {
                    await prisma.courseProgress.upsert({
                        where: {
                            userId_courseId: {
                                userId: enrollment.userId,
                                courseId: 6 // Complete AI Tools Mastery course ID
                            }
                        },
                        create: {
                            userId: enrollment.userId,
                            courseId: 6,
                            currentLessonId: firstVideoLesson.id,
                            completed: false
                        },
                        update: {
                            currentLessonId: firstVideoLesson.id
                        }
                    });
                }

                console.log(`✅ Set ${courseEnrollments.length} student(s) to lesson with video`);
            }
        } else {
            console.log(`✅ ${studentsOnVideoLessons.length} student(s) are on lessons with videos:`);
            studentsOnVideoLessons.forEach(progress => {
                const lesson = lessonsWithVideos.find(l => l.id === progress.currentLessonId);
                console.log(`   - ${progress.user.name}: ${lesson?.title}`);
            });
        }

        console.log('\n🎉 FIXES COMPLETE!');
        console.log('🔗 Next steps:');
        console.log('   1. Go to http://localhost:3001/learning');
        console.log('   2. Login and check if video appears');
        console.log('   3. You should see the ChatGPT lesson with video player');

    } catch (error) {
        console.error('❌ Error fixing connections:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixVideoConnections();