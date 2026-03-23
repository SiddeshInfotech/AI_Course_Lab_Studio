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

const inputOutputMappings = [
  { inputType: "Text", outputType: "Text", tools: ["ChatGPT", "Gemini", "Perplexity", "Claude AI", "DeepSeek", "Notion", "Quillbot", "Elicit", "Smodin", "Genspark"] },
  { inputType: "Text", outputType: "Audio", tools: ["Suno", "MicMonster", "ElevenLabs"] },
  { inputType: "Text", outputType: "Image", tools: ["Ideogram", "Freepik", "Leonardo.AI", "Microsoft Designer", "Krea", "OpenArt", "Playground AI"] },
  { inputType: "Text", outputType: "Video", tools: ["InVideo", "Imagine Art", "Hedra", "Google Veo", "Kapwing", "Kling AI", "Synthesia AI", "HeyGen", "Colossyan", "Hailuo"] },
  { inputType: "Text", outputType: "Animation", tools: ["Animaker", "Meshy", "Tripo"] },
  { inputType: "Text", outputType: "Graphics", tools: ["Canva", "Napin AI", "Manus AI", "Julius AI"] },
  { inputType: "Image", outputType: "Image", tools: ["OpenArt", "Leonardo.AI", "Freepik", "Krea", "LullabyInk"] },
  { inputType: "Image", outputType: "Video", tools: ["RunwayML", "Hailuo"] },
  { inputType: "Image", outputType: "Text", tools: ["Google Lens", "ChatGPT"] },
  { inputType: "Image", outputType: "Animation", tools: ["Meshy", "Tripo"] },
  { inputType: "Audio", outputType: "Text", tools: ["Suno", "Bhashini", "Google Docs Voice Typing", "Descript", "Otter.ai", "HappyScribe"] },
  { inputType: "Audio", outputType: "Audio", tools: ["Adobe Podcast", "Bhashini"] },
  { inputType: "Audio", outputType: "Image", tools: ["Insta3D"] },
  { inputType: "Video", outputType: "Video", tools: ["Wisecut", "Nolej"] },
  { inputType: "Video", outputType: "Text", tools: ["Descript", "Otter.ai", "HappyScribe"] },
  { inputType: "Video", outputType: "Animation", tools: ["DomoAI"] },
];

async function main() {
  console.log("🌱 Starting database seed...\n");

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

  // Seed AI tools
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

  for (const tool of tools) {
    const imageUrl = toolLogoUrls[tool.name] || null;
    await prisma.tool.upsert({
      where: { id: tools.indexOf(tool) + 1 },
      update: {
        name: tool.name,
        description: tool.description,
        category: tool.category,
        websiteUrl: tool.websiteUrl,
        imageUrl: imageUrl,
        isPremium: tool.isPremium,
      },
      create: {
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

  // Create sample courses
  const course1 = await prisma.course.create({
    data: {
      title: "Introduction to AI",
      description: "Learn the fundamentals of Artificial Intelligence",
      category: "AI Basics",
      level: "beginner",
      instructor: "Dr. Jane Smith",
      duration: "4 weeks",
      imageUrl: null,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      title: "Machine Learning Fundamentals",
      description: "Master the basics of machine learning algorithms",
      category: "ML",
      level: "intermediate",
      instructor: "Prof. John Doe",
      duration: "6 weeks",
      imageUrl: null,
    },
  });

  const course3 = await prisma.course.create({
    data: {
      title: "Deep Learning with Python",
      description: "Build neural networks from scratch",
      category: "Deep Learning",
      level: "advanced",
      instructor: "Dr. Sarah Johnson",
      duration: "8 weeks",
      imageUrl: null,
    },
  });

  console.log("✅ Created 3 sample courses");

  // Create detailed lessons for course1 (Introduction to AI) with sections and types
  const course1Lessons = [
    // Day 1: Foundations of Neural Networks
    {
      courseId: course1.id,
      title: "Introduction to Artificial Intelligence",
      description: "Understand the fundamentals of AI and its impact on modern technology",
      content: "Artificial Intelligence (AI) is the simulation of human intelligence processes by machines...",
      videoUrl: "https://www.youtube.com/watch?v=ad79nYk2keg",
      orderIndex: 1,
      duration: "45 min",
      section: "Day 1",
      sectionTitle: "Foundations of Neural Networks",
      type: "video",
      objectives: JSON.stringify([
        "Define artificial intelligence and its core concepts",
        "Understand the difference between AI, ML, and Deep Learning",
        "Identify real-world applications of AI"
      ])
    },
    {
      courseId: course1.id,
      title: "History and Evolution of AI",
      description: "Explore the timeline of AI development from its inception to today",
      content: "The history of AI dates back to the 1950s when Alan Turing proposed the Turing Test...",
      orderIndex: 2,
      duration: "30 min",
      section: "Day 1",
      sectionTitle: "Foundations of Neural Networks",
      type: "reading",
      objectives: JSON.stringify([
        "Trace the evolution of AI from 1950s to present",
        "Identify key milestones in AI development",
        "Understand AI winters and their causes"
      ])
    },
    {
      courseId: course1.id,
      title: "AI Fundamentals Quiz",
      description: "Test your understanding of AI basics",
      orderIndex: 3,
      duration: "15 min",
      section: "Day 1",
      sectionTitle: "Foundations of Neural Networks",
      type: "quiz",
      objectives: JSON.stringify([
        "Assess knowledge of AI fundamentals",
        "Reinforce key concepts learned"
      ])
    },
    // Day 2: Neural Network Architecture
    {
      courseId: course1.id,
      title: "Types of AI Systems",
      description: "Learn about different categories of AI: Narrow AI, General AI, and Super AI",
      content: "AI systems can be categorized based on their capabilities and functionalities...",
      videoUrl: "https://www.youtube.com/watch?v=mJeNghZXtMo",
      orderIndex: 4,
      duration: "40 min",
      section: "Day 2",
      sectionTitle: "Neural Network Architecture",
      type: "video",
      objectives: JSON.stringify([
        "Distinguish between Narrow AI and General AI",
        "Understand current AI capabilities and limitations",
        "Explore examples of each AI type"
      ])
    },
    {
      courseId: course1.id,
      title: "Machine Learning Basics",
      description: "Introduction to machine learning and its relationship with AI",
      content: "Machine Learning is a subset of AI that enables systems to learn from data...",
      orderIndex: 5,
      duration: "35 min",
      section: "Day 2",
      sectionTitle: "Neural Network Architecture",
      type: "reading",
      objectives: JSON.stringify([
        "Define machine learning and its types",
        "Understand supervised vs unsupervised learning",
        "Learn about training data and algorithms"
      ])
    },
    {
      courseId: course1.id,
      title: "Hands-on: Build Your First AI Model",
      description: "Practical exercise to create a simple AI classification model",
      orderIndex: 6,
      duration: "60 min",
      section: "Day 2",
      sectionTitle: "Neural Network Architecture",
      type: "exercise",
      objectives: JSON.stringify([
        "Set up a Python environment for AI",
        "Build a basic classification model",
        "Train and evaluate the model"
      ])
    },
    // Day 3: Advanced Concepts
    {
      courseId: course1.id,
      title: "Deep Learning and Neural Networks",
      description: "Dive into neural networks and deep learning architectures",
      content: "Deep learning uses artificial neural networks with multiple layers...",
      videoUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
      orderIndex: 7,
      duration: "50 min",
      section: "Day 3",
      sectionTitle: "Deep Learning Fundamentals",
      type: "video",
      objectives: JSON.stringify([
        "Understand neural network structure",
        "Learn about layers, neurons, and weights",
        "Explore activation functions"
      ])
    },
    {
      courseId: course1.id,
      title: "AI Ethics and Responsible AI",
      description: "Explore ethical considerations in AI development and deployment",
      content: "As AI becomes more powerful, ethical considerations become crucial...",
      orderIndex: 8,
      duration: "25 min",
      section: "Day 3",
      sectionTitle: "Deep Learning Fundamentals",
      type: "reading",
      objectives: JSON.stringify([
        "Identify ethical challenges in AI",
        "Understand bias in AI systems",
        "Learn about responsible AI practices"
      ])
    },
    {
      courseId: course1.id,
      title: "Final Assessment",
      description: "Comprehensive quiz covering all course material",
      orderIndex: 9,
      duration: "30 min",
      section: "Day 3",
      sectionTitle: "Deep Learning Fundamentals",
      type: "quiz",
      objectives: JSON.stringify([
        "Demonstrate mastery of AI concepts",
        "Apply knowledge to practical scenarios"
      ])
    }
  ];

  // Create lessons for course1
  for (const lessonData of course1Lessons) {
    await prisma.lesson.create({ data: lessonData });
  }

  // Create simpler lessons for course2 and course3
  await prisma.lesson.createMany({
    data: [
      {
        courseId: course2.id,
        title: "ML Basics",
        description: "Introduction to Machine Learning",
        orderIndex: 1,
        duration: "40 min",
        section: "Week 1",
        sectionTitle: "Introduction to ML",
        type: "video",
        objectives: JSON.stringify(["Understand ML fundamentals", "Learn about algorithms"])
      },
      {
        courseId: course2.id,
        title: "Supervised Learning",
        description: "Understanding supervised learning",
        orderIndex: 2,
        duration: "45 min",
        section: "Week 1",
        sectionTitle: "Introduction to ML",
        type: "video",
        objectives: JSON.stringify(["Master supervised learning", "Build classification models"])
      },
      {
        courseId: course3.id,
        title: "Neural Networks",
        description: "Introduction to neural networks",
        orderIndex: 1,
        duration: "50 min",
        section: "Module 1",
        sectionTitle: "Neural Network Basics",
        type: "video",
        objectives: JSON.stringify(["Build neural networks", "Understand backpropagation"])
      },
    ],
  });

  console.log("✅ Created lessons for courses with sections, types, and objectives");

  // Enroll student in courses
  await prisma.enrollment.createMany({
    data: [
      { userId: student.id, courseId: course1.id },
      { userId: student.id, courseId: course2.id },
      { userId: student.id, courseId: course3.id },
    ],
  });

  console.log("✅ Enrolled student in courses");

  // Get all lessons for progress tracking
  const allLessons = await prisma.lesson.findMany({
    where: {
      courseId: { in: [course1.id, course2.id, course3.id] }
    },
    orderBy: { orderIndex: 'asc' }
  });

  // Create course progress (2 completed, 1 in progress)
  await prisma.courseProgress.create({
    data: {
      userId: student.id,
      courseId: course1.id,
      currentLessonId: 3,
      completed: false, // In progress - only 2 out of 9 lessons completed
    },
  });

  await prisma.courseProgress.create({
    data: {
      userId: student.id,
      courseId: course2.id,
      currentLessonId: 2,
      completed: true,
      completedAt: new Date(),
    },
  });

  await prisma.courseProgress.create({
    data: {
      userId: student.id,
      courseId: course3.id,
      currentLessonId: 1,
      completed: true,
      completedAt: new Date(),
    },
  });

  console.log("✅ Created course progress records");

  // Create lesson progress for course1 (first 2 lessons completed, currently on 3rd)
  const course1LessonsInDb = allLessons.filter(l => l.courseId === course1.id);

  // Mark first 2 lessons as completed
  if (course1LessonsInDb.length >= 2) {
    await prisma.lessonProgress.create({
      data: {
        userId: student.id,
        lessonId: course1LessonsInDb[0].id,
        courseId: course1.id,
        completed: true,
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    });

    await prisma.lessonProgress.create({
      data: {
        userId: student.id,
        lessonId: course1LessonsInDb[1].id,
        courseId: course1.id,
        completed: true,
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
    });
  }

  // Mark all lessons in course2 and course3 as completed since those courses are done
  const course2LessonsInDb = allLessons.filter(l => l.courseId === course2.id);
  const course3LessonsInDb = allLessons.filter(l => l.courseId === course3.id);

  for (const lesson of [...course2LessonsInDb, ...course3LessonsInDb]) {
    await prisma.lessonProgress.create({
      data: {
        userId: student.id,
        lessonId: lesson.id,
        courseId: lesson.courseId,
        completed: true,
        completedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last week
      },
    });
  }

  console.log("✅ Created lesson progress records (2/9 for course1, all for course2 & course3)");

  // Create daily usage for streak (5 consecutive days)
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    await prisma.dailyUsage.upsert({
      where: {
        userId_date: {
          userId: student.id,
          date: date,
        },
      },
      update: {
        totalSeconds: 3600 + Math.floor(Math.random() * 3600),
        lastHeartbeat: new Date(),
      },
      create: {
        userId: student.id,
        date: date,
        totalSeconds: 3600 + Math.floor(Math.random() * 3600),
        lastHeartbeat: new Date(),
      },
    });
  }

  console.log("✅ Created 5 days of usage streak");

  // Create input-output mappings as metadata stored with tools
  for (const mapping of inputOutputMappings) {
    console.log(`📦 Mapping: ${mapping.inputType} → ${mapping.outputType}: ${mapping.tools.length} tools`);
  }

  console.log("\n🎉 Database seeding completed!");
  console.log("\n📋 Login Credentials:");
  console.log("   Admin - Username: admin, Password: admin123");
  console.log("   Student - Username: student, Password: student123");
  console.log("\n📊 Test Student Stats:");
  console.log("   - 5-day streak");
  console.log("   - 3 courses enrolled");
  console.log("   - 2 courses completed (course2 & course3)");
  console.log("   - 1 course in progress (course1: 2/9 lessons completed)");
  console.log("   - Total: 12 lessons across all courses");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
