/**
 * CSV parsing utilities for question import
 */

import { CSV_QUESTION_SEPARATOR, CSV_OPTION_SEPARATOR, OPTIONS_PER_QUESTION } from '../constants';
import type { Question } from '../types';

export interface ParsedQuestion {
  questionText: string;
  options: string[];
  correctAnswer: number;
}

export interface CSVParseResult {
  questions: ParsedQuestion[];
  errors: string[];
}

/**
 * Parse CSV content into questions
 * Expected format: <QuestionNumber>@@<QUESTION>@@<Options separated by||>@@<Answer>
 *
 * @param csvContent - Raw CSV file content
 * @returns Parsed questions and any errors encountered
 */
export function parseQuestionCSV(csvContent: string): CSVParseResult {
  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];

  lines.forEach((line, idx) => {
    const parts = line.split(CSV_QUESTION_SEPARATOR).map(p => p.trim());

    if (parts.length < 4) {
      errors.push(`Line ${idx + 1}: invalid format (expected 4 parts separated by @@)`);
      return;
    }

    const questionText = parts[1];
    const opts = parts[2].split(CSV_OPTION_SEPARATOR).map(o => o.trim()).filter(Boolean);

    if (opts.length === 0) {
      errors.push(`Line ${idx + 1}: no options provided`);
      return;
    }

    let answerRaw = parts[3];
    let correctIndex = -1;

    // Try to match by option text (case-insensitive)
    correctIndex = opts.findIndex(o => o.toLowerCase() === answerRaw.toLowerCase());

    // If not found, try numeric index (1-based)
    if (correctIndex === -1) {
      const n = parseInt(answerRaw, 10);
      if (!isNaN(n) && n >= 1 && n <= opts.length) {
        correctIndex = n - 1;
      }
    }

    // Default to 0 if still not found
    if (correctIndex === -1) {
      correctIndex = 0;
    }

    // Ensure exactly OPTIONS_PER_QUESTION options (pad or slice)
    while (opts.length < OPTIONS_PER_QUESTION) {
      opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
    }
    if (opts.length > OPTIONS_PER_QUESTION) {
      opts.splice(OPTIONS_PER_QUESTION);
    }

    questions.push({
      questionText,
      options: opts,
      correctAnswer: correctIndex
    });
  });

  return { questions, errors };
}

/**
 * Read file content as text
 * @param file - File to read
 * @returns Promise resolving to file content
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ''));
    fr.onerror = () => reject(new Error('Failed to read file'));
    fr.readAsText(file);
  });
}

/**
 * Convert parsed questions to Question objects
 * @param parsedQuestions - Questions from CSV parse
 * @param metadata - Additional metadata (subject, topic, level, label, etc.)
 * @returns Array of Question objects
 */
export function convertToQuestions(
  parsedQuestions: ParsedQuestion[],
  metadata: {
    subject: string;
    topic: string;
    level: string;
    label: string;
    collabSpaceId?: string;
  }
): Question[] {
  return parsedQuestions.map((pq, idx) => ({
    id: `q-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
    subject: metadata.subject,
    topic: metadata.topic,
    level: metadata.level,
    label: metadata.label,
    question: pq.questionText,
    options: pq.options,
    correctAnswer: pq.correctAnswer,
    collabSpaceId: metadata.collabSpaceId,
    createdAt: new Date().toISOString()
  }));
}
