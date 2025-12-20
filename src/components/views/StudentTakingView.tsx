/**
 * Student Taking View - Quiz-taking interface with timer and question navigation
 */

import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import type { Quiz, Question, QuizAttempt } from '../../types';
import { VIEWS } from '../../constants';
import { formatTime } from '../../utils/time';

interface StudentTakingViewProps {
  currentAttempt: QuizAttempt | null;
  quizzes: Quiz[];
  questions: Question[];
  quizAttempts: QuizAttempt[];
  setCurrentAttempt: (attempt: QuizAttempt | null) => void;
  setQuizAttempts: (attempts: QuizAttempt[]) => void;
  setCurrentView: (view: typeof VIEWS[keyof typeof VIEWS]) => void;
  saveData: (updates: any) => void;
}

export function StudentTakingView({
  currentAttempt,
  quizzes,
  questions,
  quizAttempts,
  setCurrentAttempt,
  setQuizAttempts,
  setCurrentView,
  saveData
}: StudentTakingViewProps) {
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState<number>(currentAttempt?.timeLimitSeconds || 0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentAttempt) return;
    setRemaining(currentAttempt.timeLimitSeconds || 0);

    // start timer
    intervalRef.current = window.setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          // auto-submit
          window.clearInterval(intervalRef.current || 0);
          submitAttempt(); // will grade and navigate
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAttempt?.id]);

  if (!currentAttempt) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm text-gray-700">No active attempt. Return to your quizzes.</p>
        <button type="button" onClick={() => setCurrentView(VIEWS.STUDENT_QUIZ)} className="mt-2 text-sm text-blue-600 hover:underline">Back</button>
      </div>
    );
  }

  const quiz = quizzes.find(q => q.id === currentAttempt.quizId);
  const questionList = currentAttempt.questionIds.map((qid: string) => questions.find(q => q.id === qid)).filter(Boolean);

  // keep index valid if questionList length changed
  useEffect(() => {
    if (index >= questionList.length) {
      setIndex(Math.max(0, questionList.length - 1));
    }
    // keep index unchanged otherwise (do not reset to 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionList.length]);

  const currentQuestion = questionList[index];

  const setAnswer = (questionId: string, selectedIndex: number) => {
    // update currentAttempt answers immutably but DO NOT reset index or remount the view
    const updatedAttempt = {
      ...currentAttempt,
      answers: currentAttempt.answers.map((a: any) =>
        a.questionId === questionId ? { ...a, selected: selectedIndex } : a
      )
    };
    setCurrentAttempt(updatedAttempt);

    // persist progress in quizAttempts array
    const updatedAttempts = quizAttempts.map(a => a.id === updatedAttempt.id ? updatedAttempt : a);
    setQuizAttempts(updatedAttempts);
    saveData({ quizAttempts: updatedAttempts });
  };

  const submitAttempt = () => {
    if (!currentAttempt) return;
    // grade
    let score = 0;
    for (const a of currentAttempt.answers) {
      const q = questions.find(q => q.id === a.questionId);
      if (!q) continue;
      if (a.selected !== null && a.selected === q.correctAnswer) score++;
    }
    const total = currentAttempt.total || currentAttempt.questionIds.length || 0;
    const percentage = total > 0 ? ((score / total) * 100).toFixed(2) : '0';

    const finished = {
      ...currentAttempt,
      score,
      percentage: parseFloat(percentage as any),
      finishedAt: new Date().toISOString(),
      elapsedSeconds: (currentAttempt.timeLimitSeconds || 0) - remaining
    };

    // update attempts list
    const updatedAttempts = quizAttempts.map(a => a.id === finished.id ? finished : a);
    setQuizAttempts(updatedAttempts);
    saveData({ quizAttempts: updatedAttempts });

    // clear current attempt and go to results
    setCurrentAttempt(null);
    setCurrentView(VIEWS.STUDENT_RESULTS);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Taking: {quiz?.name}</h2>
        <div className="text-sm text-gray-700 flex items-center gap-2">
          <Clock /> <span>{formatTime(remaining)}</span>
        </div>
      </div>

      <div className="p-4 border rounded space-y-4">
        <div className="mb-2 text-sm text-gray-600">Question {index + 1} of {questionList.length}</div>

        {currentQuestion ? (
          <>
            <p className="font-medium mb-2">{currentQuestion.question}</p>
            <div className="space-y-2">
              {currentQuestion.options.map((opt: string, i: number) => {
                const curAns = currentAttempt.answers.find((a: any) => a.questionId === currentQuestion.id);
                const selected = curAns ? curAns.selected === i : false;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setAnswer(currentQuestion.id, i)}
                    className={`w-full text-left p-3 border rounded ${selected ? 'bg-blue-600 text-white' : 'bg-gray-50 hover:bg-gray-100'}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-600">Question not found.</div>
        )}
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            className={`px-4 py-2 rounded ${index === 0 ? 'bg-gray-200 text-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setIndex(i => Math.min(questionList.length - 1, i + 1))}
            disabled={index === questionList.length - 1}
            className={`px-4 py-2 rounded ${index === questionList.length - 1 ? 'bg-gray-200 text-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Next
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              // quick confirm then submit
              if (confirm('Submit quiz now?')) {
                if (intervalRef.current) window.clearInterval(intervalRef.current);
                submitAttempt();
              }
            }}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Submit Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
