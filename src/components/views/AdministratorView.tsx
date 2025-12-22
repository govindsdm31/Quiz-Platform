/**
 * Administrator View - Comprehensive management interface for questions, quizzes, batches, students, supervisors, and reports
 * This is the largest and most complex view component in the application
 */

import { useState, useEffect } from 'react';
import { Download, Trash2, UserPlus } from 'lucide-react';
import type {
  User,
  Quiz,
  Batch,
  Student,
  Supervisor,
  Question,
  QuestionSet,
  QuizAttempt,
  ViewType,
  CSVUploadResult,
  StudentCreationResult
} from '../../types';
import { VIEWS } from '../../constants';

interface AdministratorViewProps {
  currentUser: User | null;
  quizzes: Quiz[];
  batches: Batch[];
  students: Student[];
  supervisors: Supervisor[];
  questions: Question[];
  questionSets: QuestionSet[];
  quizAttempts: QuizAttempt[];
  uploadQuestionsFromFile: (file: File, subject: string, topic: string, level: string) => Promise<CSVUploadResult>;
  createQuiz: (name: string, duration: number, questionCount: number, subject: string, level: string, labels: string[], questionSetId?: string) => void;
  deleteQuiz: (id: string) => void;
  createBatch: (quizId: string, schoolName: string) => void;
  addStudentToBatch: (batchId: string, studentName: string) => StudentCreationResult;
  addExistingStudentToBatch: (batchId: string, studentId: string) => boolean;
  createSupervisor: (username: string, password: string, batchIds: string[]) => void;
  deleteBatch: (id: string) => void;
  deleteStudent: (id: string) => void;
  deleteSupervisor: (id: string) => void;
  deleteQuestion: (id: string) => void;
  toggleEntity: (id: string, type: 'batch' | 'student' | 'supervisor') => void;
  assignBatchesToSupervisor: (supervisorId: string, batchIds: string[]) => void;
  getLatestFinishedAttempt: (studentId: string, quizId: string, batchId: string) => QuizAttempt | undefined;
  setCurrentAttempt: (attempt: QuizAttempt | null) => void;
  setCurrentView: (view: ViewType) => void;
  setQuestionSets: (sets: QuestionSet[]) => void;
  saveData: (updates: any) => void;
}

export function AdministratorView({
  currentUser,
  quizzes,
  batches,
  students,
  supervisors,
  questions,
  questionSets,
  quizAttempts,
  uploadQuestionsFromFile,
  createQuiz,
  deleteQuiz,
  createBatch,
  addStudentToBatch,
  addExistingStudentToBatch,
  createSupervisor,
  deleteBatch,
  deleteStudent,
  deleteSupervisor,
  deleteQuestion,
  toggleEntity,
  assignBatchesToSupervisor,
  getLatestFinishedAttempt,
  setCurrentAttempt,
  setCurrentView,
  setQuestionSets,
  saveData
}: AdministratorViewProps) {
  const [view, setView] = useState('questions');
  const [genForm, setGenForm] = useState({ subject: '', topic: '', count: 5, level: 'medium' });
  const [quizForm, setQuizForm] = useState({ name: '', label: '', duration: 30, questionCount: 10, subject: '', level: 'medium', questionSetId: '' });
  const [batchForm, setBatchForm] = useState({ quizId: '', schoolName: '' });
  const [studentName, setStudentName] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [supForm, setSupForm] = useState({ username: '', password: '', batchIds: [] });
  const [generatedCreds, setGeneratedCreds] = useState<any[]>([]);
  const [batchAddSelections, setBatchAddSelections] = useState<Record<string, string>>({});
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});
  const [selectedQuestionSetId, setSelectedQuestionSetId] = useState<string | null>(null);

  const myQuizzes = quizzes.filter((q: Quiz) => q.collabSpaceId === currentUser?.collabSpaceId);
  const myBatches = batches.filter((b: Batch) => b.collabSpaceId === currentUser?.collabSpaceId);
  const myStudents = students.filter((s: Student) => s.collabSpaceId === currentUser?.collabSpaceId);
  const mySupervisors = supervisors.filter((s: Supervisor) => s.collabSpaceId === currentUser?.collabSpaceId);
  const myQuestionSets = questionSets.filter((qs: QuestionSet) => qs.collabSpaceId === currentUser?.collabSpaceId);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-4 flex-wrap">
        <button type="button" onClick={() => setView('questions')} className={`px-4 py-2 rounded ${view === 'questions' ? 'bg-oxford-blue text-white' : 'bg-oxford-blue/10 text-oxford-blue hover:bg-oxford-blue/20'}`}>Questions</button>
        <button type="button" onClick={() => setView('quizzes')} className={`px-4 py-2 rounded ${view === 'quizzes' ? 'bg-oxford-blue text-white' : 'bg-oxford-blue/10 text-oxford-blue hover:bg-oxford-blue/20'}`}>Quizzes</button>
        <button type="button" onClick={() => setView('batches')} className={`px-4 py-2 rounded ${view === 'batches' ? 'bg-oxford-blue text-white' : 'bg-oxford-blue/10 text-oxford-blue hover:bg-oxford-blue/20'}`}>Batches</button>
        <button type="button" onClick={() => setView('students')} className={`px-4 py-2 rounded ${view === 'students' ? 'bg-oxford-blue text-white' : 'bg-oxford-blue/10 text-oxford-blue hover:bg-oxford-blue/20'}`}>Students</button>
        <button type="button" onClick={() => setView('supervisors')} className={`px-4 py-2 rounded ${view === 'supervisors' ? 'bg-oxford-blue text-white' : 'bg-oxford-blue/10 text-oxford-blue hover:bg-oxford-blue/20'}`}>Supervisors</button>
        <button type="button" onClick={() => setView('reports')} className={`px-4 py-2 rounded ${view === 'reports' ? 'bg-oxford-blue text-white' : 'bg-oxford-blue/10 text-oxford-blue hover:bg-oxford-blue/20'}`}>Reports</button>
      </div>

      {view === 'questions' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4 text-oxford-blue">Question Bank</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4 items-start">
            <input
              type="text"
              placeholder="Subject"
              className="p-2 border rounded"
              value={genForm.subject}
              onChange={(e) => setGenForm({ ...genForm, subject: e.target.value })}
            />
            <input
              type="text"
              placeholder="Topics (comma separated)"
              className="p-2 border rounded"
              value={genForm.topic}
              onChange={(e) => setGenForm({ ...genForm, topic: e.target.value })}
            />
            <div className="flex gap-2 items-center">
              <select
                className="p-2 border rounded"
                value={genForm.level}
                onChange={(e) => setGenForm({ ...genForm, level: e.target.value })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <input
                id="questions-csv-input"
                type="file"
                accept=".csv,.txt"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const res = await uploadQuestionsFromFile(f, genForm.subject, genForm.topic, genForm.level);
                    alert(`Imported ${res.added} question(s). Label: ${res.label}${res.errors?.length ? `\nErrors: ${res.errors.join('; ')}` : ''}`);
                    setGenForm({ subject: '', topic: '', count: 5, level: 'medium' });
                    (e.target as HTMLInputElement).value = '';
                  } catch (err: any) {
                    alert('Upload failed: ' + (err?.message || err));
                  }
                }}
              />

              <button type="button"
                onClick={() => {
                  const inp = document.getElementById('questions-csv-input') as HTMLInputElement | null;
                  inp?.click();
                }}
                className="bg-oxford-blue text-white px-4 py-2 rounded hover:bg-oxford-blue/90 flex items-center gap-2"
              >
                <Download size={16} /> Upload CSV
              </button>
            </div>
          </div>

          {myQuestionSets.length > 0 && !selectedQuestionSetId && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Question Sets</h3>
              <div className="space-y-2">
                {myQuestionSets.map(qs => (
                  <div key={qs.id} className="p-2 border rounded flex justify-between items-center">
                    <div>
                      <button type="button" onClick={() => setSelectedQuestionSetId(qs.id)} className="font-medium text-left text-blue-700 hover:underline">
                        {qs.label}
                      </button>
                      <div className="text-sm text-gray-600">{qs.questionIds.length} question(s) – {qs.level} – {qs.topics?.join(', ')}</div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button type="button" onClick={() => {
                        if (!confirm('Delete question set? This will not delete the underlying questions.')) return;
                        const updatedSets = questionSets.filter(s => s.id !== qs.id);
                        setQuestionSets(updatedSets);
                        saveData({ questionSets: updatedSets });
                      }} className="text-sm text-red-600 hover:underline">Delete Set</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedQuestionSetId && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{questionSets.find(s => s.id === selectedQuestionSetId)?.label}</h3>
                  <div className="text-sm text-gray-600">{questionSets.find(s => s.id === selectedQuestionSetId)?.questionIds.length} question(s)</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelectedQuestionSetId(null)} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Back to sets</button>
                </div>
              </div>

              <div className="space-y-3">
                {(questionSets.find(s => s.id === selectedQuestionSetId)?.questionIds || []).map((qid: string, idx: number) => {
                  const q = questions.find(qu => qu.id === qid);
                  if (!q) return null;
                  return (
                    <div key={q.id} className="p-3 border rounded">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{idx + 1}. {q.question}</p>
                          <div className="text-sm text-gray-600">Subject: {q.subject} | Topic: {q.topic} | Level: {q.level}</div>
                          <div className="mt-2 space-y-1">
                            {q.options.map((opt: string, i: number) => {
                              const isCorrect = q.correctAnswer === i;
                              return (
                                <div key={i} className={`p-2 border rounded ${isCorrect ? 'bg-green-50' : 'bg-white'}`}>
                                  <div className="flex justify-between items-center">
                                    <span>{String.fromCharCode(65 + i)}. {opt}</span>
                                    {isCorrect && <span className="text-xs text-green-700 font-semibold">Correct</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <button type="button" onClick={() => {
                            if (!confirm('Delete this question?')) return;
                            deleteQuestion(q.id);
                          }} className="text-red-600 hover:text-red-800 flex items-center gap-2">
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'quizzes' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4 text-oxford-blue">Create Quiz</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-oxford-blue mb-1">Quiz Name *</label>
              <input type="text" placeholder="Enter quiz name" className="w-full p-2 border rounded" value={quizForm.name} onChange={(e) => setQuizForm({ ...quizForm, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-oxford-blue mb-1">Label (optional)</label>
              <input type="text" placeholder="e.g., Final Exam" className="w-full p-2 border rounded" value={quizForm.label} onChange={(e) => setQuizForm({ ...quizForm, label: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-oxford-blue mb-1">Duration (minutes) *</label>
              <input type="number" placeholder="30" className="w-full p-2 border rounded" value={quizForm.duration} onChange={(e) => setQuizForm({ ...quizForm, duration: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-oxford-blue mb-1">Number of Questions *</label>
              <input type="number" placeholder="10" className="w-full p-2 border rounded" value={quizForm.questionCount} onChange={(e) => setQuizForm({ ...quizForm, questionCount: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-oxford-blue mb-1">Subject *</label>
              <input type="text" placeholder="e.g., Mathematics" className="w-full p-2 border rounded" value={quizForm.subject} onChange={(e) => setQuizForm({ ...quizForm, subject: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-oxford-blue mb-1">Difficulty Level</label>
              <select className="w-full p-2 border rounded" value={quizForm.level} onChange={(e) => setQuizForm({ ...quizForm, level: e.target.value })}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-oxford-blue mb-1">Question Set (optional)</label>
              <select className="w-full p-2 border rounded" value={quizForm.questionSetId || ''} onChange={(e) => setQuizForm({ ...quizForm, questionSetId: e.target.value })}>
                <option value="">None - Random selection</option>
                {myQuestionSets.map(qs => <option key={qs.id} value={qs.id}>{qs.label} ({qs.questionIds.length})</option>)}
              </select>
            </div>

            <div className="flex items-end">
              <button type="button"
                onClick={() => {
                  if (quizForm.name && quizForm.subject) {
                    const labels = quizForm.label ? [quizForm.label] : [];
                    createQuiz(quizForm.name, quizForm.duration, quizForm.questionCount, quizForm.subject, quizForm.level, labels, quizForm.questionSetId || undefined);
                    setQuizForm({ name: '', label: '', duration: 30, questionCount: 10, subject: '', level: 'medium', questionSetId: '' });
                  }
                }}
                className="w-full bg-oxford-blue text-white px-4 py-2 rounded hover:bg-oxford-blue/90"
              >
                Create Quiz
              </button>
            </div>
          </div>

          <h3 className="text-xl font-bold mb-3 mt-6 text-oxford-blue">Existing Quizzes</h3>

          <div className="space-y-2">
            {myQuizzes.map(q => (
              <div key={q.id} className="p-3 border rounded flex justify-between items-start">
                <div>
                  <p className="font-medium text-oxford-blue">{q.name}</p>
                  <p className="text-sm text-gray-600">Duration: {q.duration} min | Questions: {q.questionCount} | Subject: {q.subject} | Level: {q.level} {q.labels?.length ? `| Label: ${q.labels.join(', ')}` : ''} {q.questionSetId ? `| Set: ${questionSets.find(s => s.id === q.questionSetId)?.label}` : ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete quiz "${q.name}"? This action cannot be undone.`)) {
                      deleteQuiz(q.id);
                    }
                  }}
                  className="px-3 py-1 rounded text-sm bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'batches' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Batches</h2>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <select className="p-2 border rounded" value={batchForm.quizId} onChange={(e) => setBatchForm({ ...batchForm, quizId: e.target.value })}>
              <option value="">Select Quiz</option>
              {myQuizzes.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
            <input type="text" placeholder="School Name" className="p-2 border rounded" value={batchForm.schoolName} onChange={(e) => setBatchForm({ ...batchForm, schoolName: e.target.value })} />
            <div />
            <button type="button"
              onClick={() => {
                if (batchForm.quizId && batchForm.schoolName) {
                  createBatch(batchForm.quizId, batchForm.schoolName);
                  setBatchForm({ quizId: '', schoolName: '' });
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Create Batch
            </button>
          </div>

          <div className="space-y-2">
            {myBatches.map(b => {
              const quiz = myQuizzes.find(q => q.id === b.quizId);
              const batchStudents = myStudents.filter(s => s.batchId === b.id);
              return (
                <div key={b.id} className="p-3 border rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <button
                        type="button"
                        onClick={() => setExpandedBatches(prev => ({ ...prev, [b.id]: !prev[b.id] }))}
                        className="font-medium text-left"
                      >
                        {b.schoolName} - {quiz?.name || '–'}
                      </button>
                      <p className="text-sm text-gray-600">Students: {batchStudents.length}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => toggleEntity(b.id, 'batch')} className={`px-3 py-1 rounded text-sm ${b.active ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>
                        {b.active ? 'Active' : 'Inactive'}
                      </button>
                      <button type="button" onClick={() => deleteBatch(b.id)} className="px-3 py-1 rounded text-sm bg-red-600 text-white hover:bg-red-700">Delete</button>
                    </div>
                  </div>

                  <div className="mt-2 flex gap-2 items-center">
                    <select
                      className="p-2 border rounded"
                      value={batchAddSelections[b.id] || ''}
                      onChange={(e) => setBatchAddSelections(prev => ({ ...prev, [b.id]: e.target.value }))}
                    >
                      <option value="">Add existing student</option>
                      {myStudents.filter(s => s.batchId !== b.id).map(s => <option key={s.id} value={s.id}>{s.name} ({s.username})</option>)}
                    </select>
                    <button type="button" onClick={() => {
                      const sid = batchAddSelections[b.id];
                      if (!sid) return alert('Select a student to add');
                      const ok = addExistingStudentToBatch(b.id, sid);
                      if (ok) {
                        alert('Student added to batch');
                        setBatchAddSelections(prev => ({ ...prev, [b.id]: '' }));
                      }
                    }} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Add</button>
                  </div>

                  {expandedBatches[b.id] && (
                    <div className="mt-3 border-t pt-3 space-y-2">
                      <h4 className="font-semibold">Students in {b.schoolName}</h4>
                      {batchStudents.length === 0 && <div className="text-sm text-gray-600">No students in this batch.</div>}
                      {batchStudents.map(s => {
                        const quizId = b.activeQuizId || b.quizId;
                        const attempt = quizId ? getLatestFinishedAttempt(s.id, quizId, b.id) : null;
                        return (
                          <div key={s.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-gray-600">{s.username}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm">
                                {quizId ? (attempt ? <span className="text-green-700">Completed – {attempt.percentage}%</span> : <span className="text-yellow-700">Incomplete</span>) : <span className="text-gray-600">No quiz</span>}
                              </div>
                              {attempt && (
                                <button type="button" onClick={() => { setCurrentAttempt(attempt); setCurrentView(VIEWS.STUDENT_REVIEW); }} className="text-sm text-blue-600 hover:underline">Review</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'students' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Students</h2>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="Student Name" className="flex-1 p-2 border rounded" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            <select className="p-2 border rounded" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
              <option value="">Select Batch</option>
              {myBatches.filter((b: Batch) => b.active).map((b: Batch) => <option key={b.id} value={b.id}>{b.schoolName}</option>)}
            </select>
            <button type="button" onClick={() => { if (studentName && selectedBatch) { const creds = addStudentToBatch(selectedBatch, studentName); setGeneratedCreds([...generatedCreds, { name: studentName, ...creds }]); setStudentName(''); } }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
              <UserPlus size={20} /> Add Student
            </button>
          </div>

          {generatedCreds.length > 0 && (
            <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded">
              <p className="font-semibold mb-2">Generated Credentials:</p>
              {generatedCreds.map((c, i) => <p key={i} className="text-sm">{c.name}: {c.username} / {c.password}</p>)}
              <button type="button" onClick={() => setGeneratedCreds([])} className="mt-2 text-sm text-blue-600 hover:underline">Clear</button>
            </div>
          )}

          <div className="space-y-2">
            {myStudents.map(s => {
              const batch = myBatches.find(b => b.id === s.batchId);
              return (
                <div key={s.id} className="p-3 border rounded flex justify-between items-center">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-gray-600">{s.username} | Batch: {batch?.schoolName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => toggleEntity(s.id, 'student')} className={`px-3 py-1 rounded text-sm ${s.active ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>{s.active ? 'Active' : 'Inactive'}</button>
                    <button type="button" onClick={() => {
                      if (confirm('Delete this student?')) deleteStudent(s.id);
                    }} className="px-3 py-1 rounded text-sm bg-red-600 text-white hover:bg-red-700"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'supervisors' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Supervisors</h2>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <input type="text" placeholder="Username" className="p-2 border rounded" value={supForm.username} onChange={(e) => setSupForm({ ...supForm, username: e.target.value })} />
            <input type="password" placeholder="Password" className="p-2 border rounded" value={supForm.password} onChange={(e) => setSupForm({ ...supForm, password: e.target.value })} />
            <button type="button" onClick={() => { if (supForm.username && supForm.password) { createSupervisor(supForm.username, supForm.password, []); setSupForm({ username: '', password: '', batchIds: [] }); } }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Supervisor</button>
          </div>

          <div className="space-y-4">
            {mySupervisors.map(s => {
              const assigned = Array.isArray(s.batchIds) ? s.batchIds : [];
              return (
                <div key={s.id} className="p-3 border rounded">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div>
                      <p className="font-medium">{s.username}</p>
                      <p className="text-sm text-gray-600">{assigned.length} assigned batch(es)</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => toggleEntity(s.id, 'supervisor')} className={`px-3 py-1 rounded text-sm ${s.active ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>{s.active ? 'Active' : 'Inactive'}</button>
                      <button type="button" onClick={() => { if (confirm('Delete this supervisor?')) deleteSupervisor(s.id); }} className="px-3 py-1 rounded text-sm bg-red-600 text-white hover:bg-red-700"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="text-sm font-medium mb-1 block">Assign Batches</label>
                    <select
                      multiple
                      value={assigned}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                        assignBatchesToSupervisor(s.id, selected);
                      }}
                      className="w-full p-2 border rounded h-32"
                      aria-label={`Assign batches to ${s.username}`}
                    >
                      {myBatches.map((b: Batch) => <option key={b.id} value={b.id}>{b.schoolName}</option>)}
                    </select>

                    {assigned.length > 0 && (
                      <div className="mt-2 text-sm text-gray-700">
                        Assigned: {assigned.map((id: string) => myBatches.find((b: Batch) => b.id === id)?.schoolName).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'reports' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Reports</h2>

          <div className="mb-4 flex gap-2 items-center">
            <select className="p-2 border rounded" onChange={() => { }} id="report-quiz-select" defaultValue="">
              <option value="">Select Quiz</option>
              {myQuizzes.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
            <ReportPanel
              quizzes={myQuizzes}
              batches={myBatches}
              quizAttempts={quizAttempts}
              setCurrentAttempt={setCurrentAttempt}
              setCurrentView={setCurrentView}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Report Panel Component - Nested helper component for the reports view
function ReportPanel({
  quizzes,
  batches,
  quizAttempts,
  setCurrentAttempt,
  setCurrentView
}: {
  quizzes: Quiz[];
  batches: Batch[];
  quizAttempts: QuizAttempt[];
  setCurrentAttempt: (attempt: QuizAttempt) => void;
  setCurrentView: (view: ViewType) => void;
}) {
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  useEffect(() => {
    if (quizzes.length && !selectedQuizId) {
      setSelectedQuizId(quizzes[0].id);
    }
    if (batches.length && selectedBatchIds.length === 0) {
      setSelectedBatchIds(batches.map((b: Batch) => b.id));
    }
  }, [quizzes, batches, selectedQuizId, selectedBatchIds.length]);

  const attemptsFor = (quizId: string, batchIds: string[]) => {
    return quizAttempts.filter(a => a.quizId === quizId && batchIds.includes(a.batchId) && a.finishedAt);
  };

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-3 items-center">
        <select className="p-2 border rounded" value={selectedQuizId} onChange={(e) => setSelectedQuizId(e.target.value)}>
          {quizzes.map((q: Quiz) => <option key={q.id} value={q.id}>{q.name}</option>)}
        </select>

        <select multiple className="p-2 border rounded" value={selectedBatchIds} onChange={(e) => setSelectedBatchIds(Array.from(e.target.selectedOptions).map(o => o.value))} style={{ minWidth: 240 }}>
          {batches.map((b: Batch) => <option key={b.id} value={b.id}>{b.schoolName}</option>)}
        </select>
      </div>

      {selectedQuizId ? (
        <div>
          {selectedBatchIds.map((batchId: string) => {
            const batch = batches.find((b: Batch) => b.id === batchId);
            const attempts = attemptsFor(selectedQuizId, [batchId]);
            const avg = attempts.length > 0 ? (attempts.reduce((s: number, a: QuizAttempt) => s + parseFloat(a.percentage.toString()), 0) / attempts.length).toFixed(2) : '0';
            return (
              <div key={batchId} className="p-3 border rounded mb-2">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="font-medium">{batch?.schoolName}</div>
                    <div className="text-sm text-gray-600">Attempts: {attempts.length} | Avg: {avg}%</div>
                  </div>
                  <div />
                </div>

                <div className="space-y-1">
                  {attempts.map((a: QuizAttempt) => (
                    <div key={a.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{a.studentName}</div>
                        <div className="text-xs text-gray-600">{new Date(a.startedAt).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{a.score}/{a.total} ({a.percentage}%)</div>
                        <button type="button" onClick={() => { setCurrentAttempt(a); setCurrentView(VIEWS.STUDENT_REVIEW); }} className="text-sm text-blue-600 hover:underline">Review</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : <div className="text-sm text-gray-600">Select a quiz to view reports.</div>}
    </div>
  );
}
