/**
 * StatsCode API Client Types
 */

export interface User {
    username: string;
    name: string;
    avatar: string;
    rank?: number;
    joinedAt?: string;
}

export interface UserStats {
    totalHours: number;
    totalSessions: number;
    totalInteractions: number;
    totalLinesGenerated?: number;
    totalLinesAdded?: number;
    totalLinesRemoved?: number;
    score: number;
    byTool: Record<string, ToolStats>;
    byLanguage?: Record<string, number>;
    plugins?: string[];
    badges: string[];
}

export interface ToolStats {
    hours: number;
    sessions: number;
}

export interface LeaderboardEntry {
    rank: number;
    username: string;
    avatar?: string;
    totalHours: number;
    totalSessions: number;
    score: number;
    badges: number;
    tools: string[];
}

export interface LeaderboardResponse {
    data: LeaderboardEntry[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
    };
}

export interface AuthConfig {
    token: string;
}

export interface SyncPayload {
    totalHours: number;
    totalSessions: number;
    totalInteractions: number;
    totalLinesGenerated?: number;
    totalLinesAdded?: number;
    totalLinesRemoved?: number;
    byTool: Record<string, ToolStats>;
    byLanguage?: Record<string, number>;
    plugins?: string[];
    badges: string[];
    score: number;
}
