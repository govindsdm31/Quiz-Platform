import { useState, useEffect, useRef } from 'react';
import { AlertCircle, Users, Settings, LogOut, Play, Square, Clock, Eye, Plus, Trash2, UserPlus, Download } from 'lucide-react';
import type {
  User,
  Student,
  Supervisor,
  Administrator,
  CollabSpace,
  Question,
  QuestionSet,
  Quiz,
  Batch,
  QuizAttempt,
  LoginForm,
  ViewType,
  CSVUploadResult,
  StudentCreationResult,
  ActiveQuizSession
} from './types';
import {
  DB_STORAGE_KEY,
  PLATFORM_DATA_KEY,
  REMEMBERED_USERNAME_KEY,
  INITIAL_OWNER,
  SQLJS_CDN_URL,
  STUDENT_USERNAME_LENGTH,
  STUDENT_USERNAME_CHARS,
  OPTIONS_PER_QUESTION,
  CSV_QUESTION_SEPARATOR,
  CSV_OPTION_SEPARATOR,
  VIEWS
} from './constants';

/*
  Persist platform data into an in-browser SQLite database using sql.js.
  - The DB is kept in memory and exported into localStorage as a base64 blob ("sqljs-db").
  - A simple key/value table `kv(key TEXT PRIMARY KEY, value TEXT)` stores the entire platform JSON
    under key "platform-data" for compatibility with the existing in-memory state shape.
  - This approach gives you a real SQLite file in the browser while keeping the code changes minimal.
*/

const QuizPlatform = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [collabSpaces, setCollabSpaces] = useState<CollabSpace[]>([]);
    const [administrators, setAdministrators] = useState<Administrator[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]); // question sets created via CSV import
    const [activeQuiz, setActiveQuiz] = useState<ActiveQuizSession | null>(null);
    const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
    const [currentAttempt, setCurrentAttempt] = useState<QuizAttempt | null>(null);
    const [currentView, setCurrentView] = useState<ViewType>('login');
    const [loginForm, setLoginForm] = useState<LoginForm>({ username: '', password: '' });
    const [error, setError] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [rememberMe, setRememberMe] = useState<boolean>(false);

    // support remounting role views when going "home" so internal view state resets
    const [homeKey, setHomeKey] = useState(0);

    // sql.js DB reference
    const sqlDbRef = useRef<any | null>(null);
    const SQLRef = useRef<any | null>(null);

    // Initialize sql.js and load DB from localStorage (if present)
    const initDb = async () => {
        if (sqlDbRef.current) return;

        // dynamic import so bundlers that don't include sql.js won't break until this runs
        try {
            const initSqlJs = (await import('sql.js')).default;
            const SQL = await initSqlJs({ locateFile: (file: string) => `${SQLJS_CDN_URL}${file}` });
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
                setQuestionSets(fromDb.questionSets || []);
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
                    setQuestionSets(data.questionSets || []);
                    // also persist that into SQLite for future runs
                    writePlatformDataToDb(data);
                } else {
                    // Create initial owner user and save into DB
                    const initialUsers: User[] = [INITIAL_OWNER];
                    const data = {
                        users: initialUsers,
                        collabSpaces: [],
                        administrators: [],
                        questions: [],
                        quizzes: [],
                        batches: [],
                        students: [],
                        supervisors: [],
                        quizAttempts: [],
                        questionSets: []
                    };
                    setUsers(initialUsers);
                    writePlatformDataToDb(data);
                }
            } catch (err) {
                console.error('Storage error:', err);
                // fallback in-memory initial user
                const initialUsers: User[] = [INITIAL_OWNER];
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
                    quizAttempts: [],
                    questionSets: []
                });
            }
        };

        initData();

        // load remembered username
        try {
            const remembered = localStorage.getItem(REMEMBERED_USERNAME_KEY);
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
            quizAttempts: updates.quizAttempts !== undefined ? updates.quizAttempts : quizAttempts,
            questionSets: updates.questionSets !== undefined ? updates.questionSets : questionSets
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
        if (updates.questionSets !== undefined) setQuestionSets(updates.questionSets);

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
                localStorage.setItem(REMEMBERED_USERNAME_KEY, loginForm.username);
            } else {
                localStorage.removeItem(REMEMBERED_USERNAME_KEY);
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
        setCurrentView(user.role === 'owner' ? VIEWS.COLLAB_SPACES :
            user.role === 'administrator' ? VIEWS.QUESTIONS :
                user.role === 'supervisor' ? VIEWS.BATCHES : VIEWS.STUDENT_QUIZ);
        setLoginForm({ username: '', password: '' });
        setShowPassword(false);
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentView(VIEWS.LOGIN);
        setActiveQuiz(null);
        setCurrentAttempt(null);
    };

    const goHome = () => {
        // reset role views by incrementing homeKey (forces remount of role components)
        setHomeKey(k => k + 1);
        setCurrentView(currentUser?.role === 'owner' ? VIEWS.COLLAB_SPACES :
            currentUser?.role === 'administrator' ? VIEWS.QUESTIONS :
                currentUser?.role === 'supervisor' ? VIEWS.BATCHES : VIEWS.STUDENT_QUIZ);
    };

    const createCollabSpace = (name: string) => {
        const newSpace: CollabSpace = {
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
        const newAdmin: Administrator = {
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

    // CSV upload helper that creates question set
    const uploadQuestionsFromFile = async (file: File, subject: string, topicsString: string, level: string): Promise<CSVUploadResult> => {
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
        const newQuestions: Question[] = [];
        const errors: string[] = [];

        lines.forEach((line, idx) => {
            // expected: <QuestionNumber>@@<QUESTION>@@<Options separated by||>@@<Answer>
            const parts = line.split(CSV_QUESTION_SEPARATOR).map(p => p.trim());
            if (parts.length < 4) {
                errors.push(`Line ${idx + 1}: invalid format`);
                return;
            }

            const qText = parts[1];
            const opts = parts[2].split(CSV_OPTION_SEPARATOR).map(o => o.trim()).filter(Boolean);
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

            // ensure exactly OPTIONS_PER_QUESTION options (pad or slice)
            while (opts.length < OPTIONS_PER_QUESTION) opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
            if (opts.length > OPTIONS_PER_QUESTION) opts.splice(OPTIONS_PER_QUESTION);

            const q: Question = {
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

        const updatedQuestions = [...questions, ...newQuestions];

        // Create a question set entry (label + question IDs)
        const qs: QuestionSet = {
            id: `qs-${Date.now()}`,
            label,
            subject: subject || 'General',
            topics,
            level: level || 'medium',
            questionIds: newQuestions.map(q => q.id),
            createdAt: new Date().toISOString(),
            collabSpaceId: currentUser?.collabSpaceId
        };

        const updatedSets = [...questionSets, qs];

        setQuestions(updatedQuestions);
        setQuestionSets(updatedSets);
        await saveData({ questions: updatedQuestions, questionSets: updatedSets });

        return { label, added: newQuestions.length, errors, questionSetId: qs.id };
    };

    // deleteQuestion now also removes references from questionSets
    const deleteQuestion = (questionId: string) => {
        const updated = questions.filter(q => q.id !== questionId);
        // remove id from any questionSet.questionIds
        const updatedSets = questionSets.map(qs => ({ ...qs, questionIds: (qs.questionIds || []).filter((id: string) => id !== questionId) }));
        setQuestions(updated);
        setQuestionSets(updatedSets);
        saveData({ questions: updated, questionSets: updatedSets });
    };

    // Delete student (removes from users, students and batches.studentIds)
    const deleteStudent = (studentId: string) => {
        const updatedStudents = students.filter(s => s.id !== studentId);
        const updatedUsers = users.filter(u => u.id !== studentId);
        const updatedBatches = batches.map(b => ({ ...b, studentIds: (b.studentIds || []).filter(id => id !== studentId) }));
        setStudents(updatedStudents);
        setUsers(updatedUsers);
        setBatches(updatedBatches);
        saveData({ students: updatedStudents, users: updatedUsers, batches: updatedBatches });
    };

    // Delete batch (removes batch, removes batchId from students, removes batchId from supervisors)
    const deleteBatch = (batchId: string) => {
        const updatedBatches = batches.filter(b => b.id !== batchId);
        const updatedSupervisors = supervisors.map(s => ({ ...s, batchIds: (s.batchIds || []).filter(id => id !== batchId) }));
        const updatedUsers = users.map(u => u.batchIds ? { ...u, batchIds: (u.batchIds || []).filter(id => id !== batchId) } : u);
        const updatedStudents = students.map(s => s.batchId === batchId ? { ...s, batchId: '' } : s);
        setBatches(updatedBatches);
        setSupervisors(updatedSupervisors);
        setUsers(updatedUsers);
        setStudents(updatedStudents);
        saveData({ batches: updatedBatches, supervisors: updatedSupervisors, users: updatedUsers, students: updatedStudents });
    };

    // Delete supervisor (removes from supervisors, users, and from batches.supervisorIds)
    const deleteSupervisor = (supId: string) => {
        const updatedSupervisors = supervisors.filter(s => s.id !== supId);
        const updatedUsers = users.filter(u => u.id !== supId);
        const updatedBatches = batches.map(b => ({ ...b, supervisorIds: (b.supervisorIds || []).filter(id => id !== supId) }));
        setSupervisors(updatedSupervisors);
        setUsers(updatedUsers);
        setBatches(updatedBatches);
        saveData({ supervisors: updatedSupervisors, users: updatedUsers, batches: updatedBatches });
    };

    // Add an existing student to a batch (used by supervisors/administrators)
    const addExistingStudentToBatch = (batchId: string, studentId: string) => {
        const batch = batches.find(b => b.id === batchId);
        const student = students.find(s => s.id === studentId);
        if (!batch) {
            setError('Batch not found');
            return false;
        }
        if (!student) {
            setError('Student not found');
            return false;
        }

        // update student.batchId and batch.studentIds
        const updatedStudents = students.map(s => s.id === studentId ? { ...s, batchId } : s);
        const updatedBatches = batches.map(b => b.id === batchId ? { ...b, studentIds: Array.from(new Set([...(b.studentIds || []), studentId])) } : b);

        // Also update users array for the student record (if present)
        const updatedUsers = users.map(u => u.id === studentId ? { ...u, batchId } : u);

        setStudents(updatedStudents);
        setBatches(updatedBatches);
        setUsers(updatedUsers);
        saveData({ students: updatedStudents, batches: updatedBatches, users: updatedUsers });

        return true;
    };

    // Create quiz now accepts optional questionSetId to source questions from
    const createQuiz = (name: string, duration: number, questionCount: number, subject: string, level: string, labels: string[], questionSetId?: string) => {
        const newQuiz: Quiz = {
            id: `quiz-${Date.now()}`,
            name,
            duration,
            questionCount,
            subject,
            level,
            labels: labels || [],
            questionSetId: questionSetId || null,
            collabSpaceId: currentUser?.collabSpaceId,
            createdAt: new Date().toISOString()
        };
        const updated = [...quizzes, newQuiz];
        setQuizzes(updated);
        saveData({ quizzes: updated });
        return newQuiz.id;
    };

    // createBatch removed subject param (per request)
    const createBatch = (quizId: string, schoolName: string) => {
        const newBatch: Batch = {
            id: `batch-${Date.now()}`,
            quizId,
            schoolName,
            // subject removed
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

    // generate short unique username for students
    const generateUniqueShortUsername = (): string => {
        const tryGenerate = () => {
            let s = '';
            for (let i = 0; i < STUDENT_USERNAME_LENGTH; i++) s += STUDENT_USERNAME_CHARS[Math.floor(Math.random() * STUDENT_USERNAME_CHARS.length)];
            return s;
        };

        let attempts = 0;
        let uname = tryGenerate();
        while (users.find(u => u.username === uname) && attempts < 10) {
            uname = tryGenerate();
            attempts++;
        }
        if (users.find(u => u.username === uname)) {
            // fallback: append timestamp to ensure uniqueness but still short-ish
            uname = (uname + Date.now().toString().slice(-3)).slice(0, 8);
        }
        return uname;
    };

    const addStudentToBatch = (batchId: string, name: string): StudentCreationResult => {
        const username = generateUniqueShortUsername();
        const password = `pass${Math.floor(Math.random() * 10000)}`;

        const newStudent: Student = {
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

        return { username, password, id: newStudent.id };
    };

    const createSupervisor = (username: string, password: string, batchIds: string[]) => {
        const newSupervisor: Supervisor = {
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

    // Helper to get latest finished attempt for a student for a given quiz & batch
    const getLatestFinishedAttempt = (studentId: string, quizId: string, batchId?: string): QuizAttempt | null => {
        const attempts = quizAttempts
            .filter((a: QuizAttempt) => a.studentId === studentId && a.quizId === quizId && a.batchId === (batchId || a.batchId) && a.finishedAt)
            .sort((a: QuizAttempt, b: QuizAttempt) => new Date(b.finishedAt!).getTime() - new Date(a.finishedAt!).getTime());
        return attempts[0] || null;
    };

    // ... Views (login/owner/admin/supervisor/student) below ...
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
                            type="button"
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
                                    type="button"
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
                        type="button"
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
                                    type="button"
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
        // added label field to quizForm
        const [quizForm, setQuizForm] = useState({ name: '', label: '', duration: 30, questionCount: 10, subject: '', level: 'medium', questionSetId: '' });
        const [batchForm, setBatchForm] = useState({ quizId: '', schoolName: '' });
        const [studentName, setStudentName] = useState('');
        const [selectedBatch, setSelectedBatch] = useState('');
        const [supForm, setSupForm] = useState({ username: '', password: '', batchIds: [] });
        const [generatedCreds, setGeneratedCreds] = useState<any[]>([]);
        const [batchAddSelections, setBatchAddSelections] = useState<Record<string, string>>({});
        const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({}); // track clicked batch expansions

        // For the "question sets" view interaction
        const [selectedQuestionSetId, setSelectedQuestionSetId] = useState<string | null>(null);

        const myQuizzes = quizzes.filter((q: Quiz) => q.collabSpaceId === currentUser?.collabSpaceId);
        const myBatches = batches.filter((b: Batch) => b.collabSpaceId === currentUser?.collabSpaceId);
        const myStudents = students.filter((s: Student) => s.collabSpaceId === currentUser?.collabSpaceId);
        const mySupervisors = supervisors.filter((s: Supervisor) => s.collabSpaceId === currentUser?.collabSpaceId);
        const myQuestionSets = questionSets.filter((qs: QuestionSet) => qs.collabSpaceId === currentUser?.collabSpaceId);

        return (
            <div className="space-y-6">
                <div className="flex gap-2 mb-4 flex-wrap">
                    <button type="button" onClick={() => setView('questions')} className={`px-4 py-2 rounded ${view === 'questions' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Questions</button>
                    <button type="button" onClick={() => setView('quizzes')} className={`px-4 py-2 rounded ${view === 'quizzes' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Quizzes</button>
                    <button type="button" onClick={() => setView('batches')} className={`px-4 py-2 rounded ${view === 'batches' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Batches</button>
                    <button type="button" onClick={() => setView('students')} className={`px-4 py-2 rounded ${view === 'students' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Students</button>
                    <button type="button" onClick={() => setView('supervisors')} className={`px-4 py-2 rounded ${view === 'supervisors' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Supervisors</button>
                    <button type="button" onClick={() => setView('reports')} className={`px-4 py-2 rounded ${view === 'reports' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Reports</button>
                </div>

                {view === 'questions' && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-2xl font-bold mb-4">Question Bank</h2>
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

                                {/* Hidden file input controlled from the UI */}
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
                                            // brief feedback
                                            alert(`Imported ${res.added} question(s). Label: ${res.label}${res.errors?.length ? `\nErrors: ${res.errors.join('; ')}` : ''}`);
                                            setGenForm({ subject: '', topic: '', count: 5, level: 'medium' });
                                            // clear input so same file can be re-uploaded if needed
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
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Download size={16} /> Upload CSV
                                </button>
                            </div>

                        </div>

                        {/* Show created question sets (labels only) */}
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
                                                <div className="text-sm text-gray-600">{qs.questionIds.length} question(s) � {qs.level} � {qs.topics?.join(', ')}</div>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <button type="button" onClick={() => {
                                                    // delete question set only (does not delete questions)
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

                        {/* When a question set is selected, show all questions and options with delete per question */}
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
                                                            // delete question and remove from sets (deleteQuestion handles set updates)
                                                            deleteQuestion(q.id);
                                                            // also update local selected set to remove if needed
                                                            // (deleteQuestion already updated questionSets via saveData)
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

                        {/* NOTE: we intentionally do not list all questions here when showing sets (requirement) */}
                    </div>
                )}

                {view === 'quizzes' && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-2xl font-bold mb-4">Quizzes</h2>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <input type="text" placeholder="Quiz Name" className="p-2 border rounded" value={quizForm.name} onChange={(e) => setQuizForm({ ...quizForm, name: e.target.value })} />
                            {/* New: Label input field for quiz */}
                            <input type="text" placeholder="Label (optional)" className="p-2 border rounded" value={quizForm.label} onChange={(e) => setQuizForm({ ...quizForm, label: e.target.value })} />
                            <input type="number" placeholder="Duration (min)" className="p-2 border rounded" value={quizForm.duration} onChange={(e) => setQuizForm({ ...quizForm, duration: parseInt(e.target.value) || 0 })} />
                            <input type="number" placeholder="Question Count" className="p-2 border rounded" value={quizForm.questionCount} onChange={(e) => setQuizForm({ ...quizForm, questionCount: parseInt(e.target.value) || 0 })} />
                            <input type="text" placeholder="Subject" className="p-2 border rounded" value={quizForm.subject} onChange={(e) => setQuizForm({ ...quizForm, subject: e.target.value })} />
                            <select className="p-2 border rounded" value={quizForm.level} onChange={(e) => setQuizForm({ ...quizForm, level: e.target.value })}>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>

                            {/* Question set selector */}
                            <select className="p-2 border rounded" value={quizForm.questionSetId || ''} onChange={(e) => setQuizForm({ ...quizForm, questionSetId: e.target.value })}>
                                <option value="">Select Question Set (optional)</option>
                                {myQuestionSets.map(qs => <option key={qs.id} value={qs.id}>{qs.label} ({qs.questionIds.length})</option>)}
                            </select>

                            <button type="button"
                                onClick={() => {
                                    if (quizForm.name && quizForm.subject) {
                                        const labels = quizForm.label ? [quizForm.label] : [];
                                        createQuiz(quizForm.name, quizForm.duration, quizForm.questionCount, quizForm.subject, quizForm.level, labels, quizForm.questionSetId || undefined);
                                        setQuizForm({ name: '', label: '', duration: 30, questionCount: 10, subject: '', level: 'medium', questionSetId: '' });
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
                                    <p className="text-sm text-gray-600">Duration: {q.duration} min | Questions: {q.questionCount} | Subject: {q.subject} | Level: {q.level} {q.labels?.length ? `| Label: ${q.labels.join(', ')}` : ''} {q.questionSetId ? `| Set: ${questionSets.find(s => s.id === q.questionSetId)?.label}` : ''}</p>
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
                            {/* subject removed from batch creation */}
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
                                                    {b.schoolName} - {quiz?.name || '�'}
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

                                        {/* Expanded batch: show all students and completion status */}
                                        {expandedBatches[b.id] && (
                                            <div className="mt-3 border-t pt-3 space-y-2">
                                                <h4 className="font-semibold">Students in {b.schoolName}</h4>
                                                {batchStudents.length === 0 && <div className="text-sm text-gray-600">No students in this batch.</div>}
                                                {batchStudents.map(s => {
                                                    // determine completion for the quiz assigned to this batch (activeQuiz or quizId on batch)
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
                                                                    {quizId ? (attempt ? <span className="text-green-700">Completed � {attempt.percentage}%</span> : <span className="text-yellow-700">Incomplete</span>) : <span className="text-gray-600">No quiz</span>}
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

                        {/* Quiz selector + batch filter */}
                        <div className="mb-4 flex gap-2 items-center">
                            <select className="p-2 border rounded" onChange={() => { }} id="report-quiz-select" defaultValue="">
                                <option value="">Select Quiz</option>
                                {myQuizzes.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                            </select>
                            {/* We'll manage selected quiz & batches in local state */}
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
    };

    // Small helper component rendered inside AdministratorView for reports to keep main file readable.
    const ReportPanel = ({ quizzes, batches, quizAttempts, setCurrentAttempt, setCurrentView }: { quizzes: Quiz[], batches: Batch[], quizAttempts: QuizAttempt[], setCurrentAttempt: (attempt: QuizAttempt) => void, setCurrentView: (view: ViewType) => void }) => {
        const [selectedQuizId, setSelectedQuizId] = useState<string>('');
        const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

        useEffect(() => {
            if (quizzes.length && !selectedQuizId) {
                setSelectedQuizId(quizzes[0].id);
            }
            // auto-select all batches initially
            if (batches.length && selectedBatchIds.length === 0) {
                setSelectedBatchIds(batches.map((b: Batch) => b.id));
            }
        }, [quizzes, batches]);

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
    };

    const SupervisorView = () => {
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
                                            <p className="text-sm text-gray-600">Quiz: {quiz?.name || '�'} | Students: {batchStudents.length}</p>
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
                                                        ) : <div className="text-sm text-gray-600">�</div>}
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
        // Prefer questions from a specified questionSet on the quiz; otherwise prefer questions matching collabSpaceId, subject and level
        let sourceQuestions: Question[] = [];
        if (quiz.questionSetId) {
            const set = questionSets.find(s => s.id === quiz.questionSetId);
            if (set) {
                sourceQuestions = questions.filter(q => set.questionIds.includes(q.id));
            }
        }

        if (!sourceQuestions || sourceQuestions.length === 0) {
            // fallback to filter by collabSpaceId/subject/level
            const pool = questions.filter(q =>
                q.collabSpaceId === currentUser?.collabSpaceId &&
                q.subject === quiz.subject &&
                q.level === quiz.level
            );
            const fallbackPool = questions.filter(q => q.collabSpaceId === currentUser?.collabSpaceId);
            sourceQuestions = (pool.length >= quiz.questionCount) ? pool : fallbackPool;
        }

        // choose up to quiz.questionCount questions (deterministic simple selection)
        const selected = sourceQuestions.slice(0, quiz.questionCount || sourceQuestions.length);
        const questionIds = selected.map(q => q.id);

        // create attempt with empty answers
        const attempt: QuizAttempt = {
            id: `attempt-${Date.now()}`,
            batchId: batch.id,
            quizId: quiz.id,
            studentId: currentUser?.id || '',
            studentName: (students.find(s => s.id === currentUser?.id)?.name) || currentUser?.username || '',
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
        setCurrentView(VIEWS.STUDENT_TAKING);
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

                {quiz && studentBatch && (
                    <div className="space-y-4">
                        <div className="p-4 border rounded">
                            <p className="font-semibold text-lg">{quiz.name}</p>
                            <p className="text-sm text-gray-600">Duration: {quiz.duration} minutes | Questions: {quiz.questionCount}</p>
                            <p className="text-sm text-gray-600">Subject: {quiz.subject} | Level: {quiz.level}</p>
                        </div>

                        <div className="flex gap-2">
                            <button type="button"
                                onClick={() => startStudentAttempt(studentBatch.id)}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Play size={16} /> Start Quiz
                            </button>

                            <button type="button"
                                onClick={() => setCurrentView(VIEWS.STUDENT_RESULTS)}
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
                                    <p className="text-sm text-gray-600">Score: {a.score}/{a.total} � {a.percentage}%</p>
                                    <p className="text-sm text-gray-500">Started: {new Date(a.startedAt).toLocaleString()}</p>
                                    {a.finishedAt && <p className="text-sm text-gray-500">Finished: {new Date(a.finishedAt).toLocaleString()}</p>}
                                </div>
                                <div>
                                    <button type="button" onClick={() => {
                                        setCurrentAttempt(a);
                                        setCurrentView(VIEWS.STUDENT_REVIEW);
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
                    <h2 className="text-2xl font-bold">{quiz?.name} � Review</h2>
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
    };

    if (currentView === VIEWS.LOGIN) {
        return <LoginView />;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-blue-600">Quiz Platform</h1>
                        {currentUser && (
                            <button type="button" onClick={goHome} className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300">Home</button>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-700">Welcome, <strong>{currentUser?.username}</strong> ({currentUser?.role})</span>
                        <button type="button" onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center gap-2">
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-4">
                {currentUser?.role === 'owner' && <OwnerView key={homeKey} />}
                {currentUser?.role === 'administrator' && <AdministratorView key={homeKey} />}
                {currentUser?.role === 'supervisor' && <SupervisorView key={homeKey} />}
                {currentUser?.role === 'student' && currentView === VIEWS.STUDENT_QUIZ && <StudentQuizView />}
                {currentUser?.role === 'student' && currentView === VIEWS.STUDENT_TAKING && <StudentTakingView />}
                {currentUser?.role === 'student' && currentView === VIEWS.STUDENT_RESULTS && <StudentResultsView />}
                {/* Allow review page to be opened by supervisors/admins as well � render regardless of role when selected */}
                {currentView === VIEWS.STUDENT_REVIEW && <StudentReviewView />}
            </div>
        </div>
    );
};

export default QuizPlatform;