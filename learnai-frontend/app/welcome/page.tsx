"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function WelcomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  const text = "Welcome to Your Learning Journey";
  const letters = Array.from(text);

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.2 },
    },
  };

  const child = {
    visible: { opacity: 1, display: "inline-block" },
    hidden: { opacity: 0, display: "inline-block" },
  };

  if (isLoading) {
    return (
      <div className="h-screen overflow-hidden bg-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen overflow-hidden bg-white flex flex-col items-center justify-center p-6 font-sans relative">
      <div className="max-w-5xl w-full text-center space-y-8 relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center justify-center"
        >
          <div className="relative w-64 h-28 sm:w-80 sm:h-36 md:w-[28rem] md:h-48">
            <Image
              src="/logo.png"
              alt="Learn AI Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </motion.div>

        {/* Welcome Text */}
        <div className="space-y-5">
          <motion.h2
            className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-600 tracking-tighter font-sans"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            {letters.map((letter, index) => (
              <motion.span variants={child} key={index}>
                {letter === " " ? "\u00A0" : letter}
              </motion.span>
            ))}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
            className="text-lg md:text-xl text-slate-500 font-medium max-w-3xl mx-auto leading-relaxed"
          >
            Master new skills with our professional platform designed to adapt
            to your unique learning pace and style.
          </motion.p>
        </div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.8 }}
          className="pt-2"
        >
          <button
            onClick={() => router.push("/ai-dashboard")}
            className="inline-flex items-center justify-center gap-3 bg-[#4F46E5] hover:bg-indigo-700 text-white font-black rounded-2xl px-10 py-5 text-lg md:text-xl transition-all hover:shadow-2xl hover:shadow-indigo-500/30 active:scale-[0.98]"
          >
            Continue
          </button>
        </motion.div>
      </div>
    </div>
  );
}
