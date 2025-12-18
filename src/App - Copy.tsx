import React, { useState, useEffect } from 'react';
import { AlertCircle, Users, BookOpen, ClipboardList, Settings, LogOut, Play, Square, Clock, CheckCircle, XCircle, Eye, Plus, Trash2, Edit, UserPlus, Download } from 'lucide-react';

const QuizPlatform = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [collabSpaces, setCollabSpaces] = useState([]);
  const [administrators, setAdministrators] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [currentView, setCurrentView] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [selectedCollabSpace, setSelectedCollabSpace] = useState(null);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const storageData = await window.storage.get('platform-data');
        if (storageData) {
          const data = JSON.parse(storageData.value);
          setUsers(data.users || []);
          setCollabSpaces(data.collabSpaces || []);
          setAdministrators(data.administrators || []);
          setQuestions(data.questions || []);
          setQuizzes(data.quizzes || []);
          setBatches(data.batches || []);
          setStudents(data.students || []);
          setSupervisors(data.supervisors || []);
          setQuizAttempts(data.quizAttempts || []);
        } else {
          const initialUsers = [{
            id: 'owner-1',
            username: 'owner',
            password: 'owner123',
            role: 'owner',
            active: true
          }];
          setUsers(initialUsers);
          await saveData({ users: initialUsers });
        }
      } catch (err) {
        console.error('Storage error:', err);
        const initialUsers = [{
          id: 'owner-1',
          username: 'owner',
          password: 'owner123',
          role: 'owner',
          active: true
        }];
        setUsers(initialUsers);
      }
    };
    initData();

    // load remembered username (localStorage used for convenience)
    const remembered = localStorage.getItem('rememberedUsername');
    if (remembered) {
      setLoginForm(prev => ({ ...prev, username: remembered }));
      setRememberMe(true);
    }
  }, []);

  const saveData = async (updates = {}) => {
    const data = {
      users: updates.users !== undefined ? updates.users : users,
      collabSpaces: updates.collabSpaces !== undefined ? updates.collabSpaces : collabSpaces,
      administrators: updates.administrators !== undefined ? updates.administrators : administrators,
      questions: updates.questions !== undefined ? updates.questions : questions,
      quizzes: updates.quizzes !== undefined ? updates.quizzes : quizzes,
      batches: updates.batches !== undefined ? updates.batches : batches,
      students: updates.students !== undefined ? updates.students : students,
      supervisors: updates.supervisors !== undefined ? updates.supervisors : supervisors,
      quizAttempts: updates.quizAttempts !== undefined ? updates.quizAttempts : quizAttempts
    };
    try {
      await window.storage.set('platform-data', JSON.stringify(data));
    } catch (err) {
      console.error('Failed to save data:', err);
    }
  };

  const handleLogin = () => {
    setError('');
    const user = users.find(u => 
      u.username === loginForm.username && 
      u.password === loginForm.password &&
      u.active
    );

    if (!user) {
      setError('Invalid credentials or account inactive');
      return;
    }

    // remember username if requested
    try {
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', loginForm.username);
      } else {
        localStorage.removeItem('rememberedUsername');
      }
    } catch (e) {
      console.warn('Could not access localStorage', e);
    }

    if (user.role === 'student') {
      const studentBatch = batches.find(b => 
        b.studentIds && b.studentIds.includes(user.id) && b.active
      );
      
      if (!studentBatch || !studentBatch.activeQuizId) {
        setError('No active quiz assigned. Please contact your supervisor.');
        return;
      }
    }

    setCurrentUser(user);
    setCurrentView(user.role === 'owner' ? 'collab-spaces' : 
                   user.role === 'administrator' ? 'questions' :
                   user.role === 'supervisor' ? 'batches' : 'student-quiz');
    setLoginForm({ username: '', password: '' });
    setShowPassword(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('login');
    setSelectedCollabSpace(null);
    setActiveQuiz(null);
  };

  const createCollabSpace = (name) => {
    const newSpace = {
      id: `space-${Date.now()}`,
      name,
      active: true,
      createdAt: new Date().toISOString()
    };
    const updated = [...collabSpaces, newSpace];
    setCollabSpaces(updated);
    saveData({ collabSpaces: updated });
  };

  const toggleCollabSpace = (spaceId) => {
    const updated = collabSpaces.map(s => 
      s.id === spaceId ? { ...s, active: !s.active } : s
    );
    setCollabSpaces(updated);
    saveData({ collabSpaces: updated });
  };

  const createAdministrator = (username, password, spaceId) => {
    const newAdmin = {
      id: `admin-${Date.now()}`,
      username,
      password,
      role: 'administrator',
      active: true,
      collabSpaceId: spaceId
    };
    const updatedUsers = [...users, newAdmin];
    const updatedAdmins = [...administrators, newAdmin];
    setUsers(updatedUsers);
    setAdministrators(updatedAdmins);
    saveData({ users: updatedUsers, administrators: updatedAdmins });
  };

  const toggleAdministrator = (adminId) => {
    const updatedUsers = users.map(u => 
      u.id === adminId ? { ...u, active: !u.active } : u
    );
    const updatedAdmins = administrators.map(a => 
      a.id === adminId ? { ...a, active: !a.active } : a
    );
    setUsers(updatedUsers);
    setAdministrators(updatedAdmins);
    saveData({ users: updatedUsers, administrators: updatedAdmins });
  };

  const generateQuestions = async (subject, topic, count, level) => {
    const newQuestions = [];
    const label = `${subject}-${topic}-${level}-${Date.now()}`;
    
    for (let i = 0; i < count; i++) {
      newQuestions.push({
        id: `q-${Date.now()}-${i}`,
        subject,
        topic,
        level,
        label,
        question: `Sample ${level} question ${i + 1} about ${topic}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 0,
        collabSpaceId: currentUser.collabSpaceId,
        createdAt: new Date().toISOString()
      });
    }
    
    const updated = [...questions, ...newQuestions];
    setQuestions(updated);
    saveData({ questions: updated });
    return label;
  };

  const deleteQuestion = (questionId) => {
    const updated = questions.filter(q => q.id !== questionId);
    setQuestions(updated);
    saveData({ questions: updated });
  };

  const createQuiz = (name, duration, questionCount, subject, level, labels) => {
    const newQuiz = {
      id: `quiz-${Date.now()}`,
      name,
      duration,
      questionCount,
      subject,
      level,
      labels: labels || [],
      collabSpaceId: currentUser.collabSpaceId,
      createdAt: new Date().toISOString()
    };
    const updated = [...quizzes, newQuiz];
    setQuizzes(updated);
    saveData({ quizzes: updated });
    return newQuiz.id;
  };

  const createBatch = (quizId, schoolName, subject) => {
    const newBatch = {
      id: `batch-${Date.now()}`,
      quizId,
      schoolName,
      subject,
      studentIds: [],
      supervisorIds: [],
      active: true,
      activeQuizId: null,
      collabSpaceId: currentUser.collabSpaceId,
      createdAt: new Date().toISOString()
    };
    const updated = [...batches, newBatch];
    setBatches(updated);
    saveData({ batches: updated });
    return newBatch.id;
  };

  const addStudentToBatch = (batchId, name) => {
    const username = `${name.toLowerCase().replace(/\s+/g, '')}_${Date.now()}`;
    const password = `pass${Math.floor(Math.random() * 10000)}`;
    
    const newStudent = {
      id: `student-${Date.now()}`,
      name,
      username,
      password,
      role: 'student',
      batchId,
      active: true,
      collabSpaceId: currentUser.collabSpaceId
    };
    
    const updatedUsers = [...users, newStudent];
    const updatedStudents = [...students, newStudent];
    const updatedBatches = batches.map(b => 
      b.id === batchId 
        ? { ...b, studentIds: [...(b.studentIds || []), newStudent.id] }
        : b
    );
    
    setUsers(updatedUsers);
    setStudents(updatedStudents);
    setBatches(updatedBatches);
    saveData({ users: updatedUsers, students: updatedStudents, batches: updatedBatches });
    
    return { username, password };
  };

  const createSupervisor = (username, password, batchIds) => {
    const newSupervisor = {
      id: `sup-${Date.now()}`,
      username,
      password,
      role: 'supervisor',
      batchIds: batchIds || [],
      active: true,
      collabSpaceId: currentUser.collabSpaceId
    };
    
    const updatedUsers = [...users, newSupervisor];
    const updatedSupervisors = [...supervisors, newSupervisor];
    
    setUsers(updatedUsers);
    setSupervisors(updatedSupervisors);
    saveData({ users: updatedUsers, supervisors: updatedSupervisors });
  };

  const toggleEntity = (id, type) => {
    if (type === 'student') {
      const updatedUsers = users.map(u => 
        u.id === id ? { ...u, active: !u.active } : u
      );
      const updatedStudents = students.map(s => 
        s.id === id ? { ...s, active: !s.active } : s
      );
      setUsers(updatedUsers);
      setStudents(updatedStudents);
      saveData({ users: updatedUsers, students: updatedStudents });
    } else if (type === 'supervisor') {
      const updatedUsers = users.map(u => 
        u.id === id ? { ...u, active: !u.active } : u
      );
      const updatedSupervisors = supervisors.map(s => 
        s.id === id ? { ...s, active: !s.active } : s
      );
      setUsers(updatedUsers);
      setSupervisors(updatedSupervisors);
      saveData({ users: updatedUsers, supervisors: updatedSupervisors });
    } else if (type === 'batch') {
      const updatedBatches = batches.map(b => 
        b.id === id ? { ...b, active: !b.active } : b
      );
      setBatches(updatedBatches);
      saveData({ batches: updatedBatches });
    }
  };

  const startQuiz = (batchId) => {
    const updatedBatches = batches.map(b => {
      if (b.id === batchId) {
        return { ...b, activeQuizId: b.quizId, quizStartTime: new Date().toISOString() };
      }
      return b;
    });
    setBatches(updatedBatches);
    saveData({ batches: updatedBatches });
  };

  const stopQuiz = (batchId) => {
    const updatedBatches = batches.map(b => {
      if (b.id === batchId) {
        return { ...b, activeQuizId: null, quizStartTime: null };
      }
      return b;
    });
    setBatches(updatedBatches);
    saveData({ batches: updatedBatches });
  };

  const startStudentQuiz = () => {
    const studentBatch = batches.find(b => b.studentIds && b.studentIds.includes(currentUser.id) && b.active && b.activeQuizId);
    
    if (!studentBatch) return;
    
    const quiz = quizzes.find(q => q.id === studentBatch.activeQuizId);
    if (!quiz) return;
    
    const availableQuestions = questions.filter(q => 
      q.subject === quiz.subject &&
      q.level === quiz.level &&
      (quiz.labels.length === 0 || quiz.labels.includes(q.label))
    );
    
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, quiz.questionCount);
    
    setActiveQuiz({
      ...quiz,
      questions: selectedQuestions,
      answers: {},
      startTime: Date.now(),
      batchId: studentBatch.id
    });
  };

  const submitAnswer = (questionId, answer) => {
    setActiveQuiz(prev => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer }
    }));
  };

  const submitQuiz = () => {
    if (!activeQuiz) return;
    
    const results = activeQuiz.questions.map(q => ({
      questionId: q.id,
      question: q.question,
      selectedAnswer: activeQuiz.answers[q.id],
      correctAnswer: q.correctAnswer,
      correct: activeQuiz.answers[q.id] === q.correctAnswer
    }));
    
    const score = results.filter(r => r.correct).length;
    const total = results.length;
    
    const attempt = {
      id: `attempt-${Date.now()}`,
      studentId: currentUser.id,
      studentName: currentUser.name,
      quizId: activeQuiz.id,
      quizName: activeQuiz.name,
      batchId: activeQuiz.batchId,
      results,
      score,
      total,
      percentage: (score / total * 100).toFixed(2),
      submittedAt: new Date().toISOString(),
      timeTaken: Math.floor((Date.now() - activeQuiz.startTime) / 1000)
    };
    
    const updated = [...quizAttempts, attempt];
    setQuizAttempts(updated);
    saveData({ quizAttempts: updated });
    setActiveQuiz(null);
    setCurrentView('student-results');
  };

  useEffect(() => {
    if (activeQuiz && activeQuiz.duration) {
      const timer = setTimeout(() => {
        submitQuiz();
      }, activeQuiz.duration * 60 * 1000);
      
      return () => clearTimeout(timer);
    }
  }, [activeQuiz]);

  const LoginView = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Quiz Platform</h1>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center gap-2" role="alert" aria-live="assertive">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div> 
        )}
        <div className="space-y-4">
          <label htmlFor="username" className="sr-only">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Username"
            autoComplete="username"
            autoFocus
            aria-label="Username"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={loginForm.username}
            onChange={(e) => { setLoginForm({ ...loginForm, username: e.target.value }); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />

          <label htmlFor="password" className="sr-only">Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              autoComplete="current-password"
              aria-label="Password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              value={loginForm.password}
              onChange={(e) => { setLoginForm({ ...loginForm, password: e.target.value }); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              <Eye size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Remember username</span>
            </label>
            <button
              onClick={handleLogin}
              type="button"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-semibold"
            >
              Login
            </button>
          </div>
        </div>
        <div className="mt-6 p-4 bg-gray-50 rounded text-sm">
          <p className="font-semibold mb-2">Demo Credentials:</p>
          <p>Owner: owner / owner123</p>
        </div>
      </div>
    </div>
  );

  const OwnerView = () => {
    const [newSpaceName, setNewSpaceName] = useState('');
    const [newAdminForm, setNewAdminForm] = useState({ username: '', password: '', spaceId: '' });

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Settings className="text-blue-600" />
            Collaboration Spaces
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Space name"
              className="flex-1 p-2 border rounded"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
            />
            <button
              onClick={() => {
                if (newSpaceName.trim()) {
                  createCollabSpace(newSpaceName);
                  setNewSpaceName('');
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} /> Create Space
            </button>
          </div>
          <div className="space-y-2">
            {collabSpaces.map(space => (
              <div key={space.id} className="flex items-center justify-between p-3 border rounded">
                <span className="font-medium">{space.name}</span>
                <button
                  onClick={() => toggleCollabSpace(space.id)}
                  className={`px-4 py-1 rounded ${space.active ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}
                >
                  {space.active ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Users className="text-purple-600" />
            Administrators
          </h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <input
              type="text"
              placeholder="Username"
              className="p-2 border rounded"
              value={newAdminForm.username}
              onChange={(e) => setNewAdminForm({ ...newAdminForm, username: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              className="p-2 border rounded"
              value={newAdminForm.password}
              onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
            />
            <select
              className="p-2 border rounded"
              value={newAdminForm.spaceId}
              onChange={(e) => setNewAdminForm({ ...newAdminForm, spaceId: e.target.value })}
            >
              <option value="">Select Space</option>
              {collabSpaces.filter(s => s.active).map(space => (
                <option key={space.id} value={space.id}>{space.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              if (newAdminForm.username && newAdminForm.password && newAdminForm.spaceId) {
                createAdministrator(newAdminForm.username, newAdminForm.password, newAdminForm.spaceId);
                setNewAdminForm({ username: '', password: '', spaceId: '' });
              }
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 mb-4 flex items-center gap-2"
          >
            <Plus size={20} /> Create Administrator
          </button>
          <div className="space-y-2">
            {administrators.map(admin => (
              <div key={admin.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <span className="font-medium">{admin.username}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    ({collabSpaces.find(s => s.id === admin.collabSpaceId)?.name})
                  </span>
                </div>
                <button
                  onClick={() => toggleAdministrator(admin.id)}
                  className={`px-4 py-1 rounded ${admin.active ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}
                >
                  {admin.active ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const AdministratorView = () => {
    const [view, setView] = useState('questions');
    const [genForm, setGenForm] = useState({ subject: '', topic: '', count: 5, level: 'medium' });
    const [quizForm, setQuizForm] = useState({ name: '', duration: 30, questionCount: 10, subject: '', level: 'medium' });
    const [batchForm, setBatchForm] = useState({ quizId: '', schoolName: '', subject: '' });
    const [studentName, setStudentName] = useState('');
    const [selectedBatch, setSelectedBatch] = useState('');
    const [supForm, setSupForm] = useState({ username: '', password: '', batchIds: [] });
    const [generatedCreds, setGeneratedCreds] = useState([]);

    const myQuestions = questions.filter(q => q.collabSpaceId === currentUser.collabSpaceId);
    const myQuizzes = quizzes.filter(q => q.collabSpaceId === currentUser.collabSpaceId);
    const myBatches = batches.filter(b => b.collabSpaceId === currentUser.collabSpaceId);
    const myStudents = students.filter(s => s.collabSpaceId === currentUser.collabSpaceId);
    const mySupervisors = supervisors.filter(s => s.collabSpaceId === currentUser.collabSpaceId);

    return (
      <div className="space-y-6">
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setView('questions')} className={`px-4 py-2 rounded ${view === 'questions' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Questions</button>
          <button onClick={() => setView('quizzes')} className={`px-4 py-2 rounded ${view === 'quizzes' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Quizzes</button>
          <button onClick={() => setView('batches')} className={`px-4 py-2 rounded ${view === 'batches' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Batches</button>
          <button onClick={() => setView('students')} className={`px-4 py-2 rounded ${view === 'students' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Students</button>
          <button onClick={() => setView('supervisors')} className={`px-4 py-2 rounded ${view === 'supervisors' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Supervisors</button>
          <button onClick={() => setView('reports')} className={`px-4 py-2 rounded ${view === 'reports' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Reports</button>
        </div>

        {view === 'questions' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Question Bank</h2>
            <div className="grid grid-cols-5 gap-2 mb-4">
              <input type="text" placeholder="Subject" className="p-2 border rounded" value={genForm.subject} onChange={(e) => setGenForm({ ...genForm, subject: e.target.value })} />
              <input type="text" placeholder="Topic" className="p-2 border rounded" value={genForm.topic} onChange={(e) => setGenForm({ ...genForm, topic: e.target.value })} />
              <input type="number" placeholder="Count" className="p-2 border rounded" value={genForm.count} onChange={(e) => setGenForm({ ...genForm, count: parseInt(e.target.value) })} />
              <select className="p-2 border rounded" value={genForm.level} onChange={(e) => setGenForm({ ...genForm, level: e.target.value })}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <button onClick={() => generateQuestions(genForm.subject, genForm.topic, genForm.count, genForm.level)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Generate</button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {myQuestions.map(q => (
                <div key={q.id} className="p-3 border rounded flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">{q.question}</p>
                    <p className="text-sm text-gray-600">Subject: {q.subject} | Topic: {q.topic} | Level: {q.level} | Label: {q.label}</p>
                  </div>
                  <button onClick={() => deleteQuestion(q.id)} className="text-red-600 hover:text-red-800"><Trash2 size={20} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'quizzes' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Quizzes</h2>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <input type="text" placeholder="Quiz Name" className="p-2 border rounded" value={quizForm.name} onChange={(e) => setQuizForm({ ...quizForm, name: e.target.value })} />
              <input type="number" placeholder="Duration (min)" className="p-2 border rounded" value={quizForm.duration} onChange={(e) => setQuizForm({ ...quizForm, duration: parseInt(e.target.value) })} />
              <input type="number" placeholder="Question Count" className="p-2 border rounded" value={quizForm.questionCount} onChange={(e) => setQuizForm({ ...quizForm, questionCount: parseInt(e.target.value) })} />
              <input type="text" placeholder="Subject" className="p-2 border rounded" value={quizForm.subject} onChange={(e) => setQuizForm({ ...quizForm, subject: e.target.value })} />
              <select className="p-2 border rounded" value={quizForm.level} onChange={(e) => setQuizForm({ ...quizForm, level: e.target.value })}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <button onClick={() => { if (quizForm.name && quizForm.subject) { createQuiz(quizForm.name, quizForm.duration, quizForm.questionCount, quizForm.subject, quizForm.level, []); setQuizForm({ name: '', duration: 30, questionCount: 10, subject: '', level: 'medium' }); } }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Quiz</button>
            </div>
            <div className="space-y-2">
              {myQuizzes.map(q => (
                <div key={q.id} className="p-3 border rounded">
                  <p className="font-medium">{q.name}</p>
                  <p className="text-sm text-gray-600">Duration: {q.duration} min | Questions: {q.questionCount} | Subject: {q.subject} | Level: {q.level}</p>
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
              <input type="text" placeholder="Subject" className="p-2 border rounded" value={batchForm.subject} onChange={(e) => setBatchForm({ ...batchForm, subject: e.target.value })} />
              <button onClick={() => { if (batchForm.quizId && batchForm.schoolName && batchForm.subject) { createBatch(batchForm.quizId, batchForm.schoolName, batchForm.subject); setBatchForm({ quizId: '', schoolName: '', subject: '' }); } }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Batch</button>
            </div>
            <div className="space-y-2">
              {myBatches.map(b => {
                const quiz = myQuizzes.find(q => q.id === b.quizId);
                const batchStudents = myStudents.filter(s => s.batchId === b.id);
                return (
                  <div key={b.id} className="p-3 border rounded">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{b.schoolName} - {b.subject}</p>
                        <p className="text-sm text-gray-600">Quiz: {quiz?.name} | Students: {batchStudents.length}</p>
                      </div>
                      <button onClick={() => toggleEntity(b.id, 'batch')} className={`px-3 py-1 rounded text-sm ${b.active ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>
                        {b.active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
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
                {myBatches.filter(b => b.active).map(b => <option key={b.id} value={b.id}>{b.schoolName} - {b.subject}</option>)}
              </select>
              <button onClick={() => { if (studentName && selectedBatch) { const creds = addStudentToBatch(selectedBatch, studentName); setGeneratedCreds([...generatedCreds, { name: studentName, ...creds }]); setStudentName(''); } }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
                <UserPlus size={20} /> Add Student
              </button>
            </div>
            {generatedCreds.length > 0 && (
              <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded">
                <p className="font-semibold mb-2">Generated Credentials:</p>
                {generatedCreds.map((c, i) => (
                  <p key={i} className="text-sm">{c.name}: {c.username} / {c.password}</p>
                ))}
                <button onClick={() => setGeneratedCreds([])} className="mt-2 text-sm text-blue-600 hover:underline">Clear</button>
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
                    <button onClick={() => toggleEntity(s.id, 'student')} className={`px-3 py-1 rounded text-sm ${s.active ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>
                      {s.active ? 'Active' : 'Inactive'}
                    </button>
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
              <button onClick={() => { if (supForm.username && supForm.password) { createSupervisor(supForm.username, supForm.password, []); setSupForm({ username: '', password: '', batchIds: [] }); } }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Supervisor</button>
            </div>
            <div className="space-y-2">
              {mySupervisors.map(s => (
                <div key={s.id} className="p-3 border rounded flex justify-between items-center">
                  <p className="font-medium">{s.username}</p>
                  <button onClick={() => toggleEntity(s.id, 'supervisor')} className={`px-3 py-1 rounded text-sm ${s.active ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>
                    {s.active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'reports' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Reports</h2>
            <div className="space-y-4">
              {myBatches.map(batch => {
                const batchAttempts = quizAttempts.filter(a => a.batchId === batch.id);
                const avgScore = batchAttempts.length > 0 ? (batchAttempts.reduce((sum, a) => sum + parseFloat(a.percentage), 0) / batchAttempts.length).toFixed(2) : 0;
                return (
                  <div key={batch.id} className="p-4 border rounded">
                    <h3 className="font-bold text-lg mb-2">{batch.schoolName} - {batch.subject}</h3>
                    <p className="text-sm text-gray-600 mb-2">Attempts: {batchAttempts.length} | Average Score: {avgScore}%</p>
                    <div className="space-y-1">
                      {batchAttempts.map(attempt => (
                        <div key={attempt.id} className="text-sm p-2 bg-gray-50 rounded flex justify-between">
                          <span>{attempt.studentName}</span>
                          <span className="font-medium">{attempt.score}/{attempt.total} ({attempt.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const SupervisorView = () => {
    const myBatches = batches.filter(b => supervisors.find(s => s.id === currentUser.id && s.batchIds && s.batchIds.includes(b.id)));
    
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">My Batches</h2>
          <div className="space-y-4">
            {myBatches.map(batch => {
              const quiz = quizzes.find(q => q.id === batch.quizId);
              const batchStudents = students.filter(s => s.batchId === batch.id);
              const batchAttempts = quizAttempts.filter(a => a.batchId === batch.id);
              
              return (
                <div key={batch.id} className="p-4 border rounded">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{batch.schoolName} - {batch.subject}</h3>
                      <p className="text-sm text-gray-600">Quiz: {quiz?.name} | Students: {batchStudents.length}</p>
                    </div>
                    <div className="flex gap-2">
                      {!batch.activeQuizId ? (
                        <button onClick={() => startQuiz(batch.id)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">
                          <Play size={16} /> Start Quiz
                        </button>
                      ) : (
                        <button onClick={() => stopQuiz(batch.id)} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center gap-2">
                          <Square size={16} /> Stop Quiz
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-semibold mb-2">Student Credentials:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {batchStudents.map(s => (
                        <div key={s.id} className="text-sm p-2 bg-gray-50 rounded flex justify-between">
                          <span>{s.name}</span>
                          <span className="font-mono">{s.username} / {s.password}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {batchAttempts.length > 0 && (
                    <div>
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
  };

  const StudentQuizView = () => {
    if (activeQuiz) {
      const timeRemaining = Math.max(0, Math.floor((activeQuiz.startTime + activeQuiz.duration * 60 * 1000 - Date.now()) / 1000));
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = timeRemaining % 60;

      return (
        <div className="min-h-screen bg-gray-100 p-4">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{activeQuiz.name}</h2>
              <div className="flex items-center gap-2 text-lg font-semibold text-red-600">
                <Clock size={24} />
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
            </div>
            
            <div className="space-y-6">
              {activeQuiz.questions.map((q, idx) => (
                <div key={q.id} className="p-4 border rounded">
                  <p className="font-medium mb-3">{idx + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => (
                      <label key={optIdx} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={activeQuiz.answers[q.id] === optIdx}
                          onChange={() => submitAnswer(q.id, optIdx)}
                          className="w-4 h-4"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <button onClick={submitQuiz} className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold">
              Submit Quiz
            </button>
          </div>
        </div>
      );
    }

    const studentBatch = batches.find(b => b.studentIds && b.studentIds.includes(currentUser.id) && b.active && b.activeQuizId);
    
    if (!studentBatch) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <AlertCircle size={48} className="mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Active Quiz</h2>
            <p className="text-gray-600">Please wait for your supervisor to start the quiz.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <BookOpen size={48} className="mx-auto text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold mb-4">Quiz Ready!</h2>
          <p className="text-gray-600 mb-6">Click below to start your quiz</p>
          <button onClick={startStudentQuiz} className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold">
            Start Quiz
          </button>
        </div>
      </div>
    );
  };

  const StudentResultsView = () => {
    const myAttempts = quizAttempts.filter(a => a.studentId === currentUser.id);
    const latestAttempt = myAttempts[myAttempts.length - 1];

    if (!latestAttempt) return <div>No results available</div>;

    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
          <h2 className="text-3xl font-bold mb-6 text-center">Quiz Results</h2>
          
          <div className="text-center mb-6 p-6 bg-blue-50 rounded-lg">
            <p className="text-5xl font-bold text-blue-600 mb-2">{latestAttempt.percentage}%</p>
            <p className="text-xl text-gray-700">Score: {latestAttempt.score} / {latestAttempt.total}</p>
            <p className="text-sm text-gray-600 mt-2">Time Taken: {Math.floor(latestAttempt.timeTaken / 60)}m {latestAttempt.timeTaken % 60}s</p>
          </div>

          <div className="space-y-4">
            {latestAttempt.results.map((r, idx) => (
              <div key={idx} className={`p-4 border rounded ${r.correct ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <div className="flex items-start gap-2">
                  {r.correct ? <CheckCircle className="text-green-600 mt-1" size={20} /> : <XCircle className="text-red-600 mt-1" size={20} />}
                  <div className="flex-1">
                    <p className="font-medium mb-2">{idx + 1}. {r.question}</p>
                    <p className="text-sm">Your answer: Option {String.fromCharCode(65 + r.selectedAnswer)}</p>
                    {!r.correct && <p className="text-sm text-green-700">Correct answer: Option {String.fromCharCode(65 + r.correctAnswer)}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (currentView === 'login') {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Quiz Platform</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Welcome, <strong>{currentUser.username}</strong> ({currentUser.role})</span>
            <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center gap-2">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto p-4">
        {currentUser.role === 'owner' && <OwnerView />}
        {currentUser.role === 'administrator' && <AdministratorView />}
        {currentUser.role === 'supervisor' && <SupervisorView />}
        {currentUser.role === 'student' && currentView === 'student-quiz' && <StudentQuizView />}
        {currentUser.role === 'student' && currentView === 'student-results' && <StudentResultsView />}
      </div>
    </div>
  );
};
  
export default QuizPlatform;