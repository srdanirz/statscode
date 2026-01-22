/**
 * StatsCode Claude Code Hooks
 * 
 * These hooks integrate with Claude Code's lifecycle events
 * to automatically track sessions and interactions.
 */

import { StatsCode, InteractionType, TrackerEvent } from '@statscode/core';
import { homedir } from 'os';
import { join } from 'path';
import { autoSync } from './auto-sync.js';

// Global tracker instance
let statsCode: StatsCode | null = null;
let initPromise: Promise<void> | null = null;

// Periodic sync state
let lastSyncTime: number = 0;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SYNC_DEBOUNCE_MS = 30 * 1000; // 30 seconds debounce

/**
 * Debounced periodic sync - prevents data loss if session is killed abruptly
 */
function schedulePeriodicSync(): void {
    // Clear any existing timer
    if (syncTimer) {
        clearTimeout(syncTimer);
    }

    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTime;

    // If it's been more than SYNC_INTERVAL since last sync, sync immediately
    if (timeSinceLastSync >= SYNC_INTERVAL_MS) {
        performPeriodicSync();
        return;
    }

    // Otherwise, schedule a sync for later (debounced)
    const timeUntilNextSync = Math.min(
        SYNC_DEBOUNCE_MS,
        SYNC_INTERVAL_MS - timeSinceLastSync
    );

    syncTimer = setTimeout(() => {
        performPeriodicSync();
    }, timeUntilNextSync);
}

/**
 * Perform the actual sync (non-blocking, silent)
 */
async function performPeriodicSync(): Promise<void> {
    lastSyncTime = Date.now();

    // Run sync in background - don't await to avoid blocking
    autoSync().catch(() => {
        // Silent failure - periodic sync should never break workflow
    });
}

/**
 * Get or create the StatsCode instance (async)
 */
async function getStatsCode(): Promise<StatsCode> {
    if (!statsCode) {
        statsCode = new StatsCode({
            dbPath: join(homedir(), '.statscode', 'stats.sqlite'),
            debug: process.env.STATSCODE_DEBUG === 'true',
            enableTips: true
        });

        // Listen for AI Coach tips
        statsCode.getTracker().on((event: TrackerEvent) => {
            if (event.type === 'tips_received' && Array.isArray(event.data)) {
                console.log('\n\x1b[36m🤖 AI Coach Tips:\x1b[0m');
                event.data.forEach((tip: any) => {
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
 * Hook: PreToolUse
 * Called before Claude Code uses any tool
 */
export async function PreToolUse(params: {
    tool_name: string;
    tool_input: Record<string, unknown>;
}): Promise<{ skip?: boolean } | void> {
    const sc = await getStatsCode();
    const tracker = sc.getTracker();

    // Start session if not already started
    if (!tracker.hasActiveSession()) {
        tracker.startSession('claude-code', process.cwd());
    }

    // Enhanced metadata for code generation tracking
    const metadata: Record<string, any> = {
        inputKeys: Object.keys(params.tool_input)
    };

    // Track file operations for language and LOC stats
    if (params.tool_name === 'Edit' || params.tool_name === 'Write') {
        const filePath = params.tool_input.file_path as string;
        if (filePath) {
            metadata.filePath = filePath;

            // Count lines for Edit (old_string + new_string) or Write (content)
            if (params.tool_name === 'Edit') {
                const newString = params.tool_input.new_string as string;
                if (newString) {
                    metadata.linesGenerated = newString.split('\n').length;
                }
            } else if (params.tool_name === 'Write') {
                const content = params.tool_input.content as string;
                if (content) {
                    metadata.linesGenerated = content.split('\n').length;
                }
            }
        }
    }

    // Record the tool use
    tracker.recordInteraction('tool_use', {
        toolName: params.tool_name,
        metadata
    });

    return undefined;
}

/**
 * Hook: PostToolUse
 * Called after Claude Code uses any tool
 */
export async function PostToolUse(params: {
    tool_name: string;
    tool_input: Record<string, unknown>;
    tool_result: {
        success: boolean;
        error?: string;
    };
}): Promise<void> {
    const sc = await getStatsCode();
    const tracker = sc.getTracker();

    let interactionType: InteractionType = 'response';
    if (params.tool_name.includes('edit') || params.tool_name.includes('write')) {
        interactionType = params.tool_result.success ? 'accept' : 'reject';
    }

    tracker.recordInteraction(interactionType, {
        toolName: params.tool_name,
        metadata: { success: params.tool_result.success }
    });
}

/**
 * Hook: OnPrompt
 * Called when user sends a prompt
 */
export async function OnPrompt(_params: {
    prompt: string;
}): Promise<void> {
    const sc = await getStatsCode();
    const tracker = sc.getTracker();

    if (!tracker.hasActiveSession()) {
        tracker.startSession('claude-code', process.cwd());
    }

    tracker.recordInteraction('prompt', {
        metadata: { timestamp: new Date().toISOString() }
    });

    // Trigger periodic sync (debounced) - saves data even if session killed
    schedulePeriodicSync();
}

/**
 * Hook: Stop
 * Called when Claude Code session ends
 */
export async function Stop(): Promise<void> {
    // Clear any pending periodic sync timer
    if (syncTimer) {
        clearTimeout(syncTimer);
        syncTimer = null;
    }

    if (!statsCode) return;

    const tracker = statsCode.getTracker();
    tracker.endSession();

    // Final sync on session end (blocking to ensure data is saved)
    await autoSync();

    statsCode.close();
    statsCode = null;
    initPromise = null;
    lastSyncTime = 0;
}

export { getStatsCode };

/**
 * CLI Handler - Called by Claude Code via hooks.json
 * Reads JSON input from stdin and dispatches to appropriate hook
 */
async function main() {
    const hookName = process.argv[2];
    if (!hookName) {
        console.error('Usage: node hooks/index.js <HookName>');
        process.exit(1);
    }

    // Read stdin for hook input
    let input: any = {};
    try {
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) {
            chunks.push(chunk);
        }
        const rawInput = Buffer.concat(chunks).toString('utf8');
        if (rawInput.trim()) {
            input = JSON.parse(rawInput);
        }
    } catch (e) {
        // No stdin or invalid JSON - continue with empty input
    }

    try {
        switch (hookName) {
            case 'PreToolUse':
                await PreToolUse({
                    tool_name: input.tool_name || '',
                    tool_input: input.tool_input || {}
                });
                break;
            case 'PostToolUse':
                await PostToolUse({
                    tool_name: input.tool_name || '',
                    tool_input: input.tool_input || {},
                    tool_result: input.tool_result || { success: true }
                });
                break;
            case 'OnPrompt':
                await OnPrompt({ prompt: input.prompt || '' });
                break;
            case 'Stop':
            case 'SessionEnd':
                await Stop();
                break;
            case 'SessionStart':
                // Just initialize the session
                const sc = await getStatsCode();
                const tracker = sc.getTracker();
                if (!tracker.hasActiveSession()) {
                    tracker.startSession('claude-code', input.cwd || process.cwd());
                }
                break;
            default:
                console.error(`Unknown hook: ${hookName}`);
                process.exit(1);
        }
        process.exit(0);
    } catch (error) {
        console.error(`Hook ${hookName} failed:`, error);
        process.exit(1);
    }
}

// Run CLI handler
main();
