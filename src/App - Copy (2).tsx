import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Users, BookOpen, ClipboardList, Settings, LogOut, Play, Square, Clock, CheckCircle, XCircle, Eye, Plus, Trash2, Edit, UserPlus, Download } from 'lucide-react';

/*
  Persist platform data into an in-browser SQLite database using sql.js.
  - The DB is kept in memory and exported into localStorage as a base64 blob ("sqljs-db").
  - A simple key/value table `kv(key TEXT PRIMARY KEY, value TEXT)` stores the entire platform JSON
    under key "platform-data" for compatibility with the existing in-memory state shape.
  - This approach gives you a real SQLite file in the browser while keeping the code changes minimal.
*/

const DB_STORAGE_KEY = 'sqljs-db';
const PLATFORM_DATA_KEY = 'platform-data';

const QuizPlatform = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [collabSpaces, setCollabSpaces] = useState<any[]>([]);
  const [administrators, setAdministrators] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<any | null>(null); // NEW: current active attempt object
  const [currentView, setCurrentView] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [selectedCollabSpace, setSelectedCollabSpace] = useState<any>(null);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // sql.js DB reference
  const sqlDbRef = useRef<any | null>(null);
  const SQLRef = useRef<any | null>(null);

  // Initialize sql.js and load DB from localStorage (if present)
  const initDb = async () => {
    if (sqlDbRef.current) return;

    // dynamic import so bundlers that don't include sql.js won't break until this runs
    try {
      const initSqlJs = (await import('sql.js')).default;
      const SQL = await initSqlJs({ locateFile: (file: string) => `https://sql.js.org/dist/${file}` });
      SQLRef.current = SQL;

      // Try load DB from localStorage
      const saved = localStorage.getItem(DB_STORAGE_KEY);
      let db;
      if (saved) {
        try {
          const binary = Uint8Array.from(atob(saved), (c) => c.charCodeAt(0));
          db = new SQL.Database(binary);
        } catch (e) {
          console.warn('Failed to load saved SQL DB, creating new one.', e);
          db = new SQL.Database();
        }
      } else {
        db = new SQL.Database();
      }

      // Ensure kv table exists
      db.run(`
        CREATE TABLE IF NOT EXISTS kv (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      sqlDbRef.current = db;
    } catch (err) {
      // If sql.js can't be loaded, fall back to existing window.storage usage.
      console.error('Failed to initialize sql.js:', err);
      sqlDbRef.current = null;
      SQLRef.current = null;
    }
  };

  // Persist the current in-memory SQL DB to localStorage as base64
  const persistSqlDb = () => {
    const db = sqlDbRef.current;
    if (!db) return;
    try {
      const u8 = db.export();
      const binaryString = String.fromCharCode.apply(null, Array.from(u8) as any);
      const b64 = btoa(binaryString);
      localStorage.setItem(DB_STORAGE_KEY, b64);
    } catch (err) {
      console.warn('Failed to persist SQL DB to localStorage', err);
    }
  };

  // Read platform-data JSON from kv table (returns null if not present)
  const readPlatformDataFromDb = (): any | null => {
    const db = sqlDbRef.current;
    if (!db) return null;
    try {
      const res = db.exec(`SELECT value FROM kv WHERE key = '${PLATFORM_DATA_KEY}'`);
      if (res && res.length && res[0].values && res[0].values.length) {
        const value = res[0].values[0][0];
        try {
          return JSON.parse(value);
        } catch (e) {
          console.warn('Failed to parse platform-data JSON from DB', e);
        }
      }
    } catch (err) {
      console.warn('Failed to read platform-data from DB', err);
    }
    return null;
  };

  // Write platform-data JSON into kv table (INSERT OR REPLACE)
  const writePlatformDataToDb = (data: any) => {
    const db = sqlDbRef.current;
    if (!db) return;
    try {
      const json = JSON.stringify(data);
      const stmt = db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)');
      stmt.run([PLATFORM_DATA_KEY, json]);
      stmt.free();
      persistSqlDb();
    } catch (err) {
      console.warn('Failed to write platform-data to DB', err);
    }
  };

  useEffect(() => {
    const initData = async () => {
      await initDb();

      // Try to load from SQLite DB first
      const fromDb = readPlatformDataFromDb();
      if (fromDb) {
        setUsers(fromDb.users || []);
        setCollabSpaces(fromDb.collabSpaces || []);
        setAdministrators(fromDb.administrators || []);
        setQuestions(fromDb.questions || []);
        setQuizzes(fromDb.quizzes || []);
        setBatches(fromDb.batches || []);
        setStudents(fromDb.students || []);
        setSupervisors(fromDb.supervisors || []);
        setQuizAttempts(fromDb.quizAttempts || []);
        return;
      }

      // Fallback to previous window.storage method (if available)
      try {
        const storageData = await (window as any).storage?.get?.('platform-data');
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
          // also persist that into SQLite for future runs
          writePlatformDataToDb(data);
        } else {
          // Create initial owner user and save into DB
          const initialUsers = [{
            id: 'owner-1',
            username: 'owner',
            password: 'owner123',
            role: 'owner',
            active: true
          }];
          const data = {
            users: initialUsers,
            collabSpaces: [],
            administrators: [],
            questions: [],
            quizzes: [],
            batches: [],
            students: [],
            supervisors: [],
            quizAttempts: []
          };
          setUsers(initialUsers);
          writePlatformDataToDb(data);
        }
      } catch (err) {
        console.error('Storage error:', err);
        // fallback in-memory initial user
        const initialUsers = [{
          id: 'owner-1',
          username: 'owner',
          password: 'owner123',
          role: 'owner',
          active: true
        }];
        setUsers(initialUsers);
        writePlatformDataToDb({
          users: initialUsers,
          collabSpaces: [],
          administrators: [],
          questions: [],
          quizzes: [],
          batches: [],
          students: [],
          supervisors: [],
          quizAttempts: []
        });
      }
    };

    initData();

    // load remembered username
    try {
      const remembered = localStorage.getItem('rememberedUsername');
      if (remembered) {
        setLoginForm(prev => ({ ...prev, username: remembered }));
        setRememberMe(true);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Central saveData: update in-memory state (if provided) and persist to SQLite (and fallback window.storage)
  const saveData = async (updates: any = {}) => {
    // Compose full data object from existing state and explicit updates
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

    // Update React state to keep UI in sync
    if (updates.users !== undefined) setUsers(updates.users);
    if (updates.collabSpaces !== undefined) setCollabSpaces(updates.collabSpaces);
    if (updates.administrators !== undefined) setAdministrators(updates.administrators);
    if (updates.questions !== undefined) setQuestions(updates.questions);
    if (updates.quizzes !== undefined) setQuizzes(updates.quizzes);
    if (updates.batches !== undefined) setBatches(updates.batches);
    if (updates.students !== undefined) setStudents(updates.students);
    if (updates.supervisors !== undefined) setSupervisors(updates.supervisors);
    if (updates.quizAttempts !== undefined) setQuizAttempts(updates.quizAttempts);

    // Persist to SQLite DB (if available)
    try {
      if (!sqlDbRef.current) {
        // try initialize if not already
        await initDb();
      }
      if (sqlDbRef.current) {
        writePlatformDataToDb(data);
      }
    } catch (err) {
      console.warn('Failed to save to SQLite DB', err);
    }

    // Also persist into existing window.storage (backwards compatibility)
    try {
      if ((window as any).storage?.set) {
        await (window as any).storage.set('platform-data', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Failed to save to window.storage', err);
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
    setCurrentAttempt(null);
  };

  const createCollabSpace = (name: string) => {
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

  const toggleCollabSpace = (spaceId: string) => {
    const updated = collabSpaces.map(s =>
      s.id === spaceId ? { ...s, active: !s.active } : s
    );
    setCollabSpaces(updated);
    saveData({ collabSpaces: updated });
  };

  const createAdministrator = (username: string, password: string, spaceId: string) => {
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

  const toggleAdministrator = (adminId: string) => {
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

  // Replaced generateQuestions with CSV upload helper that AdministratorView will call.
const uploadQuestionsFromFile = async (file: File, subject: string, topicsString: string, level: string) => {
  if (!file) throw new Error('No file provided');

  const topics = (topicsString || '').split(',').map(t => t.trim()).filter(Boolean);
  const label = `${subject || 'General'}-${topics.join('-')}-${level || 'medium'}-${Date.now()}`;

  const text = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ''));
    fr.onerror = () => reject(new Error('Failed to read file'));
    fr.readAsText(file);
  });

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const newQuestions: any[] = [];
  const errors: string[] = [];

  lines.forEach((line, idx) => {
    // expected: <QuestionNumber>@@<QUESTION>@@<Options seperated by||>@@<Answer>
    const parts = line.split('@@').map(p => p.trim());
    if (parts.length < 4) {
      errors.push(`Line ${idx + 1}: invalid format`);
      return;
    }

    const qText = parts[1];
    const opts = parts[2].split('||').map(o => o.trim()).filter(Boolean);
    if (opts.length === 0) {
      errors.push(`Line ${idx + 1}: no options`);
      return;
    }

    let answerRaw = parts[3];
    let correctIndex = -1;

    // try match by option text (case-insensitive)
    correctIndex = opts.findIndex(o => o.toLowerCase() === answerRaw.toLowerCase());

    // if not found, try numeric index (1-based)
    if (correctIndex === -1) {
      const n = parseInt(answerRaw, 10);
      if (!isNaN(n) && n >= 1 && n <= opts.length) {
        correctIndex = n - 1;
      }
    }

    // default to 0 if still not found
    if (correctIndex === -1) {
      correctIndex = 0;
    }

    // ensure exactly 4 options (pad or slice)
    while (opts.length < 4) opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
    if (opts.length > 4) opts.splice(4);

    const q = {
      id: `q-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      subject: subject || 'General',
      topic: topics.join(',') || '',
      level: level || 'medium',
      label,
      question: qText,
      options: opts,
      correctAnswer: correctIndex,
      collabSpaceId: currentUser?.collabSpaceId,
      createdAt: new Date().toISOString()
    };

    newQuestions.push(q);
  });

  if (newQuestions.length === 0) {
    throw new Error(`No valid questions parsed. Errors: ${errors.join('; ')}`);
  }

  const updated = [...questions, ...newQuestions];
  setQuestions(updated);
  await saveData({ questions: updated });

  return { label, added: newQuestions.length, errors };
};


  const deleteQuestion = (questionId: string) => {
    const updated = questions.filter(q => q.id !== questionId);
    setQuestions(updated);
    saveData({ questions: updated });
  };

  const createQuiz = (name: string, duration: number, questionCount: number, subject: string, level: string, labels: string[]) => {
    const newQuiz = {
      id: `quiz-${Date.now()}`,
      name,
      duration,
      questionCount,
      subject,
      level,
      labels: labels || [],
      collabSpaceId: currentUser?.collabSpaceId,
      createdAt: new Date().toISOString()
    };
    const updated = [...quizzes, newQuiz];
    setQuizzes(updated);
    saveData({ quizzes: updated });
    return newQuiz.id;
  };

  const createBatch = (quizId: string, schoolName: string, subject: string) => {
    const newBatch = {
      id: `batch-${Date.now()}`,
      quizId,
      schoolName,
      subject,
      studentIds: [],
      supervisorIds: [],
      active: true,
      activeQuizId: null,
      collabSpaceId: currentUser?.collabSpaceId,
      createdAt: new Date().toISOString()
    };
    const updated = [...batches, newBatch];
    setBatches(updated);
    saveData({ batches: updated });
    return newBatch.id;
  };

  const addStudentToBatch = (batchId: string, name: string) => {
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
      collabSpaceId: currentUser?.collabSpaceId
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

  const createSupervisor = (username: string, password: string, batchIds: string[]) => {
    const newSupervisor = {
      id: `sup-${Date.now()}`,
      username,
      password,
      role: 'supervisor',
      batchIds: batchIds || [],
      active: true,
      collabSpaceId: currentUser?.collabSpaceId
    };

    const updatedUsers = [...users, newSupervisor];
    const updatedSupervisors = [...supervisors, newSupervisor];

    setUsers(updatedUsers);
    setSupervisors(updatedSupervisors);
    saveData({ users: updatedUsers, supervisors: updatedSupervisors });
  };

  // Assign batches to a supervisor and update batches.supervisorIds accordingly
  const assignBatchesToSupervisor = (supId: string, batchIds: string[]) => {
    // normalize
    const newBatchIds = batchIds || [];

    const updatedSupervisors = supervisors.map(s => s.id === supId ? { ...s, batchIds: newBatchIds } : s);
    const updatedUsers = users.map(u => u.id === supId ? { ...u, batchIds: newBatchIds } : u);

    // update batches supervisorIds: ensure supId present when batch assigned, removed otherwise
    const updatedBatches = batches.map(b => {
      const assigned = newBatchIds.includes(b.id);
      const supIds = Array.isArray(b.supervisorIds) ? b.supervisorIds.slice() : [];
      const has = supIds.includes(supId);

      if (assigned && !has) {
        return { ...b, supervisorIds: [...supIds, supId] };
      }
      if (!assigned && has) {
        return { ...b, supervisorIds: supIds.filter(id => id !== supId) };
      }
      return b;
    });

    setSupervisors(updatedSupervisors);
    setUsers(updatedUsers);
    setBatches(updatedBatches);
    saveData({ supervisors: updatedSupervisors, users: updatedUsers, batches: updatedBatches });
  };

   // Start a quiz for a batch (sets batch.activeQuizId and activeQuiz state)
  const startQuiz = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) {
      setError('Batch not found');
      return;
    }
    if (!batch.quizId) {
      setError('Batch has no quiz assigned');
      return;
    }

    const updatedBatches = batches.map(b =>
      b.id === batchId ? { ...b, activeQuizId: batch.quizId } : b
    );

    setBatches(updatedBatches);
    setActiveQuiz({ batchId, quizId: batch.quizId, startedAt: new Date().toISOString() });
    saveData({ batches: updatedBatches });
  };

  // Stop the active quiz for a batch (clears batch.activeQuizId and activeQuiz)
  const stopQuiz = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) {
      setError('Batch not found');
      return;
    } 

    const updatedBatches = batches.map(b =>
      b.id === batchId ? { ...b, activeQuizId: null } : b
    );

    setBatches(updatedBatches);
    if (activeQuiz?.batchId === batchId) setActiveQuiz(null);
    saveData({ batches: updatedBatches });
  };

  const toggleEntity = (id: string, type: string) => {
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

  // ... rest of component (views remain unchanged) ...
  // For brevity the rest of the file below is preserved from original.
  // We replace the supervisors UI inside AdministratorView to allow assignment.

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

  // AdministratorView (supervisors section now supports assigning batches)
  const AdministratorView = () => {
  const [view, setView] = useState('questions');
  const [genForm, setGenForm] = useState({ subject: '', topic: '', count: 5, level: 'medium' });
  const [quizForm, setQuizForm] = useState({ name: '', duration: 30, questionCount: 10, subject: '', level: 'medium' });
  const [batchForm, setBatchForm] = useState({ quizId: '', schoolName: '', subject: '' });
  const [studentName, setStudentName] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [supForm, setSupForm] = useState({ username: '', password: '', batchIds: [] });
  const [generatedCreds, setGeneratedCreds] = useState<any[]>([]);

  const myQuestions = questions.filter(q => q.collabSpaceId === currentUser?.collabSpaceId);
  const myQuizzes = quizzes.filter(q => q.collabSpaceId === currentUser?.collabSpaceId);
  const myBatches = batches.filter(b => b.collabSpaceId === currentUser?.collabSpaceId);
  const myStudents = students.filter(s => s.collabSpaceId === currentUser?.collabSpaceId);
  const mySupervisors = supervisors.filter(s => s.collabSpaceId === currentUser?.collabSpaceId);

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
            <input type="number" placeholder="Count" className="p-2 border rounded" value={genForm.count} onChange={(e) => setGenForm({ ...genForm, count: parseInt(e.target.value) || 0 })} />
            <select className="p-2 border rounded" value={genForm.level} onChange={(e) => setGenForm({ ...genForm, level: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button
              onClick={() => {
                if (genForm.subject && genForm.topic && genForm.count > 0) {
                  generateQuestions(genForm.subject, genForm.topic, genForm.count, genForm.level)
                    .then(() => setGenForm({ subject: '', topic: '', count: 5, level: 'medium' }));
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Generate
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {myQuestions.map(q => (
              <div key={q.id} className="p-3 border rounded flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{q.question}</p>
                  <p className="text-sm text-gray-600">Subject: {q.subject} | Topic: {q.topic} | Level: {q.level} | Label: {q.label}</p>
                </div>
                <button onClick={() => deleteQuestion(q.id)} className="text-red-600 hover:text-red-800">
                  <Trash2 size={20} />
                </button>
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
            <input type="number" placeholder="Duration (min)" className="p-2 border rounded" value={quizForm.duration} onChange={(e) => setQuizForm({ ...quizForm, duration: parseInt(e.target.value) || 0 })} />
            <input type="number" placeholder="Question Count" className="p-2 border rounded" value={quizForm.questionCount} onChange={(e) => setQuizForm({ ...quizForm, questionCount: parseInt(e.target.value) || 0 })} />
            <input type="text" placeholder="Subject" className="p-2 border rounded" value={quizForm.subject} onChange={(e) => setQuizForm({ ...quizForm, subject: e.target.value })} />
            <select className="p-2 border rounded" value={quizForm.level} onChange={(e) => setQuizForm({ ...quizForm, level: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button
              onClick={() => {
                if (quizForm.name && quizForm.subject) {
                  createQuiz(quizForm.name, quizForm.duration, quizForm.questionCount, quizForm.subject, quizForm.level, []);
                  setQuizForm({ name: '', duration: 30, questionCount: 10, subject: '', level: 'medium' });
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Create Quiz
            </button>
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
            <button
              onClick={() => {
                if (batchForm.quizId && batchForm.schoolName && batchForm.subject) {
                  createBatch(batchForm.quizId, batchForm.schoolName, batchForm.subject);
                  setBatchForm({ quizId: '', schoolName: '', subject: '' });
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
              {generatedCreds.map((c, i) => <p key={i} className="text-sm">{c.name}: {c.username} / {c.password}</p>)}
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
                  <button onClick={() => toggleEntity(s.id, 'student')} className={`px-3 py-1 rounded text-sm ${s.active ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>{s.active ? 'Active' : 'Inactive'}</button>
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
                      <button onClick={() => toggleEntity(s.id, 'supervisor')} className={`px-3 py-1 rounded text-sm ${s.active ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>{s.active ? 'Active' : 'Inactive'}</button>
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
                      {myBatches.map(b => <option key={b.id} value={b.id}>{b.schoolName} - {b.subject}</option>)}
                    </select>

                    {assigned.length > 0 && (
                      <div className="mt-2 text-sm text-gray-700">
                        Assigned: {assigned.map(id => `${myBatches.find(b => b.id === id)?.schoolName} - ${myBatches.find(b => b.id === id)?.subject}`).join(', ')}
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
    const myBatches = batches.filter(b =>
      supervisors.find(s => s.id === currentUser?.id && s.batchIds && s.batchIds.includes(b.id))
    );

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
                      <h3 className="font-bold text-lg">{batch.schoolName} - {batch.subject}</h3>
                      <p className="text-sm text-gray-600">Quiz: {quiz?.name || '—'} | Students: {batchStudents.length}</p>
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
                      {batchStudents.length === 0 && <div className="text-sm text-gray-600">No students in this batch.</div>}
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

// Start an attempt for a student (creates a quizAttempt entry and navigates to the taking view)
const startStudentAttempt = (batchId: string) => {
  const batch = batches.find(b => b.id === batchId);
  if (!batch) {
    setError('Batch not found');
    return;
  }
  if (!batch.activeQuizId) {
    setError('No active quiz for this batch');
    return;
  }

  const quiz = quizzes.find(q => q.id === batch.activeQuizId);
  if (!quiz) {
    setError('Quiz not found');
    return;
  }

  // select questions for the quiz:
  // prefer questions matching collabSpaceId, subject and level; fallback to any questions in collab space
  const pool = questions.filter(q =>
    q.collabSpaceId === currentUser?.collabSpaceId &&
    q.subject === quiz.subject &&
    q.level === quiz.level
  );
  const fallbackPool = questions.filter(q => q.collabSpaceId === currentUser?.collabSpaceId);

  const source = pool.length >= quiz.questionCount ? pool : fallbackPool;
  // choose up to quiz.questionCount questions (deterministic simple selection)
  const selected = source.slice(0, quiz.questionCount || source.length);
  const questionIds = selected.map(q => q.id);

  // create attempt with empty answers
  const attempt = {
    id: `attempt-${Date.now()}`,
    batchId: batch.id,
    quizId: quiz.id,
    studentId: currentUser?.id,
    studentName: (students.find(s => s.id === currentUser?.id)?.name) || currentUser?.username,
    questionIds,
    answers: questionIds.map((qid: string) => ({ questionId: qid, selected: null })),
    score: 0,
    total: quiz.questionCount || questionIds.length,
    percentage: 0,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    timeLimitSeconds: (quiz.duration || 0) * 60
  };

  const updatedAttempts = [...quizAttempts, attempt];
  setQuizAttempts(updatedAttempts);
  setCurrentAttempt(attempt);
  saveData({ quizAttempts: updatedAttempts });

  // navigate to the taking UI
  setCurrentView('student-taking');
};

// Student taking UI: question navigation, answer selection, timer, submit/grading
const StudentTakingView = () => {
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
        <button onClick={() => setCurrentView('student-quiz')} className="mt-2 text-sm text-blue-600 hover:underline">Back</button>
      </div>
    );
  }

  const quiz = quizzes.find(q => q.id === currentAttempt.quizId);
  const questionList = currentAttempt.questionIds.map((qid: string) => questions.find(q => q.id === qid)).filter(Boolean);

  const currentQuestion = questionList[index];

  const setAnswer = (questionId: string, selectedIndex: number) => {
    const updated = {
      ...currentAttempt,
      answers: currentAttempt.answers.map((a: any) =>
        a.questionId === questionId ? { ...a, selected: selectedIndex } : a
      )
    };
    setCurrentAttempt(updated);

    // persist progress in quizAttempts array
    const updatedAttempts = quizAttempts.map(a => a.id === updated.id ? updated : a);
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
    setCurrentView('student-results');
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
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
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            className={`px-4 py-2 rounded ${index === 0 ? 'bg-gray-200 text-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Previous
          </button>
          <button
            onClick={() => setIndex(i => Math.min(questionList.length - 1, i + 1))}
            disabled={index === questionList.length - 1}
            className={`px-4 py-2 rounded ${index === questionList.length - 1 ? 'bg-gray-200 text-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Next
          </button>
        </div>

        <div className="flex gap-2">
          <button
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
};

// Student view: show active quiz (if any) and Start button
const StudentQuizView = () => {
  if (!currentUser) return <div />;

  // find the student's batch
  const student = students.find(s => s.id === currentUser.id);
  const studentBatch = student ? batches.find(b => b.id === student.batchId) : null;
  const activeQuizId = studentBatch?.activeQuizId;
  const quiz = activeQuizId ? quizzes.find(q => q.id === activeQuizId) : null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">My Quiz</h2>

      {!student && (
        <div className="p-4 bg-yellow-50 border rounded text-sm text-gray-700">
          No student profile found. Contact your administrator.
        </div>
      )}

      {student && !studentBatch && (
        <div className="p-4 bg-yellow-50 border rounded text-sm text-gray-700">
          You are not assigned to a batch. Contact your supervisor.
        </div>
      )}

      {studentBatch && !quiz && (
        <div className="p-4 bg-yellow-50 border rounded text-sm text-gray-700">
          No active quiz for your batch right now. Please wait for your supervisor to start one.
        </div>
      )}

      {quiz && (
        <div className="space-y-4">
          <div className="p-4 border rounded">
            <p className="font-semibold text-lg">{quiz.name}</p>
            <p className="text-sm text-gray-600">Duration: {quiz.duration} minutes | Questions: {quiz.questionCount}</p>
            <p className="text-sm text-gray-600">Subject: {quiz.subject} | Level: {quiz.level}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => startStudentAttempt(studentBatch.id)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <Play size={16} /> Start Quiz
            </button>

            <button
              onClick={() => setCurrentView('student-results')}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              View My Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Student results view: list attempts for current student
const StudentResultsView = () => {
  if (!currentUser) return <div />;

  const attempts = quizAttempts.filter(a => a.studentId === currentUser.id);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">My Results</h2>

      {attempts.length === 0 && (
        <div className="p-4 bg-yellow-50 border rounded text-sm text-gray-700">
          No attempts found yet.
        </div>
      )}

      <div className="space-y-3">
        {attempts.map(a => {
          const quiz = quizzes.find(q => q.id === a.quizId);
          return (
            <div key={a.id} className="p-3 border rounded flex justify-between items-center">
              <div>
                <p className="font-medium">{quiz?.name || 'Quiz'}</p>
                <p className="text-sm text-gray-600">Score: {a.score}/{a.total} — {a.percentage}%</p>
                <p className="text-sm text-gray-500">Started: {new Date(a.startedAt).toLocaleString()}</p>
                {a.finishedAt && <p className="text-sm text-gray-500">Finished: {new Date(a.finishedAt).toLocaleString()}</p>}
              </div>
              <div>
                <button onClick={() => {
                  // show attempt details: navigate to a simple review view by setting currentAttempt
                  setCurrentAttempt(a);
                  setCurrentView('student-review');
                }} className="text-sm text-blue-600 hover:underline">Review</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Review view: shows a finished attempt with selected answers and correct answers
const StudentReviewView = () => {
  if (!currentAttempt) return <div className="p-4 bg-yellow-50 rounded">No attempt to review.</div>;

  const quiz = quizzes.find(q => q.id === currentAttempt.quizId);
  const qlist = currentAttempt.questionIds.map((qid: string) => questions.find(q => q.id === qid)).filter(Boolean);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{quiz?.name} — Review</h2>
        <button onClick={() => { setCurrentAttempt(null); setCurrentView('student-results'); }} className="text-sm text-blue-600 hover:underline">Back</button>
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
            <span className="text-gray-700">Welcome, <strong>{currentUser?.username}</strong> ({currentUser?.role})</span>
            <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center gap-2">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4">
        {currentUser?.role === 'owner' && <OwnerView />}
        {currentUser?.role === 'administrator' && <AdministratorView />}
        {currentUser?.role === 'supervisor' && <SupervisorView />}
        {currentUser?.role === 'student' && currentView === 'student-quiz' && <StudentQuizView />}
        {currentUser?.role === 'student' && currentView === 'student-taking' && <StudentTakingView />}
        {currentUser?.role === 'student' && currentView === 'student-results' && <StudentResultsView />}
        {currentUser?.role === 'student' && currentView === 'student-review' && <StudentReviewView />}
      </div>
    </div>
  );
};

export default QuizPlatform;