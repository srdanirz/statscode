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
    TrackerEvent
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
    endSession(): void {
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
        }

        if (this.config.debug) {
            console.log(`[StatsCode] Session ended: ${this.currentSessionId}`);
        }

        this.currentSessionId = null;
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
