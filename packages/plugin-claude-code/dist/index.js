/**
 * StatsCode Claude Code Hooks
 *
 * These hooks integrate with Claude Code's lifecycle events
 * to automatically track sessions and interactions.
 */
import { StatsCode } from '@statscode/core';
import { homedir } from 'os';
import { join } from 'path';
// Global tracker instance
let statsCode = null;
let initPromise = null;
/**
 * Get or create the StatsCode instance (async)
 */
async function getStatsCode() {
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
                event.data.forEach((tip) => {
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
export async function PreToolUse(params) {
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
export async function PostToolUse(params) {
    const sc = await getStatsCode();
    const tracker = sc.getTracker();
    let interactionType = 'response';
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
export async function OnPrompt(_params) {
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
export async function Stop() {
    if (!statsCode)
        return;
    const tracker = statsCode.getTracker();
    tracker.endSession();
    statsCode.close();
    statsCode = null;
    initPromise = null;
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
    let input = {};
    try {
        const chunks = [];
        for await (const chunk of process.stdin) {
            chunks.push(chunk);
        }
        const rawInput = Buffer.concat(chunks).toString('utf8');
        if (rawInput.trim()) {
            input = JSON.parse(rawInput);
        }
    }
    catch (e) {
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
    }
    catch (error) {
        console.error(`Hook ${hookName} failed:`, error);
        process.exit(1);
    }
}
// Run CLI handler
main();
//# sourceMappingURL=index.js.map