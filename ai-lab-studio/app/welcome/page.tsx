'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

      <div className="max-w-3xl w-full text-center space-y-12 relative z-10">
        
        {/* Branding / Logo */}
        <div className="flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="relative w-72 h-32 mb-4">
            <Image 
              src="/logo.svg" 
              alt="सिध्देश Logo" 
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Welcome Text */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight font-playfair">
            Welcome to Your Learning Journey
          </h2>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Master new skills with our professional platform designed to adapt to your unique learning pace and style.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center justify-center gap-3 bg-[#4F46E5] hover:bg-indigo-600 text-white font-semibold rounded-2xl px-10 py-5 text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-500/20"
          >
            Continue
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

      </div>
    </div>
  );
}
