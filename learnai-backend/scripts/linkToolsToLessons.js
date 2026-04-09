import prisma from "../config/db.js";

async function linkToolsToLessons() {
  console.log("🔍 Fetching all tools...");
  const tools = await prisma.tool.findMany();
  console.log(`Found ${tools.length} tools`);

  console.log("🔍 Fetching all lessons...");
  const lessons = await prisma.lesson.findMany();
  console.log(`Found ${lessons.length} lessons`);

  let linkedCount = 0;
  let noMatchCount = 0;

  for (const lesson of lessons) {
    let matchedTool = null;

    for (const tool of tools) {
      const toolNameLower = tool.name.toLowerCase();
      const lessonTitleLower = lesson.title.toLowerCase();

      if (lessonTitleLower.includes(toolNameLower)) {
        matchedTool = tool;
        break;
      }
    }

    if (matchedTool) {
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { toolId: matchedTool.id },
      });
      console.log(`✅ Linked lesson "${lesson.title}" to tool "${matchedTool.name}"`);
      linkedCount++;
    } else {
      console.log(`❌ No match found for lesson: "${lesson.title}"`);
      noMatchCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   - Linked: ${linkedCount}`);
  console.log(`   - No match: ${noMatchCount}`);
}

linkToolsToLessons()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
