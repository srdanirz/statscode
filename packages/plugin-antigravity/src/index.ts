/**
 * StatsCode Antigravity Plugin
 * Hooks for Antigravity AI coding assistant
 */

import { StatsCode, InteractionType } from '@statscode/core';
import { homedir } from 'os';
import { join } from 'path';

let statsCode: StatsCode | null = null;
let initPromise: Promise<void> | null = null;

async function getStatsCode(): Promise<StatsCode> {
    if (!statsCode) {
        statsCode = new StatsCode({
            dbPath: join(homedir(), '.statscode', 'stats.sqlite'),
            debug: process.env.STATSCODE_DEBUG === 'true',
            enableTips: true
        });

        // Listen for AI Coach tips
        statsCode.getTracker().on((event) => {
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

/** Hook: Before tool execution */
export async function onBeforeToolUse(toolName: string): Promise<void> {
    const sc = await getStatsCode();
    const tracker = sc.getTracker();

    if (!tracker.hasActiveSession()) {
        tracker.startSession('antigravity', process.cwd());
    }

    tracker.recordInteraction('tool_use', { toolName });
}

/** Hook: After tool execution */
export async function onAfterToolUse(toolName: string, success: boolean): Promise<void> {
    const sc = await getStatsCode();
    const tracker = sc.getTracker();

    const type: InteractionType = success ? 'accept' : 'reject';
    tracker.recordInteraction(type, { toolName, metadata: { success } });
}

/** Hook: On user prompt */
export async function onPrompt(): Promise<void> {
    const sc = await getStatsCode();
    const tracker = sc.getTracker();

    if (!tracker.hasActiveSession()) {
        tracker.startSession('antigravity', process.cwd());
    }
    tracker.recordInteraction('prompt');
}

/** Hook: On session end */
export async function onSessionEnd(): Promise<void> {
    if (!statsCode) return;
    statsCode.getTracker().endSession();
    statsCode.close();
    statsCode = null;
    initPromise = null;
}

/** Get current stats */
export async function getStats() {
    const sc = await getStatsCode();
    return sc.getStats();
}

/** Generate badge SVG */
export async function getBadge() {
    const sc = await getStatsCode();
    return sc.getBadgeSVG();
}

export { getStatsCode };
