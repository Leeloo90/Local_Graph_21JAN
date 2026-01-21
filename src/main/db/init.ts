// src/main/db/init.ts
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { SCHEMA_V5 } from './schema';

let db: Database.Database | null = null;

export function initializeDatabase(): Database.Database {
  if (db) return db; // Return existing instance if already open

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'projects.db'); // THE REAL DB

  console.log(`[DB] Initializing database at: ${dbPath}`);

  // Ensure directory exists
  fs.ensureDirSync(path.dirname(dbPath));

  try {
    db = new Database(dbPath);
    
    // Performance: Write-Ahead Logging is crucial for concurrency
    db.pragma('journal_mode = WAL'); 
    
    // Integrity: Enforce Foreign Keys (Cascading Deletes)
    db.pragma('foreign_keys = ON');

    // Apply Schema Transactionally
    const runTransaction = db.transaction(() => {
      for (const statement of SCHEMA_V5) {
        db!.prepare(statement).run();
      }
    });
    
    runTransaction();
    console.log('[DB] Schema applied successfully (v5.0).');
    
    return db;
  } catch (error) {
    console.error('[DB] Failed to initialize:', error);
    throw error;
  }
}

// Export a getter for other modules to use
export function getDB(): Database.Database {
  if (!db) {
    throw new Error('[DB] Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}