/**
 * StatsCode OpenCode Plugin
 * Integration for OpenCode AI assistant
 *
 * This plugin follows OpenCode's official plugin system:
 * @see https://opencode.ai/docs/plugins/
 *
 * Installation:
 * - Local: Place in .opencode/plugins/ (project) or ~/.config/opencode/plugins/ (global)
 * - npm: Add "@statscode/plugin-opencode" to opencode.json under "plugin" array
 *
 * Hooks Reference:
 * @see https://opencode.ai/docs/plugins/#sistema-de-hooks
 */

import { StatsCode, InteractionType, TrackerEvent } from '@statscode/core';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

// Session state file for multi-process persistence
const SESSION_FILE = join(homedir(), '.statscode', 'current_session_opencode.json');

let statsCode: StatsCode | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize StatsCode instance
 */
async function getStatsCode(): Promise<StatsCode> {
    if (!statsCode) {
        const dir = join(homedir(), '.statscode');
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        statsCode = new StatsCode({
            dbPath: join(dir, 'stats.sqlite'),
            debug: process.env.STATSCODE_DEBUG === 'true',
            enableTips: true
        });

        // Listen for AI Coach tips
        statsCode.getTracker().on((event: TrackerEvent) => {
            if (event.type === 'tips_received' && Array.isArray(event.data)) {
                console.log('\n\x1b[36m🤖 AI Coach Tips:\x1b[0m');
                event.data.forEach((tip: { text: string }) => {
                    console.log(`\x1b[33m• ${tip.text}\x1b[0m`);
                });
                console.log('');
            }
        });

        initPromise = statsCode.ready();
    }
    await initPromise;
    return statsCode;
}

/**
 * Save session ID for persistence across hook invocations
 */
function saveSessionId(sessionId: string): void {
    try {
        const dir = join(homedir(), '.statscode');
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(SESSION_FILE, JSON.stringify({ sessionId, timestamp: Date.now() }));
    } catch {
        // Silent failure
    }
}

/**
 * Load session ID from file
 */
function loadSessionId(): string | null {
    try {
        if (!existsSync(SESSION_FILE)) return null;
        const data = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
        // Session expires after 2 hours of inactivity
        if (Date.now() - data.timestamp > 2 * 60 * 60 * 1000) {
            return null;
        }
        return data.sessionId;
    } catch {
        return null;
    }
}

/**
 * Get tracker ready for recording, attaching to existing session if available
 */
async function getReadyTracker(createIfMissing: boolean = false) {
    const sc = await getStatsCode();
    const tracker = sc.getTracker();

    if (tracker.hasActiveSession()) {
        return { sc, tracker };
    }

    const savedSessionId = loadSessionId();
    if (savedSessionId) {
        const attached = tracker.attachToSession(savedSessionId);
        if (attached) {
            return { sc, tracker };
        }
    }

    if (!createIfMissing) {
        return null;
    }

    const sessionId = tracker.startSession('opencode', process.cwd());
    saveSessionId(sessionId);

    return { sc, tracker };
}

/**
 * OpenCode Plugin Context
 * @see https://opencode.ai/docs/plugins/#como-crear-plugins
 */
interface OpenCodeContext {
    /** Current project information */
    project?: {
        path: string;
        name: string;
    };
    /** OpenCode SDK client for API access */
    client?: {
        app: {
            log: (level: 'debug' | 'info' | 'warn' | 'error', message: string) => void;
        };
    };
    /** Bun shell API */
    $?: unknown;
    /** Current working directory */
    directory?: string;
    /** Git worktree information */
    worktree?: unknown;
}

/**
 * Tool execution context
 * @see https://opencode.ai/docs/plugins/#herramientas
 */
interface ToolContext {
    name: string;
    args: Record<string, unknown>;
    result?: {
        success: boolean;
        error?: string;
    };
}

/**
 * Session context
 * @see https://opencode.ai/docs/plugins/#eventos-disponibles
 */
interface SessionContext {
    id: string;
    startTime?: number;
}

/**
 * OpenCode Plugin Entry Point
 *
 * This is the main export that OpenCode loads. It follows the official plugin structure:
 * @see https://opencode.ai/docs/plugins/#como-crear-plugins
 *
 * The plugin receives a context object with:
 * - project: Current project information
 * - client: OpenCode SDK client for logging and API access
 * - $: Bun shell API for executing commands
 * - directory: Current working directory
 * - worktree: Git worktree information
 */
export const Plugin = async (context: OpenCodeContext) => {
    const projectPath = context.project?.path ?? context.directory ?? process.cwd();

    return {
        /**
         * Hooks - Intercept OpenCode lifecycle events
         * @see https://opencode.ai/docs/plugins/#sistema-de-hooks
         */
        hooks: {
            /**
             * Called when a new session is created
             * @see https://opencode.ai/docs/plugins/#eventos-disponibles
             */
            'session.created': async (_session: SessionContext) => {
                const sc = await getStatsCode();
                const tracker = sc.getTracker();
                const sessionId = tracker.startSession('opencode', projectPath);
                saveSessionId(sessionId);

                context.client?.app.log('info', '[StatsCode] Session tracking started');
            },

            /**
             * Called when session context is compacted
             * @see https://opencode.ai/docs/plugins/#eventos-disponibles
             */
            'session.compacted': async () => {
                // Sync stats before context is lost
                const ready = await getReadyTracker(false);
                if (ready) {
                    context.client?.app.log('debug', '[StatsCode] Session compacted, syncing stats');
                }
            },

            /**
             * Called when a session error occurs
             * @see https://opencode.ai/docs/plugins/#eventos-disponibles
             */
            'session.error': async (error: { message: string }) => {
                const ready = await getReadyTracker(false);
                if (ready) {
                    ready.tracker.recordInteraction('reject', {
                        metadata: { error: error.message }
                    });
                }
            },

            /**
             * Called BEFORE a tool is executed
             * @see https://opencode.ai/docs/plugins/#herramientas
             */
            'tool.execute.before': async (tool: ToolContext) => {
                const ready = await getReadyTracker(true);
                if (!ready) return;

                const metadata: Record<string, unknown> = {
                    inputKeys: Object.keys(tool.args)
                };

                // Track file operations for LOC stats
                if (tool.name === 'file.edit' || tool.name === 'Edit') {
                    const filePath = tool.args.file_path as string;
                    const oldString = tool.args.old_string as string;
                    const newString = tool.args.new_string as string;

                    if (filePath) metadata.filePath = filePath;
                    if (oldString && newString) {
                        metadata.linesRemoved = oldString.split('\n').length;
                        metadata.linesAdded = newString.split('\n').length;
                        metadata.linesNet = (metadata.linesAdded as number) - (metadata.linesRemoved as number);
                    }
                }

                if (tool.name === 'file.write' || tool.name === 'Write') {
                    const content = tool.args.content as string;
                    if (content) {
                        metadata.linesAdded = content.split('\n').length;
                        metadata.linesRemoved = 0;
                        metadata.linesNet = metadata.linesAdded;
                    }
                }

                ready.tracker.recordInteraction('tool_use', {
                    toolName: tool.name,
                    metadata
                });
            },

            /**
             * Called AFTER a tool is executed
             * @see https://opencode.ai/docs/plugins/#herramientas
             */
            'tool.execute.after': async (tool: ToolContext) => {
                const ready = await getReadyTracker(false);
                if (!ready) return;

                const interactionType: InteractionType = tool.result?.success ? 'accept' : 'reject';
                ready.tracker.recordInteraction(interactionType, {
                    toolName: tool.name,
                    metadata: {
                        success: tool.result?.success,
                        error: tool.result?.error
                    }
                });
            },

            /**
             * Called when user permission is asked
             * @see https://opencode.ai/docs/plugins/#eventos-disponibles
             */
            'permission.asked': async () => {
                const ready = await getReadyTracker(false);
                if (ready) {
                    ready.tracker.recordInteraction('prompt', {
                        metadata: { type: 'permission_request' }
                    });
                }
            },

            /**
             * Called when a message is updated (user input)
             * @see https://opencode.ai/docs/plugins/#eventos-disponibles
             */
            'message.updated': async () => {
                const ready = await getReadyTracker(true);
                if (ready) {
                    ready.tracker.recordInteraction('prompt', {
                        metadata: { timestamp: new Date().toISOString() }
                    });
                }
            }
        },

        /**
         * Custom tools exposed to OpenCode
         * @see https://opencode.ai/docs/plugins/#api-de-extensibilidad
         */
        tools: {
            /**
             * View your StatsCode statistics
             */
            'statscode.stats': {
                description: 'View your StatsCode AI coding statistics',
                args: {},
                async execute() {
                    const sc = await getStatsCode();
                    const stats = sc.getStats();
                    return JSON.stringify(stats, null, 2);
                }
            },

            /**
             * Generate a badge SVG for your profile
             */
            'statscode.badge': {
                description: 'Generate a StatsCode badge SVG for your GitHub profile',
                args: {},
                async execute() {
                    const sc = await getStatsCode();
                    return sc.getBadgeSVG();
                }
            },

            /**
             * Force sync stats to cloud
             */
            'statscode.sync': {
                description: 'Force sync your stats to StatsCode cloud',
                args: {},
                async execute() {
                    const ready = await getReadyTracker(false);
                    if (!ready) {
                        return 'No active session to sync';
                    }
                    // Trigger sync logic here
                    return 'Stats synced successfully';
                }
            }
        },

        /**
         * Cleanup handler - called when plugin is unloaded
         */
        cleanup: async () => {
            if (statsCode) {
                statsCode.getTracker().endSession();
                statsCode.close();
                statsCode = null;
                initPromise = null;
            }

            // Clear session file
            try {
                if (existsSync(SESSION_FILE)) {
                    writeFileSync(SESSION_FILE, JSON.stringify({ sessionId: null, timestamp: 0 }));
                }
            } catch {
                // Silent failure
            }
        }
    };
};

// Default export for backwards compatibility
export default Plugin;

// Named exports for direct usage
export { getStatsCode, getReadyTracker };
