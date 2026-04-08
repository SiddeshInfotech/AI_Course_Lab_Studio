"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Play,
  CheckCircle2,
  Lock,
  Video,
  HelpCircle,
} from "lucide-react";

export interface LessonItem {
  id: number;
  title: string;
  type: string;
  duration: string | null;
  completed: boolean;
  active: boolean;
  hasQuiz: boolean;
  videoCompleted: boolean;
  quizCompleted: boolean;
  orderIndex: number;
}

export interface CurriculumSection {
  id: string;
  day: string;
  title: string;
  items: LessonItem[];
}

interface LessonSidebarProps {
  curriculum: CurriculumSection[];
  currentLessonId: number | null;
  onLessonSelect: (lessonId: number) => void;
  isLessonLocked?: (lessonId: number) => boolean;
}

export default function LessonSidebar({
  curriculum,
  currentLessonId,
  onLessonSelect,
  isLessonLocked = () => false,
}: LessonSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      curriculum.forEach((section) => {
        initial[section.id] = true;
      });
      return initial;
    }
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const getLessonStatus = (lesson: LessonItem) => {
    const locked = isLessonLocked(lesson.id);
    if (locked) return "locked";
    if (lesson.completed) return "completed";
    if (lesson.id === currentLessonId) return "active";
    return "unlocked";
  };

  const getStatusIcon = (status: string, lesson: LessonItem) => {
    switch (status) {
      case "locked":
        return <Lock className="w-4 h-4 text-slate-400" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "active":
        return <Play className="w-4 h-4 text-indigo-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />;
    }
  };

  const getLessonIcon = (lesson: LessonItem) => {
    if (lesson.hasQuiz) {
      return <HelpCircle className="w-4 h-4 text-orange-500" />;
    }
    return <Video className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">Course Content</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {curriculum.map((section) => {
          const isExpanded = expandedSections[section.id];
          const allCompleted = section.items.every((item) => item.completed);
          const hasActive = section.items.some((item) => item.id === currentLessonId);

          return (
            <div key={section.id} className="border-b border-slate-100">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="font-medium text-slate-900 text-sm">
                    {section.day}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {allCompleted && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                  {hasActive && !allCompleted && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="pb-2">
                  {section.items.map((lesson) => {
                    const status = getLessonStatus(lesson);
                    const locked = status === "locked";

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => !locked && onLessonSelect(lesson.id)}
                        disabled={locked}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                          locked
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-slate-50 cursor-pointer"
                        } ${lesson.id === currentLessonId ? "bg-indigo-50" : ""}`}
                      >
                        <div className="flex-shrink-0">{getStatusIcon(status, lesson)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {getLessonIcon(lesson)}
                            <span
                              className={`text-sm truncate ${
                                lesson.id === currentLessonId
                                  ? "font-semibold text-indigo-700"
                                  : "text-slate-700"
                              }`}
                            >
                              {lesson.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {lesson.duration && (
                              <span className="text-xs text-slate-400">
                                {lesson.duration}
                              </span>
                            )}
                            {lesson.hasQuiz && (
                              <span className="text-xs text-orange-600 flex items-center gap-1">
                                <HelpCircle className="w-3 h-3" />
                                Quiz
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {lesson.videoCompleted && !lesson.completed && (
                            <span className="text-xs text-blue-600">Video ✓</span>
                          )}
                          {lesson.quizCompleted && (
                            <span className="text-xs text-green-600">Quiz ✓</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}