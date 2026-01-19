/**
 * StatsCode API Client
 * SDK for interacting with StatsCode API (no credentials required)
 */

import type {
    User,
    UserStats,
    LeaderboardResponse,
    SyncPayload
} from './types.js';

const DEFAULT_API_URL = 'https://api.statscode.dev';

export class StatsCodeClient {
    private apiUrl: string;
    private token: string | null = null;

    constructor(options: { apiUrl?: string } = {}) {
        this.apiUrl = options.apiUrl || DEFAULT_API_URL;
    }

    /** Set authentication token */
    setToken(token: string): void {
        this.token = token;
    }

    /** Clear authentication */
    clearToken(): void {
        this.token = null;
    }

    /** Check if authenticated */
    isAuthenticated(): boolean {
        return this.token !== null;
    }

    /** Get auth headers */
    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // ─────────────────────────────────────────────────────────
    // Auth
    // ─────────────────────────────────────────────────────────

    /** Get OAuth URL to start login flow */
    getLoginUrl(): string {
        return `${this.apiUrl}/api/auth/github`;
    }

    /** Exchange token and get user info */
    async validateToken(token: string): Promise<{ user: User; token: string } | null> {
        try {
            const response = await fetch(`${this.apiUrl}/api/auth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            if (!response.ok) return null;
            const data = await response.json() as { user: User; token: string };
            return data;
        } catch {
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────
    // Stats
    // ─────────────────────────────────────────────────────────

    /** Sync local stats to cloud */
    async syncStats(stats: SyncPayload): Promise<{ success: boolean; deltaHours?: number }> {
        if (!this.token) {
            throw new Error('Not authenticated. Call setToken() first.');
        }

        const response = await fetch(`${this.apiUrl}/api/stats/sync`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(stats)
        });

        if (!response.ok) {
            throw new Error(`Sync failed: ${response.statusText}`);
        }

        const data = await response.json() as { success: boolean; deltaHours?: number };
        return data;
    }

    /** Get current user stats */
    async getMyStats(): Promise<UserStats | null> {
        if (!this.token) return null;

        const response = await fetch(`${this.apiUrl}/api/stats/me`, {
            headers: this.getHeaders()
        });

        if (!response.ok) return null;
        const data = await response.json() as UserStats;
        return data;
    }

    // ─────────────────────────────────────────────────────────
    // Users
    // ─────────────────────────────────────────────────────────

    /** Get public user profile */
    async getUser(username: string): Promise<{ user: User; stats: UserStats | null } | null> {
        const response = await fetch(`${this.apiUrl}/api/users/${username}`);
        if (!response.ok) return null;
        const data = await response.json() as { user: User; stats: UserStats | null };
        return data;
    }

    // ─────────────────────────────────────────────────────────
    // Leaderboard
    // ─────────────────────────────────────────────────────────

    /** Get leaderboard */
    async getLeaderboard(options: { limit?: number; offset?: number } = {}): Promise<LeaderboardResponse> {
        const params = new URLSearchParams();
        if (options.limit) params.set('limit', String(options.limit));
        if (options.offset) params.set('offset', String(options.offset));

        const response = await fetch(`${this.apiUrl}/api/leaderboard?${params}`);
        const data = await response.json() as LeaderboardResponse;
        return data;
    }

    // ─────────────────────────────────────────────────────────
    // Badge
    // ─────────────────────────────────────────────────────────

    /** Get dynamic badge URL for GitHub README */
    getBadgeUrl(username: string): string {
        return `${this.apiUrl}/badge/${username}.svg`;
    }

    /** Get badge markdown for GitHub README */
    getBadgeMarkdown(username: string): string {
        const badgeUrl = this.getBadgeUrl(username);
        const profileUrl = `https://statscode.dev/profile/${username}`;
        return `[![StatsCode](${badgeUrl})](${profileUrl})`;
    }

    // ─────────────────────────────────────────────────────────
    // AI Coach Tips
    // ─────────────────────────────────────────────────────────

    /** Session metrics for AI Coach */
    async getTips(metrics: SessionMetrics): Promise<Tip[]> {
        const params = new URLSearchParams({
            tool: metrics.tool,
            duration: String(metrics.duration),
            promptCount: String(metrics.promptCount || 0),
            filesReferenced: String(metrics.filesReferenced || 0),
            compactUsed: String(metrics.compactUsed || false),
            clearUsed: String(metrics.clearUsed || false)
        });

        if (metrics.approvalMode) {
            params.set('approvalMode', metrics.approvalMode);
        }
        if (metrics.taskBoundariesUsed !== undefined) {
            params.set('taskBoundariesUsed', String(metrics.taskBoundariesUsed));
        }
        if (metrics.inlineAcceptRate !== undefined) {
            params.set('inlineAcceptRate', String(metrics.inlineAcceptRate));
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/tips?${params}`);
            if (!response.ok) return [];
            const data = await response.json() as { success: boolean; data: Tip[] };
            return data.data || [];
        } catch {
            return [];
        }
    }
}

/** Session metrics for AI Coach analysis */
export interface SessionMetrics {
    tool: string;
    duration: number; // minutes
    promptCount?: number;
    filesReferenced?: number;
    compactUsed?: boolean;
    clearUsed?: boolean;
    approvalMode?: string;
    taskBoundariesUsed?: number;
    inlineAcceptRate?: number;
}

/** AI Coach tip */
export interface Tip {
    id: string;
    text: string;
    source: 'rule' | 'ai';
}
// Default export
export default StatsCodeClient;
