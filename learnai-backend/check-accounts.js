import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTestAccounts() {
    try {
        console.log('👥 AVAILABLE TEST ACCOUNTS:\n');

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                isAdmin: true,
                enrollments: {
                    select: {
                        course: { select: { title: true } }
                    }
                }
            },
            orderBy: { id: 'asc' }
        });

        users.forEach(user => {
            console.log(`${user.isAdmin ? '👑 ADMIN' : '🎓 STUDENT'}: ${user.name} (${user.username})`);
            console.log(`   Email: ${user.email || 'not set'}`);
            if (user.enrollments.length > 0) {
                console.log(`   Enrolled in: ${user.enrollments.map(e => e.course.title).join(', ')}`);
            } else {
                console.log(`   Enrolled in: none`);
            }
            console.log('');
        });

        console.log('🔑 LOGIN CREDENTIALS:');
        console.log('   - Default password is usually "password123" or "admin123"');
        console.log('   - Try these combinations on the login page');
        console.log('');

        console.log('🎯 FOR TESTING VIDEO:');
        console.log('   1. Use any student account enrolled in "Complete AI Tools Mastery" course');
        console.log('   2. Login at: http://localhost:3001');
        console.log('   3. Go to: http://localhost:3001/learning');
        console.log('   4. You should see the ChatGPT lesson with video player');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkTestAccounts();