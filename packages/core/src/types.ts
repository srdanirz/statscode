/**
 * StatsCode Core Types
 * Defines all the data structures used throughout the library
 */

/** Supported AI coding assistants */
export type AssistantType = 'claude-code' | 'opencode' | 'codex' | 'antigravity' | 'cursor';

/** Interaction types during a session */
export type InteractionType =
    | 'prompt'      // User sends a prompt
    | 'response'    // AI responds
    | 'tool_use'    // AI uses a tool (file edit, command, etc)
    | 'accept'      // User accepts a change
    | 'reject'      // User rejects a change
    | 'edit'        // User edits AI output before accepting
    | 'undo';       // User undoes a change

/** A single session with an AI assistant */
export interface Session {
    id: string;
    assistant: AssistantType;
    startTime: Date;
    endTime?: Date;
    projectPath?: string;
    metadata?: Record<string, unknown>;
}

/** A single interaction within a session */
export interface Interaction {
    id: string;
    sessionId: string;
    type: InteractionType;
    timestamp: Date;
    durationMs?: number;
    toolName?: string;
    metadata?: Record<string, unknown>;
}

/** Aggregated stats for a user */
export interface UserStats {
    totalHours: number;
    totalSessions: number;
    totalInteractions: number;
    byAssistant: Record<AssistantType, AssistantStats>;
    badges: Badge[];
    score: number;
    lastUpdated: Date;
}

/** Stats for a specific assistant */
export interface AssistantStats {
    hours: number;
    sessions: number;
    interactions: number;
    acceptRate: number;
    editRate: number;
    avgSessionDuration: number;
}

/** Badge definitions */
export interface Badge {
    id: BadgeId;
    name: string;
    description: string;
    icon: string;
    earnedAt?: Date;
}

/** Available badge IDs */
export type BadgeId =
    | 'power-user'
    | 'thoughtful'
    | 'tester'
    | 'documenter'
    | 'speed-demon'
    | 'careful';

/** Badge criteria configuration */
export interface BadgeCriteria {
    id: BadgeId;
    name: string;
    icon: string;
    description: string;
    check: (stats: UserStats) => boolean;
}

/** Certificate data for export/verification */
export interface Certificate {
    userId: string;
    generatedAt: Date;
    stats: UserStats;
    verificationHash: string;
}

/** Event emitted by the tracker */
export interface TrackerEvent {
    type: 'session_start' | 'session_end' | 'interaction' | 'tips_received';
    timestamp: Date;
    data: Session | Interaction | Tip[];
}

/** AI Coach tip */
export interface Tip {
    id: string;
    text: string;
    source: 'rule' | 'ai';
}

/** Configuration for StatsCode */
export interface StatsCodeConfig {
    /** Path to SQLite database file */
    dbPath?: string;
    /** User identifier (e.g., github:username) */
    userId?: string;
    /** Enable debug logging */
    debug?: boolean;
    /** Enable AI Coach tips at end of session */
    enableTips?: boolean;
    /** API URL for StatsCode cloud */
    apiUrl?: string;
}
