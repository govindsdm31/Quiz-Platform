/**
 * Student Quiz View - Shows active quiz for the student
 */

import { Play } from 'lucide-react';
import type { User, Batch, Quiz, Student } from '../../types';
import { VIEWS } from '../../constants';

interface StudentQuizViewProps {
  currentUser: User | null;
  students: Student[];
  batches: Batch[];
  quizzes: Quiz[];
  startStudentAttempt: (batchId: string) => void;
  setCurrentView: (view: typeof VIEWS[keyof typeof VIEWS]) => void;
}

export function StudentQuizView({
  currentUser,
  students,
  batches,
  quizzes,
  startStudentAttempt,
  setCurrentView
}: StudentQuizViewProps) {
  if (!currentUser) return <div />;

  // find the student's batch
  const student = students.find(s => s.id === currentUser.id);
  const studentBatch = student ? batches.find(b => b.id === student.batchId) : null;
  const activeQuizId = studentBatch?.activeQuizId;
  const quiz = activeQuizId ? quizzes.find(q => q.id === activeQuizId) : null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4 text-oxford-blue">My Quiz</h2>

      {!student && (
        <div className="p-4 bg-selective-yellow/10 border border-selective-yellow rounded text-sm text-gray-700">
          No student profile found. Contact your administrator.
        </div>
      )}

      {student && !studentBatch && (
        <div className="p-4 bg-selective-yellow/10 border border-selective-yellow rounded text-sm text-gray-700">
          You are not assigned to a batch. Contact your supervisor.
        </div>
      )}

      {studentBatch && !quiz && (
        <div className="p-4 bg-selective-yellow/10 border border-selective-yellow rounded text-sm text-gray-700">
          No active quiz for your batch right now. Please wait for your supervisor to start one.
        </div>
      )}

      {quiz && studentBatch && (
        <div className="space-y-4">
          <div className="p-4 border border-oxford-blue/20 rounded bg-oxford-blue/5">
            <p className="font-semibold text-lg text-oxford-blue">{quiz.name}</p>
            <p className="text-sm text-gray-600">Duration: {quiz.duration} minutes | Questions: {quiz.questionCount}</p>
            <p className="text-sm text-gray-600">Subject: {quiz.subject} | Level: {quiz.level}</p>
          </div>

          <div className="flex gap-2">
            <button type="button"
              onClick={() => startStudentAttempt(studentBatch.id)}
              className="bg-oxford-blue text-white px-4 py-2 rounded hover:bg-oxford-blue/90 flex items-center gap-2"
            >
              <Play size={16} /> Start Quiz
            </button>

            <button type="button"
              onClick={() => setCurrentView(VIEWS.STUDENT_RESULTS)}
              className="bg-selective-yellow text-oxford-blue px-4 py-2 rounded hover:bg-selective-yellow/90 font-medium"
            >
              View My Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
