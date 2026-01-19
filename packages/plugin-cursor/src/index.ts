/**
 * StatsCode Cursor Plugin
 * Integration for Cursor IDE
 * 
 * Can be used as a VS Code extension or standalone
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

/** Start tracking a Cursor session */
export async function startSession(projectPath?: string): Promise<string> {
    const sc = await getStatsCode();
    const tracker = sc.getTracker();
    return tracker.startSession('cursor', projectPath ?? process.cwd());
}

/** End the current session */
export async function endSession(): Promise<void> {
    if (!statsCode) return;
    statsCode.getTracker().endSession();
}

/** Record a prompt interaction */
export async function recordPrompt(): Promise<void> {
    const sc = await getStatsCode();
    const tracker = sc.getTracker();

    if (!tracker.hasActiveSession()) {
        tracker.startSession('cursor', process.cwd());
    }
    tracker.recordInteraction('prompt');
}

/** Record a code generation/edit */
export async function recordCodeGeneration(accepted: boolean): Promise<void> {
    const sc = await getStatsCode();
    const tracker = sc.getTracker();

    const type: InteractionType = accepted ? 'accept' : 'reject';
    tracker.recordInteraction(type, { toolName: 'code_generation' });
}

/** Record when user edits AI suggestion before accepting */
export async function recordEdit(): Promise<void> {
    const sc = await getStatsCode();
    const tracker = sc.getTracker();
    tracker.recordInteraction('edit');
}

/** Get current stats */
export async function getStats() {
    const sc = await getStatsCode();
    return sc.getStats();
}

/** Generate badge SVG */
export async function getBadge(): Promise<string> {
    const sc = await getStatsCode();
    return sc.getBadgeSVG();
}

/** Export stats as JSON */
export async function exportStats(): Promise<string> {
    const sc = await getStatsCode();
    return sc.getJSON();
}

/** Cleanup on extension deactivation */
export async function deactivate(): Promise<void> {
    if (!statsCode) return;
    statsCode.getTracker().endSession();
    statsCode.close();
    statsCode = null;
    initPromise = null;
}

export { getStatsCode };
