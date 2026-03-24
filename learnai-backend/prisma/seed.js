import bcrypt from "bcrypt";
import prisma from "../config/db.js";

const tools = [
  { name: "ChatGPT", description: "Advanced AI assistant for text generation, analysis, and conversation", category: "Text", websiteUrl: "https://chatgpt.com", inputType: "Text", outputType: "Text", isPremium: false },
  { name: "Gemini", description: "Google's multimodal AI for text, images, and code", category: "Text", websiteUrl: "https://gemini.google.com", inputType: "Text", outputType: "Text", isPremium: false },
  { name: "Perplexity", description: "AI-powered search engine with real-time web access", category: "Text", websiteUrl: "https://perplexity.ai", inputType: "Text", outputType: "Text", isPremium: false },
  { name: "Claude AI", description: "Anthropic's helpful, harmless, and honest AI assistant", category: "Text", websiteUrl: "https://claude.ai", inputType: "Text", outputType: "Text", isPremium: false },
  { name: "DeepSeek", description: "Advanced reasoning and coding AI from China", category: "Text", websiteUrl: "https://deepseek.com", inputType: "Text", outputType: "Text", isPremium: false },
  { name: "Notion", description: "AI-powered workspace for notes, docs, and collaboration", category: "Text", websiteUrl: "https://notion.so", inputType: "Text", outputType: "Text", isPremium: false },
  { name: "Quillbot", description: "AI writing assistant for paraphrasing and grammar", category: "Text", websiteUrl: "https://quillbot.com", inputType: "Text", outputType: "Text", isPremium: false },
  { name: "Elicit", description: "AI research assistant for literature review and analysis", category: "Text", websiteUrl: "https://elicit.com", inputType: "Text", outputType: "Text", isPremium: false },
  { name: "Smodin", description: "AI writing tool for essays, articles, and academic work", category: "Text", websiteUrl: "https://smodin.io", inputType: "Text", outputType: "Text", isPremium: false },
  { name: "Genspark", description: "AI search engine with deep research capabilities", category: "Text", websiteUrl: "https://genspark.ai", inputType: "Text", outputType: "Text", isPremium: false },

  { name: "Suno", description: "AI music generation from text prompts", category: "Audio", websiteUrl: "https://suno.com", inputType: "Text", outputType: "Audio", isPremium: false },
  { name: "MicMonster", description: "AI voiceover and narration generator", category: "Audio", websiteUrl: "https://micmonster.com", inputType: "Text", outputType: "Audio", isPremium: false },
  { name: "ElevenLabs", description: "Realistic AI voice synthesis and cloning", category: "Audio", websiteUrl: "https://elevenlabs.io", inputType: "Text", outputType: "Audio", isPremium: false },

  { name: "Ideogram", description: "AI image generation with text rendering", category: "Image", websiteUrl: "https://ideogram.ai", inputType: "Text", outputType: "Image", isPremium: false },
  { name: "Freepik", description: "AI image generator with design templates", category: "Image", websiteUrl: "https://freepik.com", inputType: "Text", outputType: "Image", isPremium: false },
  { name: "Leonardo.AI", description: "Game art and creative asset AI generator", category: "Image", websiteUrl: "https://leonardo.ai", inputType: "Text", outputType: "Image", isPremium: false },
  { name: "Microsoft Designer", description: "AI-powered graphic design tool", category: "Image", websiteUrl: "https://designer.microsoft.com", inputType: "Text", outputType: "Image", isPremium: false },

  { name: "InVideo", description: "AI video creation from text prompts", category: "Video", websiteUrl: "https://invideo.io", inputType: "Text", outputType: "Video", isPremium: false },
  { name: "Imagine Art", description: "AI art and video generation platform", category: "Video", websiteUrl: "https://imagine.art", inputType: "Text", outputType: "Video", isPremium: false },
  { name: "Hedra", description: "AI video with realistic AI avatars", category: "Video", websiteUrl: "https://hedra.com", inputType: "Text", outputType: "Video", isPremium: false },
  { name: "Google Veo", description: "Google's video generation AI", category: "Video", websiteUrl: "https://deepmind.google/veo", inputType: "Text", outputType: "Video", isPremium: false },
  { name: "Kapwing", description: "Online video editor with AI features", category: "Video", websiteUrl: "https://kapwing.com", inputType: "Text", outputType: "Video", isPremium: false },
  { name: "Kling AI", description: "ByteDance's video generation AI", category: "Video", websiteUrl: "https://klingai.com", inputType: "Text", outputType: "Video", isPremium: false },
  { name: "Synthesia AI", description: "Professional AI video with avatars", category: "Video", websiteUrl: "https://synthesia.io", inputType: "Text", outputType: "Video", isPremium: false },
  { name: "HeyGen", description: "AI video generation with talking avatars", category: "Video", websiteUrl: "https://heygen.com", inputType: "Text", outputType: "Video", isPremium: false },
  { name: "Colossyan", description: "AI video creator with avatars", category: "Video", websiteUrl: "https://colossyan.com", inputType: "Text", outputType: "Video", isPremium: false },
  { name: "Hailuo", description: "MiniMax's AI video generator", category: "Video", websiteUrl: "https://hailuoai.video", inputType: "Text", outputType: "Video", isPremium: false },

  { name: "Animaker", description: "AI-powered animated video maker", category: "Animation", websiteUrl: "https://animaker.com", inputType: "Text", outputType: "Animation", isPremium: false },
  { name: "Meshy", description: "AI 3D model and animation generator", category: "Animation", websiteUrl: "https://meshy.ai", inputType: "Text", outputType: "Animation", isPremium: false },
  { name: "Tripo", description: "AI 3D object creation from images", category: "Animation", websiteUrl: "https://tripo3d.ai", inputType: "Text", outputType: "Animation", isPremium: false },

  { name: "Canva", description: "Design platform with AI features", category: "Graphics", websiteUrl: "https://canva.com", inputType: "Text", outputType: "Graphics", isPremium: false },
  { name: "Napin AI", description: "AI infographic and visual content creator", category: "Graphics", websiteUrl: "https://napkin.ai", inputType: "Text", outputType: "Graphics", isPremium: false },
  { name: "Playground AI", description: "Free AI image and art generator", category: "Image", websiteUrl: "https://playgroundai.com", inputType: "Text", outputType: "Image", isPremium: false },
  { name: "Manus AI", description: "General AI agent for complex tasks", category: "Graphics", websiteUrl: "https://manus.ai", inputType: "Text", outputType: "Graphics", isPremium: false },
  { name: "Julius AI", description: "AI data analysis and visualization", category: "Graphics", websiteUrl: "https://julius.ai", inputType: "Text", outputType: "Graphics", isPremium: false },

  { name: "OpenArt", description: "AI art generator with style controls", category: "Image", websiteUrl: "https://openart.ai", inputType: "Image", outputType: "Image", isPremium: false },
  { name: "RunwayML", description: "AI video editing and generation platform", category: "Video", websiteUrl: "https://runwayml.com", inputType: "Image", outputType: "Video", isPremium: false },
  { name: "Google Lens", description: "Visual search and image recognition", category: "Text", websiteUrl: "https://lens.google.com", inputType: "Image", outputType: "Text", isPremium: false },

  { name: "Adobe Podcast", description: "AI-powered podcast editing and enhancement", category: "Audio", websiteUrl: "https://podcast.adobe.com", inputType: "Audio", outputType: "Audio", isPremium: false },
  { name: "Bhashini", description: "India's AI translation and voice service", category: "Audio", websiteUrl: "https://bhashini.gov.in", inputType: "Audio", outputType: "Audio", isPremium: false },
  { name: "Insta3D", description: "AI 3D model generation from images", category: "Image", websiteUrl: "https://insta3d.io", inputType: "Audio", outputType: "Image", isPremium: false },

  { name: "Wisecut", description: "AI video editing with auto-cuts and captions", category: "Video", websiteUrl: "https://wisecut.video", inputType: "Video", outputType: "Video", isPremium: false },
  { name: "Descript", description: "All-in-one video and podcast editor with AI", category: "Text", websiteUrl: "https://descript.com", inputType: "Video", outputType: "Text", isPremium: false },
  { name: "Otter.ai", description: "AI meeting transcription and notes", category: "Text", websiteUrl: "https://otter.ai", inputType: "Audio", outputType: "Text", isPremium: false },
  { name: "HappyScribe", description: "AI transcription and subtitle services", category: "Text", websiteUrl: "https://happyscribe.com", inputType: "Video", outputType: "Text", isPremium: false },
  { name: "DomoAI", description: "AI video to different styles converter", category: "Animation", websiteUrl: "https://domoai.app", inputType: "Video", outputType: "Animation", isPremium: false },

  { name: "Krea", description: "AI tool for visual creation and style transfer", category: "Image", websiteUrl: "https://krea.ai", inputType: "Text", outputType: "Image", isPremium: false },
  { name: "LullabyInk", description: "AI illustration and book art generator", category: "Image", websiteUrl: "https://lullabyink.com", inputType: "Image", outputType: "Image", isPremium: false },

  { name: "Nolej", description: "AI tool for creating interactive video content", category: "Video", websiteUrl: "https://nolej.io", inputType: "Video", outputType: "Video", isPremium: false },
  { name: "Google Docs Voice Typing", description: "Free speech-to-text in Google Docs", category: "Text", websiteUrl: "https://docs.google.com", inputType: "Audio", outputType: "Text", isPremium: false },
];

const toolLogoUrls = {
  "ChatGPT": "https://www.google.com/s2/favicons?domain=chatgpt.com&sz=64",
  "Gemini": "https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64",
  "Perplexity": "https://www.google.com/s2/favicons?domain=perplexity.ai&sz=64",
  "Claude AI": "https://www.google.com/s2/favicons?domain=claude.ai&sz=64",
  "DeepSeek": "https://www.google.com/s2/favicons?domain=deepseek.com&sz=64",
  "Notion": "https://www.google.com/s2/favicons?domain=notion.so&sz=64",
  "Quillbot": "https://www.google.com/s2/favicons?domain=quillbot.com&sz=64",
  "Elicit": "https://www.google.com/s2/favicons?domain=elicit.com&sz=64",
  "Smodin": "https://www.google.com/s2/favicons?domain=smodin.io&sz=64",
  "Genspark": "https://www.google.com/s2/favicons?domain=genspark.ai&sz=64",
  "Suno": "https://www.google.com/s2/favicons?domain=suno.com&sz=64",
  "MicMonster": "https://www.google.com/s2/favicons?domain=micmonster.com&sz=64",
  "ElevenLabs": "https://www.google.com/s2/favicons?domain=elevenlabs.io&sz=64",
  "Ideogram": "https://www.google.com/s2/favicons?domain=ideogram.ai&sz=64",
  "Freepik": "https://www.google.com/s2/favicons?domain=freepik.com&sz=64",
  "Leonardo.AI": "https://www.google.com/s2/favicons?domain=leonardo.ai&sz=64",
  "Microsoft Designer": "https://www.google.com/s2/favicons?domain=microsoft.com&sz=64",
  "InVideo": "https://www.google.com/s2/favicons?domain=invideo.io&sz=64",
  "Imagine Art": "https://www.google.com/s2/favicons?domain=imagine.art&sz=64",
  "Hedra": "https://www.google.com/s2/favicons?domain=hedra.com&sz=64",
  "Google Veo": "https://www.google.com/s2/favicons?domain=deepmind.google&sz=64",
  "Kapwing": "https://www.google.com/s2/favicons?domain=kapwing.com&sz=64",
  "Kling AI": "https://www.google.com/s2/favicons?domain=klingai.com&sz=64",
  "Synthesia AI": "https://www.google.com/s2/favicons?domain=synthesia.io&sz=64",
  "HeyGen": "https://www.google.com/s2/favicons?domain=heygen.com&sz=64",
  "Colossyan": "https://www.google.com/s2/favicons?domain=colossyan.com&sz=64",
  "Hailuo": "https://www.google.com/s2/favicons?domain=hailuoai.video&sz=64",
  "Animaker": "https://www.google.com/s2/favicons?domain=animaker.com&sz=64",
  "Meshy": "https://www.google.com/s2/favicons?domain=meshy.ai&sz=64",
  "Tripo": "https://www.google.com/s2/favicons?domain=tripo3d.ai&sz=64",
  "Canva": "https://www.google.com/s2/favicons?domain=canva.com&sz=64",
  "Napin AI": "https://www.google.com/s2/favicons?domain=napkin.ai&sz=64",
  "Playground AI": "https://www.google.com/s2/favicons?domain=playgroundai.com&sz=64",
  "Manus AI": "https://www.google.com/s2/favicons?domain=manus.ai&sz=64",
  "Julius AI": "https://www.google.com/s2/favicons?domain=julius.ai&sz=64",
  "OpenArt": "https://www.google.com/s2/favicons?domain=openart.ai&sz=64",
  "RunwayML": "https://www.google.com/s2/favicons?domain=runwayml.com&sz=64",
  "Google Lens": "https://www.google.com/s2/favicons?domain=lens.google.com&sz=64",
  "Adobe Podcast": "https://www.google.com/s2/favicons?domain=podcast.adobe.com&sz=64",
  "Bhashini": "https://www.google.com/s2/favicons?domain=bhashini.gov.in&sz=64",
  "Insta3D": "https://www.google.com/s2/favicons?domain=insta3d.io&sz=64",
  "Wisecut": "https://www.google.com/s2/favicons?domain=wisecut.video&sz=64",
  "Descript": "https://www.google.com/s2/favicons?domain=descript.com&sz=64",
  "Otter.ai": "https://www.google.com/s2/favicons?domain=otter.ai&sz=64",
  "HappyScribe": "https://www.google.com/s2/favicons?domain=happyscribe.com&sz=64",
  "DomoAI": "https://www.google.com/s2/favicons?domain=domoai.app&sz=64",
  "Krea": "https://www.google.com/s2/favicons?domain=krea.ai&sz=64",
  "LullabyInk": "https://www.google.com/s2/favicons?domain=lullabyink.com&sz=64",
  "Nolej": "https://www.google.com/s2/favicons?domain=nolej.io&sz=64",
  "Google Docs Voice Typing": "https://www.google.com/s2/favicons?domain=docs.google.com&sz=64",
};

async function main() {
  console.log("🌱 Starting database seed...\n");

  try {
    // Delete all existing data with try-catch for each table
    console.log("🗑️  Clearing deprecated data...");
    try { await prisma.lessonProgress.deleteMany({}); } catch (e) { /* table may not exist */ }
    try { await prisma.toolProgress.deleteMany({}); } catch (e) { /* table may not exist */ }
    try { await prisma.courseProgress.deleteMany({}); } catch (e) { /* table may not exist */ }
    try { await prisma.toolCourse.deleteMany({}); } catch (e) { /* table may not exist */ }
    try { await prisma.lesson.deleteMany({}); } catch (e) { /* table may not exist */ }
    try { await prisma.enrollment.deleteMany({}); } catch (e) { /* table may not exist */ }
    try { await prisma.dailyUsage.deleteMany({}); } catch (e) { /* table may not exist */ }
    try { await prisma.course.deleteMany({}); } catch (e) { /* table may not exist */ }
    try { await prisma.tool.deleteMany({}); } catch (e) { /* table may not exist */ }
    console.log("✅ Database cleaned");

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = await prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        name: "Administrator",
        username: "admin",
        email: "admin@learnai.com",
        password: adminPassword,
        isAdmin: true,
      },
    });
    console.log("✅ Admin user created:", admin.username);

    // Create a test student user
    const studentPassword = await bcrypt.hash("student123", 10);
    const student = await prisma.user.upsert({
      where: { username: "student" },
      update: {},
      create: {
        name: "Test Student",
        username: "student",
        email: "student@learnai.com",
        password: studentPassword,
        isAdmin: false,
      },
    });
    console.log("✅ Student user created:", student.username);

    // Seed all AI tools
    console.log("\n🛠️  Seeding AI tools...");
    for (const tool of tools) {
      const imageUrl = toolLogoUrls[tool.name] || null;
      await prisma.tool.create({
        data: {
          name: tool.name,
          description: tool.description,
          category: tool.category,
          websiteUrl: tool.websiteUrl,
          imageUrl: imageUrl,
          isPremium: tool.isPremium,
        },
      });
    }
    console.log(`✅ Seeded ${tools.length} AI tools`);

    // Create a sample course for demo (so learning page doesn't get stuck loading)
    console.log("\n📚 Creating comprehensive AI tools mastery course...");
    const sampleCourse = await prisma.course.create({
      data: {
        title: "Complete AI Tools Mastery: 50 Essential Tools",
        description: "Master all 50 AI tools in our comprehensive platform. Learn from ChatGPT to Ideogram, covering Text, Audio, Image, Video, Animation, and Graphics AI tools. 50-day intensive course.",
        category: "AI Tools Mastery",
        level: "beginner",
        instructor: "AI Expert",
        duration: "50 days",
      },
    });
    console.log("✅ Master course created:", sampleCourse.title);

    // Link image generation tools to the course
    const imageTools = ["Ideogram", "Freepik", "Leonardo.AI", "OpenArt"];
    for (let i = 0; i < imageTools.length; i++) {
      const tool = await prisma.tool.findUnique({ where: { name: imageTools[i] } });
      if (tool) {
        await prisma.toolCourse.create({
          data: {
            courseId: sampleCourse.id,
            toolId: tool.id,
            orderIndex: i + 1,
            section: `Day ${i + 1}`,
            sectionTitle: `${tool.name} - Image Generation Mastery`,
            description: `Learn how to use ${tool.name} to create professional AI-generated images from text prompts`,
            demoVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&controls=1&showinfo=0",
            isPremium: false,
          },
        });
      }
    }
    console.log("✅ Tools linked to course (Days 1-4)");

    // Create lessons for all 50 AI tools organized by Input Type → Output Type
    // CORRECT ORDER: Text→Text, Text→Image, Text→Video, Text→Audio, Text→Animation, Text→Graphics, then Image, Audio, Video inputs
    console.log("\n📖 Creating lessons in correct Input→Output sequence...");

    // Correct sequence - for each input type: Text, Image, Video, Audio, Animation, Graphics outputs
    const correctSequence = [
      // Text Input - outputs in order: Text, Image, Video, Audio, Animation, Graphics
      { input: "Text", output: "Text", tools: ["ChatGPT", "Gemini", "Perplexity", "Claude AI", "DeepSeek", "Notion", "Quillbot", "Elicit", "Smodin", "Genspark"] },
      { input: "Text", output: "Image", tools: ["Ideogram", "Freepik", "Leonardo.AI", "Microsoft Designer", "Playground AI", "Krea"] },
      { input: "Text", output: "Video", tools: ["InVideo", "Imagine Art", "Hedra", "Google Veo", "Kapwing", "Kling AI", "Synthesia AI", "HeyGen", "Colossyan", "Hailuo"] },
      { input: "Text", output: "Audio", tools: ["Suno", "MicMonster", "ElevenLabs"] },
      { input: "Text", output: "Animation", tools: ["Animaker", "Meshy", "Tripo"] },
      { input: "Text", output: "Graphics", tools: ["Canva", "Napin AI", "Manus AI", "Julius AI"] },
      // Image Input - outputs in order: Text, Image, Video, Audio, Animation, Graphics
      { input: "Image", output: "Text", tools: ["Google Lens"] },
      { input: "Image", output: "Image", tools: ["OpenArt", "LullabyInk"] },
      { input: "Image", output: "Video", tools: ["RunwayML"] },
      // Audio Input - outputs in order: Text, Image, Video, Audio, Animation, Graphics
      { input: "Audio", output: "Text", tools: ["Otter.ai", "Google Docs Voice Typing"] },
      { input: "Audio", output: "Image", tools: ["Insta3D"] },
      { input: "Audio", output: "Audio", tools: ["Adobe Podcast", "Bhashini"] },
      // Video Input - outputs in order: Text, Image, Video, Audio, Animation, Graphics
      { input: "Video", output: "Text", tools: ["Descript", "HappyScribe"] },
      { input: "Video", output: "Video", tools: ["Wisecut", "Nolej"] },
      { input: "Video", output: "Animation", tools: ["DomoAI"] },
    ];

    let dayCounter = 1;

    // Create lessons in correct sequence
    for (const mapping of correctSequence) {
      for (const toolName of mapping.tools) {
        const tool = tools.find(t => t.name === toolName);
        if (tool) {
          await prisma.lesson.create({
            data: {
              courseId: sampleCourse.id,
              title: `${tool.name}: Tutorial & Mastery Guide`,
              description: tool.description,
              content: `Master ${tool.name} - ${tool.description}. Input: ${tool.inputType} → Output: ${tool.outputType}. Learn how to leverage this AI tool to boost your productivity and creativity. Perfect for ${tool.category} tasks and workflows.`,
              videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&controls=1&showinfo=0",
              section: `Day ${dayCounter}`,
              sectionTitle: `${tool.name} (${tool.inputType}→${tool.outputType})`,
              orderIndex: dayCounter,
              type: "video",
              duration: "15-20 minutes",
              objectives: JSON.stringify([
                `Understand ${tool.name} features and capabilities`,
                `Learn the interface and navigation`,
                `Master key use cases and workflows`,
                `Create your first output with ${tool.name}`,
                `Pro tips and advanced techniques`
              ]),
            },
          });
          dayCounter++;
        }
      }
    }
    console.log(`✅ Created ${dayCounter - 1} lessons in correct Input→Output sequence`);
    // Enroll student in the sample course
    await prisma.enrollment.create({
      data: {
        userId: student.id,
        courseId: sampleCourse.id,
      },
    });
    console.log("✅ Student automatically enrolled in sample course");

    // Create course progress for student
    await prisma.courseProgress.create({
      data: {
        userId: student.id,
        courseId: sampleCourse.id,
        currentLessonId: 1,
      },
    });
    console.log("✅ Course progress initialized for student");

    console.log("\n" + "=".repeat(60));
    console.log("📋 LOGIN CREDENTIALS");
    console.log("=".repeat(60));
    console.log("Admin  - Username: admin     | Password: admin123");
    console.log("Student - Username: student   | Password: student123");
    console.log("=".repeat(60));

    console.log("\n✨ DATABASE READY FOR LEARNING");
    console.log("   - Users: Admin & Student ready");
    console.log("   - Tools: All 50 AI tools available");
    console.log("   - Master Course: 'Complete AI Tools Mastery: 50 Essential Tools'");
    console.log("   - Lessons: 50 organized by Input→Output type");
    console.log("   - Duration: 50-day intensive learning path");
    console.log("");
    console.log("   📚 LEARNING SEQUENCE:");
    console.log("      TEXT INPUT:");
    console.log("        Days 1-10:   Text→Text (ChatGPT, Gemini, etc.)");
    console.log("        Days 11-16:  Text→Image (Ideogram, Freepik, Leonardo.AI, etc.)");
    console.log("        Days 17-26:  Text→Video (InVideo, HeyGen, etc.)");
    console.log("        Days 27-29:  Text→Audio (Suno, MicMonster, ElevenLabs)");
    console.log("        Days 30-32:  Text→Animation (Animaker, Meshy, Tripo)");
    console.log("        Days 33-36:  Text→Graphics (Canva, Napin AI, etc.)");
    console.log("");
    console.log("      IMAGE INPUT:");
    console.log("        Day 37:      Image→Text (Google Lens)");
    console.log("        Days 38-39:  Image→Image (OpenArt, LullabyInk)");
    console.log("        Day 40:      Image→Video (RunwayML)");
    console.log("");
    console.log("      AUDIO INPUT:");
    console.log("        Days 41-42:  Audio→Text (Otter.ai, Google Docs Voice Typing)");
    console.log("        Day 43:      Audio→Image (Insta3D)");
    console.log("        Days 44-45:  Audio→Audio (Adobe Podcast, Bhashini)");
    console.log("");
    console.log("      VIDEO INPUT:");
    console.log("        Days 46-47:  Video→Text (Descript, HappyScribe)");
    console.log("        Days 48-49:  Video→Video (Wisecut, Nolej)");
    console.log("        Day 50:      Video→Animation (DomoAI)");
    console.log("");
    console.log("   - Learning path organized by Input type first, then Output type");
    console.log("   - Student: Auto-enrolled with full course access");
    console.log("");
  } catch (error) {
    console.error("❌ Seed error:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
