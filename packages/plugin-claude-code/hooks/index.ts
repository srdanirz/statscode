/**
 * StatsCode Claude Code Hooks
 * 
 * These hooks integrate with Claude Code's lifecycle events
 * to automatically track sessions and interactions.
 */

import { StatsCode, InteractionType } from '@statscode/core';
import { homedir } from 'os';
import { join } from 'path';

// Global tracker instance
let statsCode: StatsCode | null = null;
let initPromise: Promise<void> | null = null;

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

    // Record the tool use
    tracker.recordInteraction('tool_use', {
        toolName: params.tool_name,
        metadata: {
            inputKeys: Object.keys(params.tool_input)
        }
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
}

/**
 * Hook: Stop
 * Called when Claude Code session ends
 */
export async function Stop(): Promise<void> {
    if (!statsCode) return;

    const tracker = statsCode.getTracker();
    tracker.endSession();
    statsCode.close();
    statsCode = null;
    initPromise = null;
}

export { getStatsCode };
