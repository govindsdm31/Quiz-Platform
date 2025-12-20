/**
 * Database service for managing SQL.js in-browser SQLite database
 *
 * The database is kept in memory and exported to localStorage as a base64 blob.
 * A simple key/value table stores the entire platform JSON for compatibility
 * with the existing in-memory state shape.
 */

import { DB_STORAGE_KEY, PLATFORM_DATA_KEY, SQLJS_CDN_URL, INITIAL_OWNER } from '../constants';
import type { PlatformData } from '../types';

export class DatabaseService {
  private db: any | null = null;
  private initialized = false;

  /**
   * Initialize sql.js and load database from localStorage if present
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic import sql.js
      const initSqlJs = (await import('sql.js')).default;
      const SQL = await initSqlJs({
        locateFile: (file: string) => `${SQLJS_CDN_URL}${file}`
      });

      // Try to load database from localStorage
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

      // Ensure key-value table exists
      db.run(`
        CREATE TABLE IF NOT EXISTS kv (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      this.db = db;
      this.initialized = true;
    } catch (err) {
      console.error('Failed to initialize sql.js:', err);
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Export current database to localStorage as base64
   */
  persist(): void {
    if (!this.db) return;

    try {
      const u8 = this.db.export();
      const binaryString = String.fromCharCode.apply(null, Array.from(u8) as any);
      const b64 = btoa(binaryString);
      localStorage.setItem(DB_STORAGE_KEY, b64);
    } catch (err) {
      console.warn('Failed to persist SQL DB to localStorage', err);
    }
  }

  /**
   * Read platform data from database
   * Returns null if not present or database not initialized
   */
  read(): PlatformData | null {
    if (!this.db) return null;

    try {
      const res = this.db.exec(`SELECT value FROM kv WHERE key = '${PLATFORM_DATA_KEY}'`);
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
  }

  /**
   * Write platform data to database and persist to localStorage
   */
  write(data: PlatformData): void {
    if (!this.db) return;

    try {
      const json = JSON.stringify(data);
      const stmt = this.db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)');
      stmt.run([PLATFORM_DATA_KEY, json]);
      stmt.free();
      this.persist();
    } catch (err) {
      console.warn('Failed to write platform-data to DB', err);
    }
  }

  /**
   * Load initial data from database or fallback sources
   * Returns platform data loaded from database, window.storage, or initial default
   */
  async loadInitialData(): Promise<PlatformData> {
    // Ensure database is initialized
    await this.initialize();

    // Try to load from SQLite database first
    const fromDb = this.read();
    if (fromDb) {
      return fromDb;
    }

    // Fallback to window.storage if available
    try {
      const storageData = await (window as any).storage?.get?.('platform-data');
      if (storageData) {
        const data = JSON.parse(storageData.value);
        // Migrate to SQLite for future runs
        this.write(data);
        return data;
      }
    } catch (err) {
      console.error('Storage error:', err);
    }

    // No existing data found - create initial data with owner user
    const initialData: PlatformData = {
      users: [INITIAL_OWNER],
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

    // Save initial data to database
    this.write(initialData);

    return initialData;
  }

  /**
   * Save data to both database and window.storage (for backwards compatibility)
   */
  async save(data: PlatformData): Promise<void> {
    // Save to SQLite database
    try {
      if (!this.db) {
        await this.initialize();
      }
      if (this.db) {
        this.write(data);
      }
    } catch (err) {
      console.warn('Failed to save to SQLite DB', err);
    }

    // Also save to window.storage for backwards compatibility
    try {
      if ((window as any).storage?.set) {
        await (window as any).storage.set('platform-data', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Failed to save to window.storage', err);
    }
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.db !== null;
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
