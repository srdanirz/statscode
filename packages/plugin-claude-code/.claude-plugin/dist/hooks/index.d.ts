/**
 * StatsCode Claude Code Hooks
 *
 * These hooks integrate with Claude Code's lifecycle events
 * to automatically track sessions and interactions.
 */
import { StatsCode } from '@statscode/core';
/**
 * Get or create the StatsCode instance (async)
 */
declare function getStatsCode(): Promise<StatsCode>;
/**
 * Hook: PreToolUse
 * Called before Claude Code uses any tool
 */
export declare function PreToolUse(params: {
    tool_name: string;
    tool_input: Record<string, unknown>;
}): Promise<{
    skip?: boolean;
} | void>;
/**
 * Hook: PostToolUse
 * Called after Claude Code uses any tool
 */
export declare function PostToolUse(params: {
    tool_name: string;
    tool_input: Record<string, unknown>;
    tool_result: {
        success: boolean;
        error?: string;
    };
}): Promise<void>;
/**
 * Hook: OnPrompt
 * Called when user sends a prompt
 */
export declare function OnPrompt(_params: {
    prompt: string;
}): Promise<void>;
/**
 * Hook: Stop
 * Called when Claude Code session ends
 */
export declare function Stop(): Promise<void>;
export { getStatsCode };
//# sourceMappingURL=index.d.ts.map