/**
 * StatsCode Tracker Module
 * Handles recording sessions and interactions
 */

import { StatsDatabase } from './database.js';
import {
    Session,
    Interaction,
    AssistantType,
    InteractionType,
    StatsCodeConfig,
    TrackerEvent,
    Tip
} from './types.js';

export class Tracker {
    private db: StatsDatabase;
    private currentSessionId: string | null = null;
    private config: StatsCodeConfig;
    private eventListeners: Array<(event: TrackerEvent) => void> = [];

    constructor(config: StatsCodeConfig = {}) {
        this.config = config;
        this.db = new StatsDatabase(config);
    }

    /** Ensure database is ready before operations */
    async ready(): Promise<void> {
        await this.db.ready();
    }

    /** Start a new session */
    startSession(assistant: AssistantType, projectPath?: string): string {
        // End any existing session first
        if (this.currentSessionId) {
            this.endSession();
        }

        const session: Omit<Session, 'id'> = {
            assistant,
            startTime: new Date(),
            projectPath
        };

        this.currentSessionId = this.db.createSession(session);

        this.emit({
            type: 'session_start',
            timestamp: new Date(),
            data: { ...session, id: this.currentSessionId }
        });

        if (this.config.debug) {
            console.log(`[StatsCode] Session started: ${this.currentSessionId}`);
        }

        return this.currentSessionId;
    }

    /** End the current session */
    async endSession(): Promise<void> {
        if (!this.currentSessionId) return;

        const endTime = new Date();
        this.db.endSession(this.currentSessionId, endTime);

        const session = this.db.getSession(this.currentSessionId);
        if (session) {
            this.emit({
                type: 'session_end',
                timestamp: endTime,
                data: session
            });

            // Fetch AI Coach tips if enabled
            if (this.config.enableTips) {
                const tips = await this.fetchTips(session);
                if (tips.length > 0) {
                    this.emit({
                        type: 'tips_received',
                        timestamp: new Date(),
                        data: tips
                    });
                }
            }
        }

        if (this.config.debug) {
            console.log(`[StatsCode] Session ended: ${this.currentSessionId}`);
        }

        this.currentSessionId = null;
    }

    /** Fetch tips from AI Coach API */
    private async fetchTips(session: Session): Promise<Tip[]> {
        const apiUrl = this.config.apiUrl || 'https://api.statscode.dev';

        try {
            // Calculate session duration in minutes
            const durationMs = session.endTime
                ? session.endTime.getTime() - session.startTime.getTime()
                : 0;
            const durationMinutes = Math.round(durationMs / 60000);

            // Get interaction counts from this session
            const interactions = this.db.getSessionInteractions(session.id);
            const promptCount = interactions.filter((i: Interaction) => i.type === 'prompt').length;
            const fileRefs = interactions.filter((i: Interaction) => i.toolName?.includes('file')).length;

            const params = new URLSearchParams({
                tool: session.assistant,
                duration: String(durationMinutes),
                promptCount: String(promptCount),
                filesReferenced: String(fileRefs),
                compactUsed: 'false',
                clearUsed: 'false'
            });

            const response = await fetch(`${apiUrl}/api/tips?${params}`);
            if (!response.ok) return [];

            const data = await response.json() as { success: boolean; data: Tip[] };
            return data.data || [];
        } catch (error) {
            if (this.config.debug) {
                console.error('[StatsCode] Failed to fetch tips:', error);
            }
            return [];
        }
    }

    /** Record an interaction in the current session */
    recordInteraction(
        type: InteractionType,
        options: {
            toolName?: string;
            durationMs?: number;
            metadata?: Record<string, unknown>;
        } = {}
    ): string | null {
        if (!this.currentSessionId) {
            if (this.config.debug) {
                console.warn('[StatsCode] No active session, interaction not recorded');
            }
            return null;
        }

        const interaction: Omit<Interaction, 'id'> = {
            sessionId: this.currentSessionId,
            type,
            timestamp: new Date(),
            ...options
        };

        const id = this.db.recordInteraction(interaction);

        this.emit({
            type: 'interaction',
            timestamp: new Date(),
            data: { ...interaction, id }
        });

        if (this.config.debug) {
            console.log(`[StatsCode] Interaction recorded: ${type}${options.toolName ? ` (${options.toolName})` : ''}`);
        }

        return id;
    }

    /** Get the current session ID */
    getCurrentSessionId(): string | null {
        return this.currentSessionId;
    }

    /** Check if there's an active session */
    hasActiveSession(): boolean {
        return this.currentSessionId !== null;
    }

    /**
     * Attach to an existing session without creating a new one.
     * This is useful for multi-process scenarios where SessionStart
     * creates the session and other hooks need to record to it.
     *
     * @param sessionId - The session ID to attach to
     * @returns true if attached successfully, false if session doesn't exist
     */
    attachToSession(sessionId: string): boolean {
        // Verify the session exists in the database
        const session = this.db.getSession(sessionId);
        if (!session) {
            if (this.config.debug) {
                console.warn(`[StatsCode] Cannot attach to non-existent session: ${sessionId}`);
            }
            return false;
        }

        // Check if session is still active (no end_time)
        if (session.endTime) {
            if (this.config.debug) {
                console.warn(`[StatsCode] Cannot attach to ended session: ${sessionId}`);
            }
            return false;
        }

        this.currentSessionId = sessionId;

        if (this.config.debug) {
            console.log(`[StatsCode] Attached to session: ${sessionId}`);
        }

        return true;
    }

    /** Get the current session ID */
    getSessionId(): string | null {
        return this.currentSessionId;
    }

    /** Subscribe to tracker events */
    on(listener: (event: TrackerEvent) => void): () => void {
        this.eventListeners.push(listener);
        return () => {
            const index = this.eventListeners.indexOf(listener);
            if (index > -1) {
                this.eventListeners.splice(index, 1);
            }
        };
    }

    /** Get the database instance for advanced queries */
    getDatabase(): StatsDatabase {
        return this.db;
    }

    /** Close the tracker and database connection */
    close(): void {
        if (this.currentSessionId) {
            this.endSession();
        }
        this.db.close();
    }

    private emit(event: TrackerEvent): void {
        for (const listener of this.eventListeners) {
            try {
                listener(event);
            } catch (error) {
                console.error('[StatsCode] Event listener error:', error);
            }
        }
    }
}
