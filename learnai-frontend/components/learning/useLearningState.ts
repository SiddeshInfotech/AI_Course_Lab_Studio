"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";

export interface LessonProgress {
  videoCompleted: boolean;
  quizCompleted: boolean;
  quizScore: number | null;
}

export interface UseLearningStateReturn {
  videoCompleted: boolean;
  quizCompleted: boolean;
  quizScore: number | null;
  isLoading: boolean;
  isUpdatingProgress: boolean;
  error: string | null;
  updateVideoProgress: (lessonId: number) => Promise<void>;
  submitQuiz: (lessonId: number, answers: Record<number, number>, score: number) => Promise<void>;
  refreshProgress: (lessonId: number) => Promise<void>;
  setVideoCompleted: (value: boolean) => void;
  setQuizCompleted: (value: boolean) => void;
  setQuizScore: (value: number | null) => void;
  setQuizSubmitted: (value: boolean) => void;
  quizSubmitted: boolean;
}

export function useLearningState(initialLessonId?: number): UseLearningStateReturn {
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProgress = useCallback(async (lessonId: number) => {
    try {
      setIsLoading(true);
      const activity = await api.learning.getLessonActivity(lessonId);
      setVideoCompleted(activity.videoCompleted || false);
      setQuizCompleted(activity.quizCompleted || false);
      setQuizScore(activity.quizScore);
      setQuizSubmitted(activity.quizCompleted || false);
    } catch (err) {
      console.error("Failed to refresh progress:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateVideoProgress = useCallback(async (lessonId: number) => {
    try {
      setIsUpdatingProgress(true);
      console.log("📡 API call: updateVideoProgress for lesson:", lessonId);
      await api.learning.updateVideoProgress(lessonId, {
        videoStarted: true,
        videoCompleted: true,
        videoWatchTime: 0,
      });
      console.log("✅ API: video progress updated successfully");
      setVideoCompleted(true);
    } catch (err) {
      console.error("❌ API: Failed to update video progress:", err);
      setError("Failed to update video progress");
    } finally {
      setIsUpdatingProgress(false);
    }
  }, []);

  const submitQuiz = useCallback(async (
    lessonId: number,
    answers: Record<number, number>,
    score: number
  ) => {
    try {
      setIsUpdatingProgress(true);
      await api.learning.submitQuiz(lessonId, {
        answers,
        score,
      });
      setQuizCompleted(true);
      setQuizScore(score);
      setQuizSubmitted(true);
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      setError("Failed to submit quiz");
    } finally {
      setIsUpdatingProgress(false);
    }
  }, []);

  const resetQuiz = useCallback(async (lessonId: number) => {
    try {
      setIsUpdatingProgress(true);
      await api.learning.resetQuiz(lessonId);
      setQuizCompleted(false);
      setQuizScore(null);
      setQuizSubmitted(false);
    } catch (err) {
      console.error("Failed to reset quiz:", err);
      setError("Failed to reset quiz");
    } finally {
      setIsUpdatingProgress(false);
    }
  }, []);

  return {
    videoCompleted,
    quizCompleted,
    quizScore,
    quizSubmitted,
    isLoading,
    isUpdatingProgress,
    error,
    updateVideoProgress,
    submitQuiz,
    resetQuiz,
    refreshProgress,
    setVideoCompleted,
    setQuizCompleted,
    setQuizScore,
    setQuizSubmitted,
  };
}