"use client";

import { ArrowRight, HelpCircle, CheckCircle2, Lock } from "lucide-react";

interface LessonButtonProps {
  state: "video" | "quiz" | "completed";
  videoCompleted: boolean;
  quizCompleted: boolean;
  hasQuiz: boolean;
  isLastLesson: boolean;
  onTakeQuiz: () => void;
  onNextLesson: () => void;
  onCompleteVideo?: () => void;
}

export default function LessonButton({
  state,
  videoCompleted,
  quizCompleted,
  hasQuiz,
  isLastLesson,
  onTakeQuiz,
  onNextLesson,
  onCompleteVideo,
}: LessonButtonProps) {
  if (state === "video" && !videoCompleted) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          disabled
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-slate-200 text-slate-400 cursor-not-allowed"
        >
          <Lock className="w-5 h-5" />
          Watch video to unlock quiz
        </button>
        {onCompleteVideo && (
          <button
            onClick={onCompleteVideo}
            className="text-sm text-indigo-600 hover:underline"
          >
            Mark video as complete (dev only)
          </button>
        )}
      </div>
    );
  }

  if (state === "video" && videoCompleted && hasQuiz && !quizCompleted) {
    return (
      <button
        onClick={onTakeQuiz}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
      >
        <HelpCircle className="w-5 h-5" />
        Take Quiz
      </button>
    );
  }

  if (state === "video" && videoCompleted && (!hasQuiz || quizCompleted)) {
    if (isLastLesson) {
      return (
        <div className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-green-100 text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          Course Completed!
        </div>
      );
    }
    return (
      <button
        onClick={onNextLesson}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
      >
        Go to Next Lesson
        <ArrowRight className="w-5 h-5" />
      </button>
    );
  }

  if (state === "quiz" && !quizCompleted) {
    return (
      <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
        <p className="text-center text-orange-800 font-medium">
          Complete the quiz to unlock the next lesson
        </p>
      </div>
    );
  }

  if (state === "quiz" && quizCompleted) {
    if (isLastLesson) {
      return (
        <div className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-green-100 text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          Course Completed!
        </div>
      );
    }
    return (
      <button
        onClick={onNextLesson}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
      >
        Go to Next Lesson
        <ArrowRight className="w-5 h-5" />
      </button>
    );
  }

  if (state === "completed") {
    return (
      <div className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-green-100 text-green-700">
        <CheckCircle2 className="w-5 h-5" />
        Lesson Completed
      </div>
    );
  }

  return null;
}