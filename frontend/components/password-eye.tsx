"use client"

import { motion } from "motion/react"

interface PasswordEyeProps {
  isFocused: boolean;
  length: number;
  showPassword: boolean;
  onClick: () => void;
}

export function PasswordEye({ isFocused, length, showPassword, onClick }: PasswordEyeProps) {
  const maxChars = 20;
  const clampedLength = Math.min(length, maxChars);
  
  // Pupil moves from left (-5) to right (+3)
  const pupilX = isFocused ? -5 + (clampedLength / maxChars) * 8 : 0;
  const pupilY = isFocused ? 1 : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#ff7a59] focus:outline-none transition-colors z-10"
      title={showPassword ? "Hide password" : "Show password"}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c0 0 4-8 10-8s10 8 10 8-4 8-10 8-10-8-10-8z" />
        
        <motion.circle 
          cx="12" cy="12" r="3" 
          animate={{ 
            x: pupilX, 
            y: pupilY,
            scale: isFocused ? 1.1 : 1
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />

        {!showPassword && (
          <motion.line 
            x1="2" y1="2" x2="22" y2="22" 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            strokeWidth="2.5"
          />
        )}
      </svg>
    </button>
  )
}
