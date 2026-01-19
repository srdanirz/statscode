/**
 * StatsCode OpenCode Plugin
 * Integration for OpenCode AI assistant
 * 
 * This plugin follows OpenCode's plugin system:
 * - Place in .opencode/plugin/ or ~/.config/opencode/plugin/
 * - Exports plugin functions with hooks
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

/** OpenCode plugin entry point */
export default function statsCodePlugin(context: { projectPath?: string }) {
    return {
        hooks: {
            onToolStart: async (toolName: string) => {
                const sc = await getStatsCode();
                const tracker = sc.getTracker();

                if (!tracker.hasActiveSession()) {
                    tracker.startSession('opencode', context.projectPath ?? process.cwd());
                }
                tracker.recordInteraction('tool_use', { toolName });
            },

            onToolEnd: async (toolName: string, result: { success: boolean }) => {
                const sc = await getStatsCode();
                const tracker = sc.getTracker();
                const type: InteractionType = result.success ? 'accept' : 'reject';
                tracker.recordInteraction(type, { toolName, metadata: result });
            },

            onPrompt: async () => {
                const sc = await getStatsCode();
                const tracker = sc.getTracker();
                if (!tracker.hasActiveSession()) {
                    tracker.startSession('opencode', context.projectPath ?? process.cwd());
                }
                tracker.recordInteraction('prompt');
            },

            onSessionEnd: async () => {
                if (!statsCode) return;
                statsCode.getTracker().endSession();
                statsCode.close();
                statsCode = null;
                initPromise = null;
            }
        },

        tools: {
            stats: {
                description: 'View your StatsCode statistics',
                execute: async () => {
                    const sc = await getStatsCode();
                    return sc.getStats();
                }
            },
            badge: {
                description: 'Generate a badge SVG',
                execute: async () => {
                    const sc = await getStatsCode();
                    return sc.getBadgeSVG();
                }
            }
        }
    };
}

export { getStatsCode };
