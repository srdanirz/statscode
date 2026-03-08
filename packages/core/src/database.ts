/**
 * StatsCode Database Module
 * Handles SQLite storage for sessions and interactions
 * Uses sql.js (pure JavaScript SQLite) for maximum compatibility
 *
 * ARCHITECTURE NOTE: Each Claude Code hook runs in a separate Node.js process.
 * Multiple hooks can fire concurrently (e.g., PreToolUse + PostToolUse).
 * To prevent data loss from concurrent writes, this module:
 * 1. Re-reads the database from disk before each write operation
 * 2. Uses atomic writes (write to temp file, then rename)
 * 3. Only saves to disk when actual data changes occur (not on init)
 */

import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { Session, Interaction, StatsCodeConfig } from './types.js';
import { randomUUID } from 'crypto';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'fs';

const DEFAULT_DB_PATH = join(homedir(), '.statscode', 'stats.sqlite');

export class StatsDatabase {
    private db: Database | null = null;
    private sqlModule: SqlJsStatic | null = null;
    private dbPath: string;
    private initialized: Promise<void>;

    constructor(config: StatsCodeConfig = {}) {
        this.dbPath = config.dbPath ?? DEFAULT_DB_PATH;

        // Ensure directory exists
        const dir = this.dbPath.substring(0, this.dbPath.lastIndexOf('/'));
        mkdirSync(dir, { recursive: true });

        // Initialize async
        this.initialized = this.init();
    }

    private async init(): Promise<void> {
        this.sqlModule = await initSqlJs();
        this.loadFromDisk();
        this.initTables();
    }

    /**
     * Load (or reload) the database from disk.
     * Creates a fresh in-memory database if no file exists.
     */
    private loadFromDisk(): void {
        if (!this.sqlModule) return;

        // Close existing instance if reloading
        if (this.db) {
            try { this.db.close(); } catch { /* ignore */ }
            this.db = null;
        }

        if (existsSync(this.dbPath)) {
            try {
                const buffer = readFileSync(this.dbPath);
                this.db = new this.sqlModule.Database(buffer);
            } catch {
                // If the file is corrupted, start fresh but log it
                this.db = new this.sqlModule.Database();
            }
        } else {
            this.db = new this.sqlModule.Database();
        }
    }

    /**
     * Reload from disk before a write operation to minimize race conditions.
     * This ensures we have the latest state from other concurrent processes
     * before applying our change.
     */
    private reloadBeforeWrite(): void {
        if (!this.sqlModule || !existsSync(this.dbPath)) return;

        try {
            const buffer = readFileSync(this.dbPath);
            if (this.db) {
                try { this.db.close(); } catch { /* ignore */ }
            }
            this.db = new this.sqlModule.Database(buffer);
        } catch {
            // If reload fails, continue with current in-memory state
        }
    }

    private initTables(): void {
        if (!this.db) return;

        // Check if tables already exist before creating them
        const tablesExist = this.db.exec(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'"
        );
        const needsInit = tablesExist.length === 0 || tablesExist[0]?.values?.length === 0;

        this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        assistant TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        project_path TEXT,
        metadata TEXT
      )
    `);

        this.db.run(`
      CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        duration_ms INTEGER,
        tool_name TEXT,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

        this.db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_assistant ON sessions(assistant)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_interactions_session ON interactions(session_id)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type)`);

        // Only save if tables were just created (avoid unnecessary file writes
        // that cause race conditions between concurrent hook processes)
        if (needsInit) {
            this.saveToDisk();
        }
    }

    /** Ensure database is ready */
    async ready(): Promise<void> {
        await this.initialized;
    }

    /** Save database to disk using atomic write to prevent corruption */
    private saveToDisk(): void {
        if (!this.db) return;
        const data = this.db.export();
        const buffer = Buffer.from(data);

        // Atomic write: write to temp file then rename
        // This prevents partial writes from corrupting the database
        const tmpPath = this.dbPath + '.tmp.' + process.pid;
        try {
            writeFileSync(tmpPath, buffer);
            renameSync(tmpPath, this.dbPath);
        } catch (error) {
            // Clean up temp file on failure
            try { unlinkSync(tmpPath); } catch { /* ignore */ }
            throw error;
        }
    }

    /** Create a new session and return its ID */
    createSession(session: Omit<Session, 'id'>): string {
        // Reload from disk to get latest state from other processes
        this.reloadBeforeWrite();
        if (!this.db) throw new Error('Database not initialized');

        const id = randomUUID();
        this.db.run(
            `INSERT INTO sessions (id, assistant, start_time, end_time, project_path, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [
                id,
                session.assistant,
                session.startTime.getTime(),
                session.endTime?.getTime() ?? null,
                session.projectPath ?? null,
                session.metadata ? JSON.stringify(session.metadata) : null
            ]
        );

        this.saveToDisk();
        return id;
    }

    /** End a session by setting its end time */
    endSession(sessionId: string, endTime: Date = new Date()): void {
        // Reload from disk to get latest state from other processes
        this.reloadBeforeWrite();
        if (!this.db) throw new Error('Database not initialized');

        this.db.run(
            `UPDATE sessions SET end_time = ? WHERE id = ?`,
            [endTime.getTime(), sessionId]
        );
        this.saveToDisk();
    }

    /** Get a session by ID */
    getSession(sessionId: string): Session | null {
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`SELECT * FROM sessions WHERE id = ?`);
        stmt.bind([sessionId]);

        if (stmt.step()) {
            const row = stmt.getAsObject() as unknown as SessionRow;
            stmt.free();
            return this.rowToSession(row);
        }
        stmt.free();
        return null;
    }

    /** Get all sessions */
    getAllSessions(): Session[] {
        if (!this.db) throw new Error('Database not initialized');

        const results: Session[] = [];
        const stmt = this.db.prepare(`SELECT * FROM sessions ORDER BY start_time DESC`);

        while (stmt.step()) {
            const row = stmt.getAsObject() as unknown as SessionRow;
            results.push(this.rowToSession(row));
        }
        stmt.free();
        return results;
    }

    /** Record an interaction */
    recordInteraction(interaction: Omit<Interaction, 'id'>): string {
        // Reload from disk to get latest state from other processes
        this.reloadBeforeWrite();
        if (!this.db) throw new Error('Database not initialized');

        const id = randomUUID();
        this.db.run(
            `INSERT INTO interactions (id, session_id, type, timestamp, duration_ms, tool_name, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                interaction.sessionId,
                interaction.type,
                interaction.timestamp.getTime(),
                interaction.durationMs ?? null,
                interaction.toolName ?? null,
                interaction.metadata ? JSON.stringify(interaction.metadata) : null
            ]
        );

        this.saveToDisk();
        return id;
    }

    /** Get all interactions for a session */
    getSessionInteractions(sessionId: string): Interaction[] {
        if (!this.db) throw new Error('Database not initialized');

        const results: Interaction[] = [];
        const stmt = this.db.prepare(`SELECT * FROM interactions WHERE session_id = ? ORDER BY timestamp`);
        stmt.bind([sessionId]);

        while (stmt.step()) {
            const row = stmt.getAsObject() as unknown as InteractionRow;
            results.push(this.rowToInteraction(row));
        }
        stmt.free();
        return results;
    }

    /** Get all interactions */
    getAllInteractions(): Interaction[] {
        if (!this.db) throw new Error('Database not initialized');

        const results: Interaction[] = [];
        const stmt = this.db.prepare(`SELECT * FROM interactions ORDER BY timestamp DESC`);

        while (stmt.step()) {
            const row = stmt.getAsObject() as unknown as InteractionRow;
            results.push(this.rowToInteraction(row));
        }
        stmt.free();
        return results;
    }

    /** Get interaction counts by type */
    getInteractionCounts(): Record<string, number> {
        if (!this.db) throw new Error('Database not initialized');

        const results: Record<string, number> = {};
        const stmt = this.db.prepare(`SELECT type, COUNT(*) as count FROM interactions GROUP BY type`);

        while (stmt.step()) {
            const row = stmt.getAsObject() as { type: string; count: number };
            results[row.type] = row.count;
        }
        stmt.free();
        return results;
    }

    /** Get total hours tracked */
    getTotalHours(): number {
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(
            `SELECT SUM(COALESCE(end_time, ?) - start_time) as total_ms FROM sessions`
        );
        stmt.bind([Date.now()]);

        let totalMs = 0;
        if (stmt.step()) {
            const row = stmt.getAsObject() as { total_ms: number | null };
            totalMs = row.total_ms ?? 0;
        }
        stmt.free();
        return totalMs / (1000 * 60 * 60);
    }

    /** Close database connection */
    close(): void {
        if (this.db) {
            this.saveToDisk();
            this.db.close();
            this.db = null;
        }
    }

    private rowToSession(row: SessionRow): Session {
        return {
            id: row.id,
            assistant: row.assistant as Session['assistant'],
            startTime: new Date(row.start_time),
            endTime: row.end_time ? new Date(row.end_time) : undefined,
            projectPath: row.project_path ?? undefined,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        };
    }

    private rowToInteraction(row: InteractionRow): Interaction {
        return {
            id: row.id,
            sessionId: row.session_id,
            type: row.type as Interaction['type'],
            timestamp: new Date(row.timestamp),
            durationMs: row.duration_ms ?? undefined,
            toolName: row.tool_name ?? undefined,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        };
    }
}

interface SessionRow {
    id: string;
    assistant: string;
    start_time: number;
    end_time: number | null;
    project_path: string | null;
    metadata: string | null;
}

interface InteractionRow {
    id: string;
    session_id: string;
    type: string;
    timestamp: number;
    duration_ms: number | null;
    tool_name: string | null;
    metadata: string | null;
}
