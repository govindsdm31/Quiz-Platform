/**
 * Core domain types for Quiz Platform
 */

// User roles
export type UserRole = 'owner' | 'administrator' | 'supervisor' | 'student';

// Question difficulty levels
export type QuestionLevel = 'easy' | 'medium' | 'hard';

// View types for navigation
export type ViewType =
  | 'login'
  | 'collab-spaces'
  | 'questions'
  | 'batches'
  | 'student-quiz'
  | 'student-taking'
  | 'student-results'
  | 'student-review';

/**
 * Base User interface
 */
export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  active: boolean;
  collabSpaceId?: string;
  batchId?: string;
  batchIds?: string[];
  name?: string;
}

/**
 * Student extends User with required name and batchId
 */
export interface Student extends User {
  role: 'student';
  name: string;
  batchId: string;
}

/**
 * Supervisor extends User with batchIds array and school name
 */
export interface Supervisor extends User {
  role: 'supervisor';
  batchIds: string[];
  supervisorName?: string; // Real name of the supervisor
  schoolName?: string; // School they belong to
}

/**
 * Administrator extends User with collabSpaceId and branding
 */
export interface Administrator extends User {
  role: 'administrator';
  collabSpaceId: string;
  label?: string; // Organization/brand label
  address?: string; // Organization address
  logoUrl?: string; // Organization logo URL or data URI
}

/**
 * Collaboration Space
 */
export interface CollabSpace {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  logoUrl?: string; // Logo for this collaboration space
  label?: string; // Display label for the space
}

/**
 * Question
 */
export interface Question {
  id: string;
  subject: string;
  topic: string;
  level: QuestionLevel | string;
  label: string;
  question: string;
  options: string[]; // Always 4 options
  correctAnswer: number; // Index 0-3
  collabSpaceId?: string;
  createdAt: string;
}

/**
 * Question Set (created via CSV import)
 */
export interface QuestionSet {
  id: string;
  label: string;
  subject: string;
  topics: string[];
  level: string;
  questionIds: string[];
  createdAt: string;
  collabSpaceId?: string;
}

/**
 * Quiz configuration
 */
export interface Quiz {
  id: string;
  name: string;
  duration: number; // in minutes
  questionCount: number;
  subject: string;
  level: string;
  labels: string[];
  questionSetId: string | null;
  collabSpaceId?: string;
  createdAt: string;
}

/**
 * Batch (group of students)
 */
export interface Batch {
  id: string;
  quizId: string;
  schoolName: string;
  studentIds: string[];
  supervisorIds: string[];
  active: boolean;
  activeQuizId: string | null;
  collabSpaceId?: string;
  createdAt: string;
}

/**
 * Quiz answer for a single question
 */
export interface QuizAnswer {
  questionId: string;
  selected: number | null; // Selected option index (0-3) or null if not answered
}

/**
 * Quiz attempt record
 */
export interface QuizAttempt {
  id: string;
  batchId: string;
  quizId: string;
  studentId: string;
  studentName: string;
  questionIds: string[];
  answers: QuizAnswer[];
  score: number;
  total: number;
  percentage: number;
  startedAt: string;
  finishedAt: string | null;
  timeLimitSeconds: number;
  elapsedSeconds?: number;
}

/**
 * Platform data structure (for persistence)
 */
export interface PlatformData {
  users: User[];
  collabSpaces: CollabSpace[];
  administrators: Administrator[];
  questions: Question[];
  quizzes: Quiz[];
  batches: Batch[];
  students: Student[];
  supervisors: Supervisor[];
  quizAttempts: QuizAttempt[];
  questionSets: QuestionSet[];
}

/**
 * Login form data
 */
export interface LoginForm {
  username: string;
  password: string;
}

/**
 * Administrator creation form data
 */
export interface AdminForm {
  username: string;
  password: string;
  spaceId: string;
}

/**
 * CSV upload result
 */
export interface CSVUploadResult {
  label: string;
  added: number;
  errors: string[];
  questionSetId: string;
}

/**
 * Student creation result (includes generated credentials)
 */
export interface StudentCreationResult {
  id: string;
  username: string;
  password: string;
}

/**
 * Active quiz session information
 */
export interface ActiveQuizSession {
  batchId: string;
  quizId: string;
  startedAt: string;
}
