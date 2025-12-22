import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
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
  ViewType,
  CSVUploadResult,
  StudentCreationResult,
  ActiveQuizSession
} from './types';
import {
  STUDENT_USERNAME_LENGTH,
  STUDENT_USERNAME_CHARS,
  VIEWS
} from './constants';
import { databaseService } from './services/database';
import { generateUniqueUsername, generatePassword } from './utils/username';
import { parseQuestionCSV, readFileAsText, convertToQuestions } from './utils/csv';
import { useAuth } from './hooks/useAuth';
import { LoginView } from './components/views/LoginView';
import { StudentQuizView } from './components/views/StudentQuizView';
import { StudentTakingView } from './components/views/StudentTakingView';
import { StudentResultsView } from './components/views/StudentResultsView';
import { StudentReviewView } from './components/views/StudentReviewView';
import { OwnerView } from './components/views/OwnerView';
import { SupervisorView } from './components/views/SupervisorView';
import { AdministratorView } from './components/views/AdministratorView';

const QuizPlatform = () => {
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

    // support remounting role views when going "home" so internal view state resets
    const [homeKey, setHomeKey] = useState(0);

    // Authentication hook
    const {
        currentUser,
        loginForm,
        setLoginForm,
        error,
        setError,
        showPassword,
        setShowPassword,
        rememberMe,
        setRememberMe,
        handleLogin,
        handleLogout
    } = useAuth({
        users,
        batches,
        onViewChange: setCurrentView,
        onActiveQuizChange: setActiveQuiz,
        onCurrentAttemptChange: setCurrentAttempt
    });

    useEffect(() => {
        const initData = async () => {
            // Load data from database service
            const data = await databaseService.loadInitialData();

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
        };

        initData();
    }, []);

    // Central saveData: update in-memory state (if provided) and persist to database
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

        // Persist to database (both SQLite and window.storage for backwards compatibility)
        await databaseService.save(data);
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

    const createAdministrator = (username: string, password: string, spaceId: string, label?: string, address?: string, logoUrl?: string) => {
        const newAdmin: Administrator = {
            id: `admin-${Date.now()}`,
            username,
            password,
            role: 'administrator',
            active: true,
            collabSpaceId: spaceId,
            ...(label && { label }),
            ...(address && { address }),
            ...(logoUrl && { logoUrl })
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

        // Read file content
        const text = await readFileAsText(file);

        // Parse CSV content
        const parseResult = parseQuestionCSV(text);

        if (parseResult.questions.length === 0) {
            throw new Error(`No valid questions parsed. Errors: ${parseResult.errors.join('; ')}`);
        }

        // Convert parsed questions to Question objects
        const newQuestions = convertToQuestions(parseResult.questions, {
            subject: subject || 'General',
            topic: topics.join(',') || '',
            level: level || 'medium',
            label,
            collabSpaceId: currentUser?.collabSpaceId
        });

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

        return { label, added: newQuestions.length, errors: parseResult.errors, questionSetId: qs.id };
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

    const deleteQuiz = (quizId: string) => {
        const updated = quizzes.filter(q => q.id !== quizId);
        setQuizzes(updated);
        saveData({ quizzes: updated });
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
        return generateUniqueUsername(
            STUDENT_USERNAME_LENGTH,
            STUDENT_USERNAME_CHARS,
            users.map(u => u.username)
        );
    };

    const addStudentToBatch = (batchId: string, name: string): StudentCreationResult => {
        const username = generateUniqueShortUsername();
        const password = generatePassword();

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

    const createSupervisor = (username: string, password: string, batchIds: string[], supervisorName?: string, schoolName?: string) => {
        const newSupervisor: Supervisor = {
            id: `sup-${Date.now()}`,
            username,
            password,
            role: 'supervisor',
            batchIds: batchIds || [],
            active: true,
            collabSpaceId: currentUser?.collabSpaceId,
            ...(supervisorName && { supervisorName }),
            ...(schoolName && { schoolName })
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
    const getLatestFinishedAttempt = (studentId: string, quizId: string, batchId: string): QuizAttempt | undefined => {
        const attempts = quizAttempts
            .filter((a: QuizAttempt) => a.studentId === studentId && a.quizId === quizId && a.batchId === batchId && a.finishedAt)
            .sort((a: QuizAttempt, b: QuizAttempt) => new Date(b.finishedAt!).getTime() - new Date(a.finishedAt!).getTime());
        return attempts[0] || undefined;
    };

    // ... Views (login/owner/admin/supervisor/student) below ...


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

        // Randomly select questions using Fisher-Yates shuffle algorithm
        const shuffled = [...sourceQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const selected = shuffled.slice(0, quiz.questionCount || sourceQuestions.length);
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


    if (currentView === VIEWS.LOGIN) {
        return (
            <LoginView
                loginForm={loginForm}
                setLoginForm={setLoginForm}
                error={error}
                setError={setError}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                rememberMe={rememberMe}
                setRememberMe={setRememberMe}
                handleLogin={handleLogin}
            />
        );
    }

    // Get branding information for navigation
    const getBranding = (): { logo?: string; label?: string } => {
        if (!currentUser) return {};

        if (currentUser.role === 'administrator') {
            const admin = administrators.find(a => a.id === currentUser.id);
            return { logo: admin?.logoUrl, label: admin?.label };
        } else if (currentUser.role === 'supervisor') {
            const admin = administrators.find(a => a.collabSpaceId === currentUser.collabSpaceId);
            return { logo: admin?.logoUrl, label: admin?.label };
        } else if (currentUser.role === 'student') {
            const student = students.find(s => s.id === currentUser.id);
            if (student) {
                const admin = administrators.find(a => a.collabSpaceId === student.collabSpaceId);
                return { logo: admin?.logoUrl, label: admin?.label };
            }
        }
        return {};
    };

    const branding = getBranding();

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {branding.logo && (
                            <img src={branding.logo} alt={branding.label || 'Logo'} className="h-10 w-auto object-contain" />
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-blue-600">
                                {branding.label || 'Quiz Platform'}
                            </h1>
                            {branding.label && <p className="text-xs text-gray-500">Quiz Platform</p>}
                        </div>
                        {currentUser && (
                            <button type="button" onClick={goHome} className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300">Home</button>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-700">Welcome, <strong>
                            {currentUser?.role === 'student'
                                ? students.find(s => s.id === currentUser.id)?.name || currentUser.username
                                : currentUser?.username}
                        </strong> ({currentUser?.role})</span>
                        <button type="button" onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center gap-2">
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-4">
                {currentUser?.role === 'owner' && (
                    <OwnerView
                        key={homeKey}
                        collabSpaces={collabSpaces}
                        administrators={administrators}
                        createCollabSpace={createCollabSpace}
                        toggleCollabSpace={toggleCollabSpace}
                        createAdministrator={createAdministrator}
                        toggleAdministrator={toggleAdministrator}
                    />
                )}
                {currentUser?.role === 'administrator' && (
                    <AdministratorView
                        key={homeKey}
                        currentUser={currentUser}
                        quizzes={quizzes}
                        batches={batches}
                        students={students}
                        supervisors={supervisors}
                        questions={questions}
                        questionSets={questionSets}
                        quizAttempts={quizAttempts}
                        uploadQuestionsFromFile={uploadQuestionsFromFile}
                        createQuiz={createQuiz}
                        deleteQuiz={deleteQuiz}
                        createBatch={createBatch}
                        addStudentToBatch={addStudentToBatch}
                        addExistingStudentToBatch={addExistingStudentToBatch}
                        createSupervisor={createSupervisor}
                        deleteBatch={deleteBatch}
                        deleteStudent={deleteStudent}
                        deleteSupervisor={deleteSupervisor}
                        deleteQuestion={deleteQuestion}
                        toggleEntity={toggleEntity}
                        assignBatchesToSupervisor={assignBatchesToSupervisor}
                        getLatestFinishedAttempt={getLatestFinishedAttempt}
                        setCurrentAttempt={setCurrentAttempt}
                        setCurrentView={setCurrentView}
                        setQuestionSets={setQuestionSets}
                        saveData={saveData}
                    />
                )}
                {currentUser?.role === 'supervisor' && (
                    <SupervisorView
                        key={homeKey}
                        currentUser={currentUser}
                        batches={batches}
                        students={students}
                        supervisors={supervisors}
                        quizzes={quizzes}
                        quizAttempts={quizAttempts}
                        startQuiz={startQuiz}
                        stopQuiz={stopQuiz}
                        getLatestFinishedAttempt={getLatestFinishedAttempt}
                        addExistingStudentToBatch={addExistingStudentToBatch}
                        addStudentToBatch={addStudentToBatch}
                        setCurrentAttempt={setCurrentAttempt}
                        setCurrentView={setCurrentView}
                    />
                )}
                {currentUser?.role === 'student' && currentView === VIEWS.STUDENT_QUIZ && (
                    <StudentQuizView
                        currentUser={currentUser}
                        students={students}
                        batches={batches}
                        quizzes={quizzes}
                        startStudentAttempt={startStudentAttempt}
                        setCurrentView={setCurrentView}
                    />
                )}
                {currentUser?.role === 'student' && currentView === VIEWS.STUDENT_TAKING && (
                    <StudentTakingView
                        currentAttempt={currentAttempt}
                        quizzes={quizzes}
                        questions={questions}
                        quizAttempts={quizAttempts}
                        setCurrentAttempt={setCurrentAttempt}
                        setQuizAttempts={setQuizAttempts}
                        setCurrentView={setCurrentView}
                        saveData={saveData}
                    />
                )}
                {currentUser?.role === 'student' && currentView === VIEWS.STUDENT_RESULTS && (
                    <StudentResultsView
                        currentUser={currentUser}
                        quizAttempts={quizAttempts}
                        quizzes={quizzes}
                        setCurrentAttempt={setCurrentAttempt}
                        setCurrentView={setCurrentView}
                    />
                )}
                {/* Allow review page to be opened by supervisors/admins as well – render regardless of role when selected */}
                {currentView === VIEWS.STUDENT_REVIEW && (
                    <StudentReviewView
                        currentAttempt={currentAttempt}
                        currentUser={currentUser}
                        quizzes={quizzes}
                        questions={questions}
                        setCurrentAttempt={setCurrentAttempt}
                        setCurrentView={setCurrentView}
                    />
                )}
            </div>
        </div>
    );
};

export default QuizPlatform;