/**
 * Application-wide constants
 */

// Database storage keys
export const DB_STORAGE_KEY = 'sqljs-db';
export const PLATFORM_DATA_KEY = 'platform-data';
export const REMEMBERED_USERNAME_KEY = 'rememberedUsername';

// Initial owner user
export const INITIAL_OWNER = {
  id: 'owner-1',
  username: 'owner',
  password: 'owner123',
  role: 'owner' as const,
  active: true
};

// SQL.js configuration
export const SQLJS_CDN_URL = 'https://sql.js.org/dist/';

// Default quiz settings
export const DEFAULT_QUIZ_DURATION = 30; // minutes
export const DEFAULT_QUESTION_COUNT = 10;

// Student username settings
export const STUDENT_USERNAME_LENGTH = 6;
export const STUDENT_USERNAME_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

// Question settings
export const OPTIONS_PER_QUESTION = 4;
export const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// Quiz levels
export const QUIZ_LEVELS = ['easy', 'medium', 'hard'] as const;

// User roles
export const USER_ROLES = ['owner', 'administrator', 'supervisor', 'student'] as const;

// View routes
export const VIEWS = {
  LOGIN: 'login' as const,
  COLLAB_SPACES: 'collab-spaces' as const,
  QUESTIONS: 'questions' as const,
  BATCHES: 'batches' as const,
  STUDENT_QUIZ: 'student-quiz' as const,
  STUDENT_TAKING: 'student-taking' as const,
  STUDENT_RESULTS: 'student-results' as const,
  STUDENT_REVIEW: 'student-review' as const,
};

// CSV parsing
export const CSV_QUESTION_SEPARATOR = '@@';
export const CSV_OPTION_SEPARATOR = '||';
