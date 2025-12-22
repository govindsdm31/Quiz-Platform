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

  // Drill-down navigation state
  const [viewMode, setViewMode] = useState<'batches' | 'students'>('batches');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-oxford-blue">My Batches</h2>
          {viewMode === 'students' && (
            <button
              type="button"
              onClick={() => {
                setViewMode('batches');
                setSelectedBatchId('');
              }}
              className="px-4 py-2 rounded bg-oxford-blue/10 text-oxford-blue hover:bg-oxford-blue/20"
            >
              ← Back to Batches
            </button>
          )}
        </div>

        {/* Level 1: Batch List */}
        {viewMode === 'batches' && (
          <div className="space-y-3">
            {myBatches.length === 0 ? (
              <div className="p-4 bg-selective-yellow/10 border border-selective-yellow rounded text-gray-700">
                No batches assigned. Contact your administrator.
              </div>
            ) : (
              myBatches.map(batch => {
                const quiz = quizzes.find(q => q.id === batch.quizId);
                const batchStudents = students.filter(s => s.batchId === batch.id);
                const completedCount = batchStudents.filter(s => {
                  if (!batch.activeQuizId) return false;
                  const attempt = getLatestFinishedAttempt(s.id, batch.activeQuizId, batch.id);
                  return !!attempt;
                }).length;

                let statusBadge = '';
                let statusColor = '';
                if (!batch.activeQuizId) {
                  statusBadge = 'Not Started';
                  statusColor = 'bg-gray-100 text-gray-600';
                } else if (completedCount === 0) {
                  statusBadge = 'In Progress';
                  statusColor = 'bg-yellow-100 text-yellow-700';
                } else if (completedCount < batchStudents.length) {
                  statusBadge = 'In Progress';
                  statusColor = 'bg-yellow-100 text-yellow-700';
                } else {
                  statusBadge = 'Completed';
                  statusColor = 'bg-green-100 text-green-700';
                }

                return (
                  <div key={batch.id} className="p-4 border border-oxford-blue/20 rounded hover:bg-oxford-blue/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBatchId(batch.id);
                            setViewMode('students');
                          }}
                          className="font-semibold text-lg text-oxford-blue hover:underline text-left"
                        >
                          {batch.schoolName}
                        </button>
                        <p className="text-sm text-gray-600">
                          Quiz: {quiz?.name || '–'} | {batchStudents.length} student(s) | {completedCount} completed
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded text-sm font-medium ${statusColor}`}>
                          {statusBadge}
                        </span>
                        {!batch.activeQuizId ? (
                          <button
                            type="button"
                            onClick={() => startQuiz(batch.id)}
                            className="bg-oxford-blue text-white px-4 py-2 rounded hover:bg-oxford-blue/90 flex items-center gap-2"
                          >
                            <Play size={16} /> Start Quiz
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => stopQuiz(batch.id)}
                            className="bg-selective-yellow text-oxford-blue px-4 py-2 rounded hover:bg-selective-yellow/90 font-semibold flex items-center gap-2"
                          >
                            <Square size={16} /> Stop Quiz
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Level 2: Student List for Selected Batch */}
        {viewMode === 'students' && selectedBatchId && (
          <div className="space-y-3">
            {(() => {
              const selectedBatch = myBatches.find(b => b.id === selectedBatchId);
              const quiz = quizzes.find(q => q.id === selectedBatch?.quizId);
              const batchStudents = students.filter(s => s.batchId === selectedBatchId);

              return (
                <>
                  <div className="mb-4 p-4 bg-oxford-blue/5 rounded border border-oxford-blue/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-oxford-blue">{selectedBatch?.schoolName}</h3>
                        <p className="text-sm text-gray-600">Quiz: {quiz?.name || '–'}</p>
                        <p className="text-sm text-gray-600">{batchStudents.length} student(s)</p>
                      </div>
                      <div>
                        {!selectedBatch?.activeQuizId ? (
                          <button
                            type="button"
                            onClick={() => startQuiz(selectedBatchId)}
                            className="bg-oxford-blue text-white px-4 py-2 rounded hover:bg-oxford-blue/90 flex items-center gap-2"
                          >
                            <Play size={16} /> Start Quiz
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => stopQuiz(selectedBatchId)}
                            className="bg-selective-yellow text-oxford-blue px-4 py-2 rounded hover:bg-selective-yellow/90 font-semibold flex items-center gap-2"
                          >
                            <Square size={16} /> Stop Quiz
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {batchStudents.length === 0 ? (
                    <p className="text-gray-600">No students in this batch yet.</p>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-oxford-blue">Students:</h4>
                      {batchStudents.map(student => {
                        const quizId = selectedBatch?.activeQuizId || selectedBatch?.quizId;
                        const attempt = quizId ? getLatestFinishedAttempt(student.id, quizId, selectedBatchId) : null;

                        let statusBadge = '';
                        let statusColor = '';
                        if (!selectedBatch?.activeQuizId) {
                          statusBadge = 'Quiz Not Active';
                          statusColor = 'bg-gray-100 text-gray-600';
                        } else if (!attempt) {
                          statusBadge = 'Not Completed';
                          statusColor = 'bg-yellow-100 text-yellow-700';
                        } else {
                          statusBadge = 'Completed';
                          statusColor = 'bg-green-100 text-green-700';
                        }

                        return (
                          <div key={student.id} className="p-4 border border-oxford-blue/20 rounded bg-white">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-oxford-blue">{student.name}</p>
                                <p className="text-sm text-gray-600">
                                  Username: <span className="font-mono font-medium">{student.username}</span> |
                                  Password: <span className="font-mono font-medium">{student.password}</span>
                                </p>
                                {attempt && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    Score: {attempt.score}/{attempt.total} ({attempt.percentage}%) |
                                    Submitted: {new Date(attempt.finishedAt!).toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded text-sm font-medium ${statusColor}`}>
                                  {statusBadge}
                                </span>
                                {attempt && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCurrentAttempt(attempt);
                                      setCurrentView(VIEWS.STUDENT_REVIEW);
                                    }}
                                    className="px-3 py-1 rounded bg-oxford-blue text-white hover:bg-oxford-blue/90 text-sm"
                                  >
                                    Review
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-4 p-4 bg-white border border-oxford-blue/20 rounded">
                    <h4 className="font-semibold mb-3 text-oxford-blue">Add Student to This Batch:</h4>
                    <div className="flex gap-2 items-center flex-wrap">
                      <select
                        className="p-2 border rounded"
                        value={addSelection[selectedBatchId] || ''}
                        onChange={(e) => setAddSelection(prev => ({ ...prev, [selectedBatchId]: e.target.value }))}
                      >
                        <option value="">Select existing student</option>
                        {myStudents.filter(s => s.batchId !== selectedBatchId).map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.username})</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const sid = addSelection[selectedBatchId];
                          if (!sid) return alert('Select a student to add');
                          const ok = addExistingStudentToBatch(selectedBatchId, sid);
                          if (ok) {
                            alert('Student added to batch');
                            setAddSelection(prev => ({ ...prev, [selectedBatchId]: '' }));
                          }
                        }}
                        className="px-4 py-2 rounded bg-oxford-blue text-white hover:bg-oxford-blue/90"
                      >
                        Add Existing
                      </button>

                      <div className="w-px h-8 bg-gray-300" />

                      <input
                        type="text"
                        placeholder="New student name"
                        className="p-2 border rounded"
                        value={newStudentName[selectedBatchId] || ''}
                        onChange={(e) => setNewStudentName(prev => ({ ...prev, [selectedBatchId]: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const name = newStudentName[selectedBatchId];
                          if (!name) return alert('Enter a student name');
                          const creds = addStudentToBatch(selectedBatchId, name);
                          setNewStudentName(prev => ({ ...prev, [selectedBatchId]: '' }));
                          alert(`Created student ${name}:\nUsername: ${creds.username}\nPassword: ${creds.password}`);
                        }}
                        className="px-4 py-2 rounded bg-oxford-blue text-white hover:bg-oxford-blue/90"
                      >
                        Create New Student
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
