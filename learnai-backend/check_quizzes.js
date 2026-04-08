import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkQuizzes() {
  try {
    // Get all quiz lessons
    const quizzes = await prisma.lesson.findMany({
      where: { type: "quiz" },
      select: {
        id: true,
        title: true,
        type: true,
        content: true,
        courseId: true,
        orderIndex: true,
        course: { select: { title: true } }
      }
    });

    console.log(`\n📊 Found ${quizzes.length} quiz lessons:\n`);
    
    quizzes.forEach((q) => {
      console.log(`ID: ${q.id} | Course: ${q.course.title} | Title: ${q.title}`);
      console.log(`  Type: ${q.type} | Order: ${q.orderIndex}`);
      console.log(`  Content Length: ${q.content?.length || 0} chars`);
      if (q.content) {
        try {
          const parsed = JSON.parse(q.content);
          console.log(`  Questions: ${Array.isArray(parsed) ? parsed.length : parsed.questions?.length || 0}`);
        } catch (e) {
          console.log(`  ❌ Invalid JSON content`);
        }
      }
      console.log();
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkQuizzes();
