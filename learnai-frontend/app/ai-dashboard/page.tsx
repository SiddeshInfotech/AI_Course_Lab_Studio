"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Bell,
  Image as ImageIcon,
  Video,
  Mic,
  Sparkles,
  Layout,
  Type,
  CheckCircle2,
  ArrowRight,
  Flame,
  CheckCircle,
  Target,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import ProfileDropdown from "@/components/ProfileDropdown";

const TOOL_LOGOS: Record<string, string> = {
  ChatGPT: "https://www.google.com/s2/favicons?domain=chatgpt.com&sz=64",
  Gemini: "https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64",
  Perplexity: "https://www.google.com/s2/favicons?domain=perplexity.ai&sz=64",
  "Claude AI": "https://www.google.com/s2/favicons?domain=claude.ai&sz=64",
  DeepSeek: "https://www.google.com/s2/favicons?domain=deepseek.com&sz=64",
  Notion: "https://www.google.com/s2/favicons?domain=notion.so&sz=64",
  Quillbot: "https://www.google.com/s2/favicons?domain=quillbot.com&sz=64",
  Elicit: "https://www.google.com/s2/favicons?domain=elicit.com&sz=64",
  Smodin: "https://www.google.com/s2/favicons?domain=smodin.io&sz=64",
  Genspark: "https://www.google.com/s2/favicons?domain=genspark.ai&sz=64",
  Suno: "https://www.google.com/s2/favicons?domain=suno.com&sz=64",
  MicMonster: "https://www.google.com/s2/favicons?domain=micmonster.com&sz=64",
  ElevenLabs: "https://www.google.com/s2/favicons?domain=elevenlabs.io&sz=64",
  Krea: "https://www.google.com/s2/favicons?domain=krea.ai&sz=64",
  Ideogram: "https://www.google.com/s2/favicons?domain=ideogram.ai&sz=64",
  Freepik: "https://www.google.com/s2/favicons?domain=freepik.com&sz=64",
  "Leonardo.AI": "https://www.google.com/s2/favicons?domain=leonardo.ai&sz=64",
  "Google Nano Banana":
    "https://www.google.com/s2/favicons?domain=google.com&sz=64",
  "Microsoft 365":
    "https://www.google.com/s2/favicons?domain=microsoft365.com&sz=64",
  InVideo: "https://www.google.com/s2/favicons?domain=invideo.io&sz=64",
  "Imagine Art": "https://www.google.com/s2/favicons?domain=imagine.art&sz=64",
  Hedra: "https://www.google.com/s2/favicons?domain=hedra.com&sz=64",
  "Google Veo": "https://www.google.com/s2/favicons?domain=google.com&sz=64",
  Kapwing: "https://www.google.com/s2/favicons?domain=kapwing.com&sz=64",
  "Kling AI": "https://www.google.com/s2/favicons?domain=klingai.com&sz=64",
  "Synthesia AI":
    "https://www.google.com/s2/favicons?domain=synthesia.io&sz=64",
  HeyGen: "https://www.google.com/s2/favicons?domain=heygen.com&sz=64",
  Colossyan: "https://www.google.com/s2/favicons?domain=colossyan.com&sz=64",
  Hailuo: "https://www.google.com/s2/favicons?domain=hailuoai.video&sz=64",
  Animaker: "https://www.google.com/s2/favicons?domain=animaker.com&sz=64",
  Meshy: "https://www.google.com/s2/favicons?domain=meshy.ai&sz=64",
  Tripo: "https://www.google.com/s2/favicons?domain=tripo3d.ai&sz=64",
  DemoAI: "https://www.google.com/s2/favicons?domain=demoai.io&sz=64",
  Canva: "https://www.google.com/s2/favicons?domain=canva.com&sz=64",
  "Napin AI": "https://www.google.com/s2/favicons?domain=napkin.ai&sz=64",
  "Playground AI":
    "https://www.google.com/s2/favicons?domain=playgroundai.com&sz=64",
  "Manus AI": "https://www.google.com/s2/favicons?domain=manus.ai&sz=64",
  "Julius AI": "https://www.google.com/s2/favicons?domain=julius.ai&sz=64",
  OpenArt: "https://www.google.com/s2/favicons?domain=openart.ai&sz=64",
  "Leonardo AI": "https://www.google.com/s2/favicons?domain=leonardo.ai&sz=64",
  LullabyInk: "https://www.google.com/s2/favicons?domain=lullabyink.com&sz=64",
  RunwayML: "https://www.google.com/s2/favicons?domain=runwayml.com&sz=64",
  "Google Lens":
    "https://www.google.com/s2/favicons?domain=lens.google.com&sz=64",
  Insta3D: "https://www.google.com/s2/favicons?domain=insta3d.io&sz=64",
  "Adobe Podcast":
    "https://www.google.com/s2/favicons?domain=podcast.adobe.com&sz=64",
  Bhashini: "https://www.google.com/s2/favicons?domain=bhashini.gov.in&sz=64",
  "Google Doc Voice Typing":
    "https://www.google.com/s2/favicons?domain=docs.google.com&sz=64",
  Wisecut: "https://www.google.com/s2/favicons?domain=wisecut.video&sz=64",
  Nolej: "https://www.google.com/s2/favicons?domain=nolej.io&sz=64",
  Descript: "https://www.google.com/s2/favicons?domain=descript.com&sz=64",
  "Otter.ai": "https://www.google.com/s2/favicons?domain=otter.ai&sz=64",
  HappyScribe:
    "https://www.google.com/s2/favicons?domain=happyscribe.com&sz=64",
  DomoAI: "https://www.google.com/s2/favicons?domain=domoai.app&sz=64",
};

interface DashboardStats {
  streak: number;
  modulesCompleted: number;
  modulesEnrolled: number;
  accuracy: number;
}

export default function AIDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [activeOutput, setActiveOutput] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    streak: 0,
    modulesCompleted: 0,
    modulesEnrolled: 0,
    accuracy: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!isAuthenticated) return;

      try {
        setIsLoadingStats(true);
        const data = await api.dashboard.getStats();
        setStats(data.stats);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchDashboardStats();
  }, [isAuthenticated]);

  const categories = [
    { name: "Text", icon: Type },
    { name: "Image", icon: ImageIcon },
    { name: "Video", icon: Video },
    { name: "Audio", icon: Mic },
    { name: "Animation", icon: Sparkles },
    { name: "Graphics", icon: Layout },
  ];

  const toolMappings: Record<string, string[]> = {
    "Text-Text": [
      "ChatGPT",
      "Gemini",
      "Perplexity",
      "Claude AI",
      "DeepSeek",
      "Notion",
      "Quillbot",
      "Elicit",
      "Smodin",
      "Genspark",
    ],
    "Text-Audio": ["Suno", "MicMonster", "ElevenLabs"],
    "Text-Image": [
      "ChatGPT",
      "Krea",
      "Ideogram",
      "Freepik",
      "Leonardo.AI",
      "Google Nano Banana",
      "Microsoft 365",
    ],
    "Text-Video": [
      "InVideo",
      "Krea",
      "Imagine Art",
      "Hedra",
      "Google Veo",
      "Kapwing",
      "Kling AI",
      "Synthesia AI",
      "HeyGen",
      "Colossyan",
      "Hailuo",
    ],
    "Text-Animation": ["Animaker", "Krea", "Hedra", "Meshy", "Tripo", "DemoAI"],
    "Text-Graphics": [
      "ChatGPT",
      "Canva",
      "Ideogram",
      "Napin AI",
      "Playground AI",
      "Manus AI",
      "Julius AI",
    ],
    "Image-Image": [
      "OpenArt",
      "Leonardo AI",
      "Freepik",
      "Krea",
      "LullabyInk",
      "Google Nano Banana",
    ],
    "Image-Video": ["RunwayML", "Hailuo"],
    "Image-Text": ["Google Lens", "ChatGPT"],
    "Image-Graphics": ["Hedra"],
    "Image-Animation": ["Meshy", "Tripo"],
    "Audio-Text": ["Suno", "Bhashini", "Google Doc Voice Typing"],
    "Audio-Image": ["Insta3D"],
    "Audio-Audio": ["Adobe Podcast", "Bhashini"],
    "Video-Video": ["Adobe Podcast", "Wisecut", "Nolej"],
    "Video-Text": ["Descript", "Otter.ai", "Nolej", "HappyScribe"],
    "Video-Animation": ["DomoAI"],
    "Graphics-Text": ["ChatGPT"],
    "Graphics-Video": ["RunwayML"],
    "Graphics-Animation": ["Hedra"],
    "Animation-Image": [],
  };

  const currentToolNames =
    activeInput && activeOutput
      ? toolMappings[`${activeInput}-${activeOutput}`] || []
      : [];

  const masteredCount = currentToolNames.filter((_, i) => i % 3 === 0).length;

  const displayName = user?.name?.split(" ")[0] || "there";

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* ── Top Navigation Bar ── */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push("/ai-dashboard")}
          >
            <div className="relative w-40 h-10 sm:w-48 sm:h-12 md:w-56 md:h-14">
              <Image
                src="/logo.png?v=2"
                alt="Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-xl mx-8 hidden lg:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-full bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 sm:text-sm transition-all"
                placeholder="Search tools..."
              />
            </div>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/learning")}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded-full transition-colors text-sm"
            >
              <BookOpen className="w-4 h-4" />
              My Learning
            </button>
            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all hidden sm:block">
              <Bell className="w-5 h-5" />
            </button>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* ── Greeting + Stats ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest">
              Dashboard
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {displayName}
            </h1>
            <p className="text-slate-500 font-medium">
              Here&apos;s an overview of your learning progress.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:gap-4">
            {[
              {
                label: "Streak",
                value: isLoadingStats ? "..." : String(stats.streak),
                suffix: stats.streak === 1 ? "Day" : "Days",
                icon: Flame,
                color: "text-orange-500",
                bg: "bg-orange-50",
              },
              {
                label: "Modules",
                value: isLoadingStats
                  ? "..."
                  : `${stats.modulesCompleted}/${stats.modulesEnrolled}`,
                suffix: "",
                icon: CheckCircle,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                label: "Accuracy",
                value: isLoadingStats ? "..." : `${stats.accuracy}%`,
                suffix: "",
                icon: Target,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
            ].map(({ label, value, suffix, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="bg-white rounded-2xl px-5 py-4 border border-slate-200 shadow-sm flex items-center gap-4 min-w-[160px] hover:shadow-md hover:border-slate-300 transition-all duration-200"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}
                >
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    {label}
                  </p>
                  <p className="text-2xl font-black text-slate-900 leading-none">
                    {value}
                    {suffix && value !== "..." && (
                      <span className="text-sm font-semibold text-slate-500 ml-1">
                        {suffix}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Three-column layout ── */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left — Input Source */}
          <aside className="w-full lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm sticky top-24">
              <h3 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3 px-1">
                Input Source
              </h3>
              <div className="space-y-1">
                {categories.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setActiveInput(item.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      activeInput === item.name
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                        : "bg-white text-slate-600 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Center — Tool Explorer */}
          <section className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Tool Explorer
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Discover and master the best AI tools for your workflow.
                </p>
              </div>
              {currentToolNames.length > 0 && (
                <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-emerald-100">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {masteredCount} Mastered
                </div>
              )}
            </div>

            {/* tool flow indicator */}
            {activeInput && activeOutput && (
              <div className="flex items-center gap-2 mb-5 bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm w-fit">
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const Icon =
                      categories.find((c) => c.name === activeInput)?.icon ||
                      Sparkles;
                    return <Icon className="w-4 h-4 text-indigo-500" />;
                  })()}
                  <span className="text-sm font-semibold text-slate-700">
                    {activeInput}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const Icon =
                      categories.find((c) => c.name === activeOutput)?.icon ||
                      Sparkles;
                    return <Icon className="w-4 h-4 text-purple-500" />;
                  })()}
                  <span className="text-sm font-semibold text-slate-700">
                    {activeOutput}
                  </span>
                </div>
                <span className="text-xs text-slate-400 ml-2">
                  · {currentToolNames.length} tools
                </span>
              </div>
            )}

            {/* Empty state or tool grid */}
            {!activeInput || !activeOutput ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm text-center px-4">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Select Input &amp; Output
                </h3>
                <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                  Choose an input type on the left and an output type on the
                  right to discover matching AI tools.
                </p>
              </div>
            ) : currentToolNames.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentToolNames.map((name, index) => {
                  const isMastered = index % 3 === 0;
                  const logoUrl = TOOL_LOGOS[name];
                  return (
                    <div
                      key={name}
                      onClick={() => router.push("/learning")}
                      className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-100 hover:-translate-y-1 transition-all duration-200 group relative flex flex-col items-center text-center cursor-pointer"
                    >
                      {isMastered && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                      )}
                      {/* Tool logo / icon */}
                      <div className="w-14 h-14 rounded-xl mb-3 flex items-center justify-center overflow-hidden bg-slate-50 border border-slate-100 group-hover:scale-105 transition-transform duration-200">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={name}
                            className="w-10 h-10 object-contain"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display =
                                "none";
                              (e.currentTarget
                                .nextElementSibling as HTMLElement)?.classList.remove(
                                "hidden",
                              );
                            }}
                          />
                        ) : null}
                        <Sparkles
                          className={`w-7 h-7 text-indigo-400 ${
                            logoUrl ? "hidden" : ""
                          }`}
                        />
                      </div>
                      <h3 className="font-semibold text-slate-800 text-sm leading-tight">
                        {name}
                      </h3>
                      {isMastered && (
                        <span className="mt-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          Mastered
                        </span>
                      )}
                      <div className="absolute inset-0 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <span className="text-[10px] font-semibold text-indigo-500 flex items-center gap-1">
                          Open Tool <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-slate-300" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  No tools found
                </h3>
                <p className="text-sm text-slate-500">
                  Try a different combination of input and output.
                </p>
              </div>
            )}
          </section>

          {/* Right — Target Output */}
          <aside className="w-full lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm sticky top-24">
              <h3 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3 px-1">
                Target Output
              </h3>
              <div className="space-y-1">
                {categories.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setActiveOutput(item.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      activeOutput === item.name
                        ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20"
                        : "bg-white text-slate-600 border-slate-100 hover:border-purple-200 hover:bg-purple-50/50 hover:text-purple-700"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
