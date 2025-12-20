/**
 * Supervisor View - Manages batches, students, and quiz sessions
 */

import { useState } from 'react';
import { Play, Square } from 'lucide-react';
import type { User, Batch, Student, Supervisor, Quiz, QuizAttempt } from '../../types';
import { VIEWS } from '../../constants';

interface SupervisorViewProps {
  currentUser: User | null;
  batches: Batch[];
  students: Student[];
  supervisors: Supervisor[];
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  startQuiz: (batchId: string) => void;
  stopQuiz: (batchId: string) => void;
  getLatestFinishedAttempt: (studentId: string, quizId: string, batchId: string) => QuizAttempt | undefined;
  addExistingStudentToBatch: (batchId: string, studentId: string) => boolean;
  addStudentToBatch: (batchId: string, studentName: string) => { username: string; password: string };
  setCurrentAttempt: (attempt: QuizAttempt | null) => void;
  setCurrentView: (view: typeof VIEWS[keyof typeof VIEWS]) => void;
}

export function SupervisorView({
  currentUser,
  batches,
  students,
  supervisors,
  quizzes,
  quizAttempts,
  startQuiz,
  stopQuiz,
  getLatestFinishedAttempt,
  addExistingStudentToBatch,
  addStudentToBatch,
  setCurrentAttempt,
  setCurrentView
}: SupervisorViewProps) {
  const myBatches = batches.filter(b =>
    supervisors.find(s => s.id === currentUser?.id && s.batchIds && s.batchIds.includes(b.id))
  );
  const myStudents = students.filter(s => s.collabSpaceId === currentUser?.collabSpaceId);
  const [addSelection, setAddSelection] = useState<Record<string, string>>({});
  const [newStudentName, setNewStudentName] = useState<Record<string, string>>({}); // per-batch new student input

  // New: track which batches should reveal credentials to the supervisor
  const [showCredentialsFor, setShowCredentialsFor] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">My Batches</h2>
        <div className="space-y-4">
          {myBatches.length === 0 && (
            <div className="p-4 border rounded bg-yellow-50 text-gray-700">
              No batches assigned. Contact your administrator.
            </div>
          )}

          {myBatches.map(batch => {
            const quiz = quizzes.find(q => q.id === batch.quizId);
            const batchStudents = students.filter(s => s.batchId === batch.id);
            const batchAttempts = quizAttempts.filter(a => a.batchId === batch.id);

            return (
              <div key={batch.id} className="p-4 border rounded">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{batch.schoolName}</h3>
                    <p className="text-sm text-gray-600">Quiz: {quiz?.name || '–'} | Students: {batchStudents.length}</p>
                  </div>

                  <div className="flex gap-2">
                    {!batch.activeQuizId ? (
                      <button type="button" onClick={() => startQuiz(batch.id)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">
                        <Play size={16} /> Start Quiz
                      </button>
                    ) : (
                      <button type="button" onClick={() => stopQuiz(batch.id)} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center gap-2">
                        <Square size={16} /> Stop Quiz
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Student Credentials:</h4>
                    {/* Toggle to reveal/hide credentials for this specific batch */}
                    <button type="button"
                      onClick={() => setShowCredentialsFor(prev => ({ ...prev, [batch.id]: !prev[batch.id] }))}
                      className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm"
                    >
                      {showCredentialsFor[batch.id] ? 'Hide credentials' : 'Show credentials'}
                    </button>
                  </div>

                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {batchStudents.length === 0 && <div className="text-sm text-gray-600">No students in this batch.</div>}
                    {batchStudents.map(s => (
                      <div key={s.id} className="text-sm p-2 bg-gray-50 rounded flex justify-between items-center">
                        <div>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-gray-600">
                            {s.username}
                            {showCredentialsFor[batch.id] && (
                              <span className="ml-3"> / {s.password}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* completion status */}
                          {batch.activeQuizId ? (
                            (() => {
                              const attempt = getLatestFinishedAttempt(s.id, batch.activeQuizId, batch.id);
                              return attempt ? <div className="text-sm text-green-700">{attempt.percentage}%</div> : <div className="text-sm text-yellow-700">Not done</div>;
                            })()
                          ) : <div className="text-sm text-gray-600">–</div>}
                          {batch.activeQuizId && (() => {
                            const attempt = getLatestFinishedAttempt(s.id, batch.activeQuizId, batch.id);
                            return attempt ? <button type="button" onClick={() => { setCurrentAttempt(attempt); setCurrentView(VIEWS.STUDENT_REVIEW); }} className="text-sm text-blue-600 hover:underline">Review</button> : null;
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-2 flex gap-2 items-center">
                  <select
                    className="p-2 border rounded"
                    value={addSelection[batch.id] || ''}
                    onChange={(e) => setAddSelection(prev => ({ ...prev, [batch.id]: e.target.value }))}
                  >
                    <option value="">Add existing student</option>
                    {myStudents.filter(s => s.batchId !== batch.id).map(s => <option key={s.id} value={s.id}>{s.name} ({s.username})</option>)}
                  </select>
                  <button type="button" onClick={() => {
                    const sid = addSelection[batch.id];
                    if (!sid) return alert('Select a student to add');
                    const ok = addExistingStudentToBatch(batch.id, sid);
                    if (ok) {
                      alert('Student added to batch');
                      setAddSelection(prev => ({ ...prev, [batch.id]: '' }));
                    }
                  }} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Add</button>

                  {/* New student creation (supervisor) */}
                  <input placeholder="New student name" className="p-2 border rounded" value={newStudentName[batch.id] || ''} onChange={(e) => setNewStudentName(prev => ({ ...prev, [batch.id]: e.target.value }))} />
                  <button type="button" onClick={() => {
                    const name = newStudentName[batch.id];
                    if (!name) return alert('Enter a name');
                    const creds = addStudentToBatch(batch.id, name);
                    setNewStudentName(prev => ({ ...prev, [batch.id]: '' }));
                    alert(`Created student ${name}: ${creds.username} / ${creds.password}`);
                  }} className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">Create & Add</button>
                </div>

                {batchAttempts.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Results:</h4>
                    <div className="space-y-1">
                      {batchAttempts.map(attempt => (
                        <div key={attempt.id} className="text-sm p-2 bg-blue-50 rounded flex justify-between">
                          <span>{attempt.studentName}</span>
                          <span className="font-medium">{attempt.score}/{attempt.total} ({attempt.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
