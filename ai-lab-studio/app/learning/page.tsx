'use client';

import { ArrowLeft, Play, CheckCircle2, FileText, Video, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LearningPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header */}
      <header className="h-20 border-b border-[#e9ece6] flex items-center px-4 md:px-8 gap-6 sticky top-0 bg-white z-10 shadow-sm shadow-[#4a5346]/5">
        <button 
          onClick={() => router.push('/dashboard')} 
          className="p-2.5 hover:bg-[#f4f5f2] rounded-full transition-colors group"
        >
          <ArrowLeft className="w-6 h-6 text-[#8b9487] group-hover:text-[#4a5346]" />
        </button>
        
        {/* Logo in Header */}
        <div className="hidden md:flex flex-col border-r border-[#e9ece6] pr-6 mr-2">
          <div className="relative w-24 h-8">
            <Image 
              src="/logo.svg" 
              alt="सिध्देश Logo" 
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-[#ea580c] uppercase tracking-widest mb-0.5">Course</span>
          <h1 className="text-base font-bold text-[#4a5346]">Advanced Neural Networks</h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Sidebar Curriculum */}
        <div className="w-full md:w-80 border-r border-[#e9ece6] bg-[#f4f5f2] flex flex-col">
          <div className="p-6 border-b border-[#e9ece6] bg-white">
            <h2 className="font-bold text-[#4a5346] text-lg">Curriculum</h2>
            <p className="text-sm text-[#8b9487] mt-1 font-medium">2 of 12 modules completed</p>
            
            {/* Progress bar */}
            <div className="w-full bg-[#e9ece6] rounded-full h-2 mt-5 overflow-hidden">
              <div className="bg-[#ea580c] h-full rounded-full" style={{ width: '15%' }}></div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-[#e9ece6] shadow-sm cursor-pointer hover:border-[#4a5346]/30 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-[#4a5346] shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-bold text-[#4a5346] block">1. Introduction to NNs</span>
                <span className="text-xs font-medium text-[#8b9487] flex items-center gap-1.5 mt-1.5"><Video className="w-3.5 h-3.5"/> 12 min</span>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-[#ea580c]/5 rounded-2xl border border-[#ea580c]/20 cursor-pointer">
              <Play className="w-5 h-5 text-[#ea580c] shrink-0 mt-0.5" fill="currentColor" />
              <div>
                <span className="text-sm font-bold text-[#ea580c] block">2. Backpropagation Deep Dive</span>
                <span className="text-xs font-medium text-[#ea580c]/70 flex items-center gap-1.5 mt-1.5"><Video className="w-3.5 h-3.5"/> 24 min</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 hover:bg-white rounded-2xl border border-transparent cursor-pointer transition-colors">
              <FileText className="w-5 h-5 text-[#8b9487] shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-bold text-[#8b9487] block">3. Activation Functions</span>
                <span className="text-xs font-medium text-[#8b9487]/70 flex items-center gap-1.5 mt-1.5"><FileText className="w-3.5 h-3.5"/> Reading</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 md:p-10 flex flex-col items-center bg-white overflow-y-auto">
          <div className="w-full max-w-4xl">
            {/* Video Player Placeholder */}
            <div className="w-full aspect-video bg-[#1e231c] rounded-[2rem] shadow-2xl flex items-center justify-center relative overflow-hidden group border border-[#e9ece6]">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500"></div>
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md cursor-pointer hover:bg-[#ea580c] hover:scale-110 transition-all duration-300 z-10 shadow-2xl">
                <Play className="w-10 h-10 text-white ml-2" fill="currentColor" />
              </div>
            </div>

            {/* Content Details */}
            <div className="mt-10">
              <h2 className="text-4xl font-black text-[#4a5346] mb-6 tracking-tight">2. Backpropagation Deep Dive</h2>
              <div className="prose prose-lg prose-slate max-w-none">
                <p className="text-xl text-[#6b7264] leading-relaxed font-medium">
                  In this module, we will explore the mathematics and intuition behind how neural networks learn from their mistakes. You&apos;ll understand the chain rule of calculus and how it applies to updating weights in a deep network.
                </p>
                <div className="bg-[#f4f5f2] rounded-3xl p-8 mt-10 border border-[#e9ece6]">
                  <h3 className="text-xl font-bold text-[#4a5346] mb-6 flex items-center gap-3">
                    <Target className="w-6 h-6 text-[#ea580c]" />
                    Learning Objectives
                  </h3>
                  <ul className="space-y-4 text-[#6b7264] font-medium">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#ea580c] mt-2.5 shrink-0"></div>
                      Understand the concept of gradient descent and its variants.
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#ea580c] mt-2.5 shrink-0"></div>
                      Apply the chain rule to compute partial derivatives across multiple layers.
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#ea580c] mt-2.5 shrink-0"></div>
                      Implement a basic backpropagation algorithm from scratch in Python.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
