"use client";

import { useState, useEffect } from "react";
import { HelpCircle, CheckCircle2, XCircle } from "lucide-react";

export interface QuizQuestion {
  id: string | number;
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string | null;
}

interface QuizSectionProps {
  questions: QuizQuestion[];
  onSubmit: (answers: Record<number, number>, score: { correct: number; total: number }) => void;
  onReset?: () => void;
  isLocked?: boolean;
  isCompleted?: boolean;
  previousScore?: number | null;
  previousAnswers?: Record<number, number> | null;
  lockedMessage?: string;
}

export default function QuizSection({
  questions,
  onSubmit,
  onReset,
  isLocked = false,
  isCompleted = false,
  previousScore,
  previousAnswers,
  lockedMessage = "Complete the video to unlock the quiz",
}: QuizSectionProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(
    previousAnswers || {}
  );
  const [submitted, setSubmitted] = useState(isCompleted);
  const [showExplanations, setShowExplanations] = useState(false);

  useEffect(() => {
    if (!isCompleted && submitted) {
      setSubmitted(false);
      setSelectedAnswers({});
      setShowExplanations(false);
    }
  }, [isCompleted, submitted]);

  const handleSelectAnswer = (questionIndex: number, optionIndex: number) => {
    if (submitted || isLocked) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answerIndex) {
        correct++;
      }
    });
    setSubmitted(true);
    setShowExplanations(true);
    onSubmit(selectedAnswers, { correct, total: questions.length });
  };

  const allAnswered = Object.keys(selectedAnswers).length === questions.length;
  const score = previousScore || (submitted ? calculateScore() : null);

  function calculateScore() {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answerIndex) {
        correct++;
      }
    });
    return correct;
  }

  if (isLocked) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <HelpCircle className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Quiz</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">{lockedMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isCompleted && !submitted) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Quiz</h3>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Completed
            </span>
          </div>
          {score !== null && (
            <div className="text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">
              Score: {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
            </div>
          )}
        </div>
        <p className="text-slate-600">You have already completed this quiz.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <HelpCircle className="w-5 h-5 text-orange-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Quiz</h3>
          {submitted && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Completed
            </span>
          )}
        </div>
        {score !== null && !submitted && (
          <div className="text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">
            Score: {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
          </div>
        )}
      </div>

      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <div key={q.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
            <p className="text-sm font-semibold text-slate-800 mb-3">
              {qIndex + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((option, oIndex) => {
                const isSelected = selectedAnswers[qIndex] === oIndex;
                const isCorrect = oIndex === q.answerIndex;
                let optionClass = "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50";

                if (submitted && showExplanations) {
                  if (isCorrect) {
                    optionClass = "border-green-400 bg-green-50";
                  } else if (isSelected && !isCorrect) {
                    optionClass = "border-red-400 bg-red-50";
                  }
                } else if (isSelected) {
                  optionClass = "border-indigo-500 bg-indigo-50";
                }

                return (
                  <button
                    key={oIndex}
                    onClick={() => handleSelectAnswer(qIndex, oIndex)}
                    disabled={submitted}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${optionClass} ${
                      submitted ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-xs font-medium text-slate-600">
                        {String.fromCharCode(65 + oIndex)}
                      </span>
                      <span className="text-sm text-slate-700">{option}</span>
                      {submitted && showExplanations && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                      )}
                      {submitted && showExplanations && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {submitted && showExplanations && q.explanation && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs font-medium text-blue-800">
                  <span className="font-bold">Explanation:</span> {q.explanation}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {!submitted && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              allAnswered
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            Submit Quiz
          </button>
        </div>
      )}

      {submitted && (
        <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">Quiz Completed</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            You scored {score} out of {questions.length} (
            {Math.round(((score ?? 0) / questions.length) * 100)}%)
          </p>
          {onReset && (
            <button
              onClick={onReset}
              className="mt-3 px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Retake Quiz
            </button>
          )}
        </div>
      )}
    </div>
  );
}