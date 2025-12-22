/**
 * Student Results View - Lists all quiz attempts for the current student
 */

import type { User, Quiz, QuizAttempt } from '../../types';
import { VIEWS } from '../../constants';

interface StudentResultsViewProps {
  currentUser: User | null;
  quizAttempts: QuizAttempt[];
  quizzes: Quiz[];
  setCurrentAttempt: (attempt: QuizAttempt | null) => void;
  setCurrentView: (view: typeof VIEWS[keyof typeof VIEWS]) => void;
}

export function StudentResultsView({
  currentUser,
  quizAttempts,
  quizzes,
  setCurrentAttempt,
  setCurrentView
}: StudentResultsViewProps) {
  if (!currentUser) return <div />;

  const attempts = quizAttempts.filter(a => a.studentId === currentUser.id);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4 text-oxford-blue">My Results</h2>

      {attempts.length === 0 && (
        <div className="p-4 bg-selective-yellow/10 border border-selective-yellow rounded text-sm text-gray-700">
          No attempts found yet.
        </div>
      )}

      <div className="space-y-3">
        {attempts.map(a => {
          const quiz = quizzes.find(q => q.id === a.quizId);
          return (
            <div key={a.id} className="p-3 border border-oxford-blue/20 rounded bg-oxford-blue/5 flex justify-between items-center hover:bg-oxford-blue/10 transition-colors">
              <div>
                <p className="font-medium text-oxford-blue">{quiz?.name || 'Quiz'}</p>
                <p className="text-sm text-gray-600">Score: {a.score}/{a.total} – {a.percentage}%</p>
                <p className="text-sm text-gray-500">Started: {new Date(a.startedAt).toLocaleString()}</p>
                {a.finishedAt && <p className="text-sm text-gray-500">Finished: {new Date(a.finishedAt).toLocaleString()}</p>}
              </div>
              <div>
                <button type="button" onClick={() => {
                  setCurrentAttempt(a);
                  setCurrentView(VIEWS.STUDENT_REVIEW);
                }} className="text-sm bg-oxford-blue text-white px-3 py-1 rounded hover:bg-oxford-blue/90">Review</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
