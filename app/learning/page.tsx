'use client';

import { useState } from 'react';
import { 
  ArrowLeft, Play, CheckCircle2, FileText, Video, Target, 
  ChevronRight, 
  Clock, Pause, Volume2, Maximize, Settings,
  BookOpen, Code, ChevronDown, ChevronUp, HelpCircle, ExternalLink, Menu, Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

export default function LearningPage() {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({ day1: true });

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  const curriculum = [
    {
      id: 'day1',
      day: 'Day 1',
      title: 'Foundations of Neural Networks',
      items: [
        { id: 1, title: "Introduction to NNs", type: "video", duration: "12 min", completed: true },
        { id: 2, title: "Backpropagation Deep Dive", type: "video", duration: "24 min", completed: false, active: true },
        { id: 3, title: "Day 1 Quiz", type: "quiz", duration: "10 min", completed: false },
      ]
    },
    {
      id: 'day2',
      day: 'Day 2',
      title: 'Advanced Architectures',
      items: [
        { id: 4, title: "Loss Functions & Optimizers", type: "video", duration: "18 min", completed: false },
        { id: 5, title: "Building Your First Model", type: "exercise", duration: "45 min", completed: false },
        { id: 6, title: "Day 2 Quiz", type: "quiz", duration: "15 min", completed: false },
      ]
    },
    {
      id: 'day3',
      day: 'Day 3',
      title: 'Practical Applications',
      items: [
        { id: 7, title: "Computer Vision Basics", type: "video", duration: "20 min", completed: false },
        { id: 8, title: "Natural Language Processing", type: "video", duration: "25 min", completed: false },
        { id: 9, title: "Day 3 Quiz", type: "quiz", duration: "15 min", completed: false },
      ]
    }
  ];

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* ── Header ── */}
      <header className="h-16 bg-white border-b border-slate-200/80 flex items-center px-4 md:px-6 gap-3 shrink-0 z-30 shadow-sm relative">
        {/* Back button */}
        <button
          onClick={() => router.push('/ai-dashboard')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors group shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-colors" />
        </button>

        <div className="h-6 w-px bg-slate-200 hidden md:block" />

        {/* Logo */}
        <div className="hidden md:flex items-center gap-3 pr-4 shrink-0">
          <div className="relative w-28 h-7">
            <Image
              src="/logo.png?v=2"
              alt="Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Course title — centered absolutely */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center">
          <span className="text-[9px] font-semibold text-indigo-500 uppercase tracking-[0.15em]">Course</span>
          <h1 className="text-sm font-semibold text-slate-800 leading-tight tracking-tight whitespace-nowrap">Advanced Neural Networks</h1>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── LEFT Sidebar: Course Content ── */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.aside
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="shrink-0 bg-white border-r border-slate-200/80 flex flex-col overflow-hidden z-20 shadow-sm"
            >
              <div className="w-80 flex flex-col h-full">
                {/* Sidebar header */}
                <div className="px-4 py-3 border-b border-slate-100 shrink-0 flex items-center gap-3">
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                    title="Close Course Content"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                  <div className="flex-1">
                    <h2 className="font-semibold text-slate-800 text-sm tracking-tight">Course Content</h2>
                    <div className="flex items-center mt-1.5">
                      <div className="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden mr-2">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: '20%' }} />
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-600 shrink-0">2 / 12</span>
                    </div>
                  </div>
                </div>

                {/* Curriculum list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {curriculum.map((section) => (
                    <div key={section.id} className="rounded-xl border border-slate-100 overflow-hidden bg-white">
                      <button
                        onClick={() => toggleDay(section.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex flex-col items-start text-left">
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{section.day}</span>
                          <span className="text-xs font-semibold text-slate-800 mt-0.5">{section.title}</span>
                        </div>
                        {expandedDays[section.id]
                          ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                      </button>

                      <AnimatePresence>
                        {expandedDays[section.id] && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-2 pb-2 space-y-0.5 border-t border-slate-100">
                              {section.items.map((item) => (
                                <div
                                  key={item.id}
                                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                                    item.active
                                      ? 'bg-indigo-50 border border-indigo-100'
                                      : 'hover:bg-slate-50 border border-transparent'
                                  }`}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    {item.completed ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    ) : item.active ? (
                                      <Play className="w-4 h-4 text-indigo-600" fill="currentColor" />
                                    ) : item.type === 'reading' ? (
                                      <FileText className="w-4 h-4 text-slate-400" />
                                    ) : item.type === 'exercise' ? (
                                      <Code className="w-4 h-4 text-slate-400" />
                                    ) : item.type === 'quiz' ? (
                                      <HelpCircle className="w-4 h-4 text-orange-400" />
                                    ) : (
                                      <Video className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <span className={`text-xs font-semibold block leading-tight ${item.active ? 'text-indigo-900' : 'text-slate-700'}`}>
                                      {item.title}
                                    </span>
                                    <span className={`text-[10px] font-medium flex items-center gap-1 mt-1 ${item.active ? 'text-indigo-500' : 'text-slate-400'}`}>
                                      <Clock className="w-3 h-3" /> {item.duration}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>

                {/* AI Tool button — minimalist professional */}
                <div className="p-4 border-t border-slate-100 shrink-0">
                  <button
                    onClick={() => window.open('https://chatgpt.com', '_blank')}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium transition-all group"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-500 group-hover:rotate-12 transition-transform" />
                    <span>Open AI Tool</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-auto text-indigo-400" />
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Floating open-sidebar button — only when closed */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-30 p-2 bg-white rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all"
            title="Open Course Content"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* ── RIGHT: Main content (video + simplified below) ── */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-4xl mx-auto p-6 md:p-8">

            {/* Video Player */}
            <div className="w-full aspect-video bg-slate-900 rounded-2xl shadow-xl flex flex-col relative overflow-hidden group border border-slate-800 mb-6">
              {/* Play overlay */}
              <div className="flex-1 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10" />
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-16 h-16 bg-white/10 hover:bg-indigo-600 rounded-full flex items-center justify-center backdrop-blur-md transition-all z-20 border border-white/20 shadow-2xl"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 text-white" fill="currentColor" />
                  ) : (
                    <Play className="w-7 h-7 text-white ml-1" fill="currentColor" />
                  )}
                </motion.button>
              </div>

              {/* Video controls */}
              <div className="h-12 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center px-4 gap-3 z-20 absolute bottom-0 w-full transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <button onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:text-indigo-400 transition-colors">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div className="text-xs text-slate-400 font-medium">04:12 / 24:00</div>
                <div className="flex-1 mx-2">
                  <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden cursor-pointer relative">
                    <div className="absolute top-0 left-0 h-full bg-indigo-500 w-[15%]" />
                    <div className="absolute top-1/2 -translate-y-1/2 left-[15%] w-2.5 h-2.5 bg-white rounded-full shadow-md transform -translate-x-1/2" />
                  </div>
                </div>
                <button className="text-white hover:text-indigo-400 transition-colors"><Volume2 className="w-4 h-4" /></button>
                <button className="text-white hover:text-indigo-400 transition-colors"><Settings className="w-4 h-4" /></button>
                <button className="text-white hover:text-indigo-400 transition-colors"><Maximize className="w-4 h-4" /></button>
              </div>
            </div>

            {/* ── Below Video: Lesson Title + Next Button + Overview only ── */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                  2. Backpropagation Deep Dive
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">Day 1 · Video · 24 min</p>
              </div>
              <button className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-indigo-500/25 active:scale-[0.97] shrink-0">
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Overview section */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Overview</h3>
              </div>
              <p className="text-slate-600 leading-relaxed mb-5">
                In this module, we will explore the mathematics and intuition behind how neural networks learn from their mistakes. You&apos;ll understand the chain rule of calculus and how it applies to updating weights in a deep network.
              </p>
              <div className="bg-indigo-50/60 rounded-xl p-5 border border-indigo-100">
                <h4 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-600" />
                  Learning Objectives
                </h4>
                <ul className="space-y-3 text-sm text-indigo-800/80">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    Understand the concept of gradient descent and its variants.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    Apply the chain rule to compute partial derivatives across multiple layers.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    Implement a basic backpropagation algorithm from scratch in Python.
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
