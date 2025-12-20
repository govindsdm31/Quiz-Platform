/**
 * Student Review View - Shows a finished quiz attempt with selected and correct answers
 */

import type { Quiz, Question, QuizAttempt } from '../../types';
import { VIEWS } from '../../constants';

interface StudentReviewViewProps {
  currentAttempt: QuizAttempt | null;
  quizzes: Quiz[];
  questions: Question[];
  setCurrentAttempt: (attempt: QuizAttempt | null) => void;
  setCurrentView: (view: typeof VIEWS[keyof typeof VIEWS]) => void;
}

export function StudentReviewView({
  currentAttempt,
  quizzes,
  questions,
  setCurrentAttempt,
  setCurrentView
}: StudentReviewViewProps) {
  if (!currentAttempt) {
    return <div className="p-4 bg-yellow-50 rounded">No attempt to review.</div>;
  }

  const quiz = quizzes.find(q => q.id === currentAttempt.quizId);
  const qlist = currentAttempt.questionIds.map((qid: string) => questions.find(q => q.id === qid)).filter(Boolean);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{quiz?.name} – Review</h2>
        <button type="button" onClick={() => { setCurrentAttempt(null); setCurrentView(VIEWS.STUDENT_RESULTS); }} className="text-sm text-blue-600 hover:underline">Back</button>
      </div>

      <div className="space-y-4">
        {qlist.map((q: any, idx: number) => {
          const ans = currentAttempt.answers.find((a: any) => a.questionId === q.id);
          return (
            <div key={q.id} className="p-3 border rounded">
              <p className="font-medium mb-2">{idx + 1}. {q.question}</p>
              <div className="space-y-1">
                {q.options.map((opt: string, i: number) => {
                  const isSelected = ans && ans.selected === i;
                  const isCorrect = q.correctAnswer === i;
                  const cls = isCorrect ? 'bg-green-100' : isSelected ? 'bg-yellow-100' : 'bg-white';
                  return (
                    <div key={i} className={`p-2 border rounded ${cls}`}>
                      <div className="flex items-center justify-between">
                        <span>{opt}</span>
                        <div className="text-sm text-gray-600">
                          {isCorrect && <span className="text-green-700 font-semibold">Correct</span>}
                          {!isCorrect && isSelected && <span className="text-yellow-700">Your answer</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
