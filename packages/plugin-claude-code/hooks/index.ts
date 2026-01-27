/**
 * StatsCode Claude Code Hooks
 *
 * Integrates with Claude Code lifecycle events to track sessions and interactions.
 * Each hook runs in a SEPARATE process - session state persists via file system.
 */

import { StatsCode, InteractionType } from '@statscode/core';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { autoSync } from './auto-sync.js';

// Path to persist the current session ID between hook invocations
const SESSION_FILE = join(homedir(), '.statscode', 'current_session.json');

// Global tracker instance (per-process)
let statsCode: StatsCode | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Get or create the StatsCode instance (async)
 */
async function getStatsCode(): Promise<StatsCode> {
    if (!statsCode) {
        // Ensure directory exists
        const dir = join(homedir(), '.statscode');
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        statsCode = new StatsCode({
            dbPath: join(dir, 'stats.sqlite'),
            debug: process.env.STATSCODE_DEBUG === 'true',
            enableTips: false // Disable tips for hook processes
        });

        initPromise = statsCode.ready();
    }
    await initPromise;
    return statsCode;
}

/**
 * Save current session ID to file for other hook processes
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
 * Load current session ID from file
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
 * Get a tracker ready for recording interactions.
 *
 * For SessionStart (createIfMissing=true): Creates a new session.
 * For other hooks (createIfMissing=false): Attaches to existing session from file.
 *
 * This solves the multi-process architecture where each hook runs in a separate
 * Node.js process. SessionStart creates the session, other hooks attach to it.
 */
async function getReadyTracker(createIfMissing: boolean = false): Promise<{ sc: StatsCode; tracker: any } | null> {
    const sc = await getStatsCode();
    const tracker = sc.getTracker();

    // If tracker already has a session in memory (same process), use it
    if (tracker.hasActiveSession()) {
        return { sc, tracker };
    }

    // Try to attach to existing session from file
    const savedSessionId = loadSessionId();
    if (savedSessionId) {
        const attached = tracker.attachToSession(savedSessionId);
        if (attached) {
            return { sc, tracker };
        }
        // Session expired or doesn't exist - clear the file
    }

    // Only SessionStart can create new sessions
    if (!createIfMissing) {
        return null;
    }

    // Create a new session (only SessionStart reaches here)
    const sessionId = tracker.startSession('claude-code', process.cwd());
    saveSessionId(sessionId);

    return { sc, tracker };
}

/**
 * Hook: PreToolUse
 * Called before Claude Code uses any tool
 */
export async function PreToolUse(params: {
    tool_name: string;
    tool_input: Record<string, unknown>;
}): Promise<{ skip?: boolean } | void> {
    // Only record if we have a valid session (don't create one)
    const ready = await getReadyTracker(false);
    if (!ready) {
        return; // No session - skip recording
    }

    const { tracker } = ready;

    // Enhanced metadata for code generation tracking
    const metadata: Record<string, any> = {
        inputKeys: Object.keys(params.tool_input)
    };

    // Track file operations for language and LOC stats
    if (params.tool_name === 'Edit' || params.tool_name === 'Write') {
        const filePath = params.tool_input.file_path as string;
        if (filePath) {
            metadata.filePath = filePath;

            if (params.tool_name === 'Edit') {
                const oldString = params.tool_input.old_string as string;
                const newString = params.tool_input.new_string as string;

                const oldLines = oldString ? oldString.split('\n').length : 0;
                const newLines = newString ? newString.split('\n').length : 0;

                // Track all line changes
                metadata.linesRemoved = oldLines;
                metadata.linesAdded = newLines;
                // Net change (positive = added, negative = removed)
                metadata.linesNet = newLines - oldLines;
                // For backwards compatibility
                metadata.linesGenerated = newLines;
            } else if (params.tool_name === 'Write') {
                const content = params.tool_input.content as string;
                const lines = content ? content.split('\n').length : 0;
                metadata.linesAdded = lines;
                metadata.linesRemoved = 0;
                metadata.linesNet = lines;
                metadata.linesGenerated = lines;
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
    // Only record if we have a valid session (don't create one)
    const ready = await getReadyTracker(false);
    if (!ready) {
        return; // No session - skip recording
    }

    const { tracker } = ready;

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
 * Hook: SessionStart
 * Called when a new Claude Code conversation starts
 */
export async function SessionStart(): Promise<void> {
    const sc = await getStatsCode();
    const tracker = sc.getTracker();

    // Always start a fresh session on SessionStart
    const sessionId = tracker.startSession('claude-code', process.cwd());
    saveSessionId(sessionId);
}

/**
 * Hook: SessionEnd
 * Called when a Claude Code conversation ends
 */
export async function SessionEnd(): Promise<void> {
    // Final sync on session end (do this even if no active session)
    await autoSync();

    // Clean up session file
    try {
        if (existsSync(SESSION_FILE)) {
            writeFileSync(SESSION_FILE, JSON.stringify({ sessionId: null, timestamp: 0 }));
        }
    } catch {
        // Silent failure
    }
}

/**
 * Hook: OnPrompt
 * Called when user sends a prompt
 */
export async function OnPrompt(_params: {
    prompt: string;
}): Promise<void> {
    const ready = await getReadyTracker(false);
    if (!ready) return;

    ready.tracker.recordInteraction('prompt', {
        metadata: { timestamp: new Date().toISOString() }
    });
}

/**
 * Hook: Stop
 * Called when Claude Code stops responding (NOT when session ends)
 * This fires after EVERY response, so we should NOT clear the session file here
 */
export async function Stop(): Promise<void> {
    // Only sync, don't clear session - user might continue the conversation
    await autoSync();

    if (statsCode) {
        statsCode.close();
        statsCode = null;
        initPromise = null;
    }
}

/**
 * Hook: PreCompact
 * Called right before context compaction - perfect moment to capture session insights
 * This is when Claude has the full context and is about to summarize it
 */
export async function PreCompact(params: {
    trigger: 'manual' | 'auto';
    transcript_path?: string;
}): Promise<void> {
    // Generate session debrief before context is lost
    // Try transcript first, fall back to database-based debrief
    if (params.transcript_path && existsSync(params.transcript_path)) {
        await generateSessionDebrief(params.transcript_path, params.trigger);
    } else {
        // Fallback: Generate debrief from database session data
        await generateDatabaseDebrief(params.trigger);
    }
}

/**
 * Generate debrief from database session data (fallback when no transcript available)
 */
async function generateDatabaseDebrief(trigger?: string): Promise<void> {
    try {
        // Query database directly for session stats
        const dbPath = join(homedir(), '.statscode', 'stats.sqlite');
        if (!existsSync(dbPath)) return;

        // Dynamic import to handle ESM/CJS
        const initSqlJs = (await import('sql.js')).default;
        const SQL = await initSqlJs();
        const buffer = readFileSync(dbPath);
        const db = new SQL.Database(buffer);

        // Find the most recent session with at least 3 interactions
        // (PreCompact may have already created a new session, so we want the previous one with data)
        const sessionResult = db.exec(`
            SELECT s.id, COUNT(i.id) as interaction_count
            FROM sessions s
            LEFT JOIN interactions i ON i.session_id = s.id
            WHERE s.assistant = 'claude-code'
            GROUP BY s.id
            HAVING COUNT(i.id) >= 3
            ORDER BY s.start_time DESC
            LIMIT 1
        `);

        if (!sessionResult[0]?.values?.[0]) {
            db.close();
            return;
        }

        const sessionId = sessionResult[0].values[0][0] as string;

        // Check if we already have a debrief for this session
        const insightsDir = join(homedir(), '.statscode', 'insights');
        if (existsSync(insightsDir)) {
            const existingDebriefs = readdirSync(insightsDir);
            for (const file of existingDebriefs) {
                try {
                    const content = JSON.parse(readFileSync(join(insightsDir, file), 'utf-8'));
                    if (content.sessionId === sessionId) {
                        db.close();
                        return; // Already have a debrief for this session
                    }
                } catch {
                    // Skip invalid files
                }
            }
        }

        // Get interaction counts for this session
        const interactionsResult = db.exec(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN type = 'prompt' THEN 1 ELSE 0 END) as prompts,
                SUM(CASE WHEN type = 'tool_use' THEN 1 ELSE 0 END) as tool_uses,
                SUM(CASE WHEN tool_name IN ('Edit', 'Write') THEN 1 ELSE 0 END) as edits
            FROM interactions
            WHERE session_id = ?
        `, [sessionId]);

        if (!interactionsResult[0]?.values?.[0]) {
            db.close();
            return;
        }

        const [total, prompts, toolUses, edits] = interactionsResult[0].values[0] as number[];

        // Need at least 3 interactions for a meaningful debrief
        if (total < 3) {
            db.close();
            return;
        }

        // Get tool usage breakdown
        const toolUsageResult = db.exec(`
            SELECT tool_name, COUNT(*) as count
            FROM interactions
            WHERE session_id = ? AND tool_name IS NOT NULL
            GROUP BY tool_name
        `, [sessionId]);

        const toolUsage: Record<string, number> = {};
        if (toolUsageResult[0]?.values) {
            for (const [tool, count] of toolUsageResult[0].values) {
                toolUsage[tool as string] = count as number;
            }
        }

        // Get session duration
        const durationResult = db.exec(`
            SELECT
                MIN(timestamp) as start_time,
                MAX(timestamp) as end_time
            FROM interactions
            WHERE session_id = ?
        `, [sessionId]);

        let durationMinutes = 0;
        if (durationResult[0]?.values?.[0]) {
            const [startTime, endTime] = durationResult[0].values[0] as number[];
            durationMinutes = Math.round((endTime - startTime) / 60000);
        }

        db.close();

        // Create insights directory (reuse insightsDir from above)
        if (!existsSync(insightsDir)) {
            mkdirSync(insightsDir, { recursive: true });
        }

        // Build strengths and improvements
        const strengths: string[] = [];
        const improvements: string[] = [];

        if (edits > 5) {
            strengths.push('Productive editing session');
        }
        if (toolUses > 10) {
            strengths.push('Active tool usage');
        }
        if (prompts > 0 && prompts < toolUses * 0.3) {
            strengths.push('Efficient - few prompts, many actions');
        }

        // Generate debrief
        const debrief = {
            id: `debrief-${Date.now()}`,
            timestamp: new Date().toISOString(),
            trigger: trigger || 'auto',
            projectPath: process.cwd(),
            sessionId,

            metrics: {
                totalInteractions: total,
                userPrompts: prompts,
                toolUses: toolUses,
                edits: edits,
                errors: 0,
                durationMinutes
            },

            patterns: {
                strengths,
                improvements,
                toolUsage,
                commonErrors: [] as string[]
            },

            summary: `Session: ${prompts} prompts, ${toolUses} tool uses, ${edits} edits, ${durationMinutes}min`
        };

        // Save debrief
        const debriefPath = join(insightsDir, `${debrief.id}.json`);
        writeFileSync(debriefPath, JSON.stringify(debrief, null, 2));
    } catch {
        // Silent failure - insights are not critical
    }
}

/**
 * Generate a session debrief by analyzing the transcript
 * Saves insights locally for pattern detection
 */
async function generateSessionDebrief(transcriptPath?: string, trigger?: string): Promise<void> {
    if (!transcriptPath) return;

    try {
        // Read the full transcript
        if (!existsSync(transcriptPath)) return;

        const transcript = JSON.parse(readFileSync(transcriptPath, 'utf-8'));

        // Analyze the session
        const analysis = analyzeTranscript(transcript);

        // Only save if there's meaningful data
        if (analysis.totalInteractions < 5) return;

        // Create insights directory
        const insightsDir = join(homedir(), '.statscode', 'insights');
        if (!existsSync(insightsDir)) {
            mkdirSync(insightsDir, { recursive: true });
        }

        // Generate debrief
        const debrief = {
            id: `debrief-${Date.now()}`,
            timestamp: new Date().toISOString(),
            trigger: trigger || 'unknown',
            projectPath: process.cwd(),

            // Session metrics
            metrics: {
                totalInteractions: analysis.totalInteractions,
                userPrompts: analysis.userPrompts,
                toolUses: analysis.toolUses,
                edits: analysis.edits,
                errors: analysis.errors
            },

            // Detected patterns
            patterns: {
                strengths: analysis.strengths,
                improvements: analysis.improvements,
                toolUsage: analysis.toolUsage,
                commonErrors: analysis.commonErrors
            },

            // Raw data for future AI analysis
            summary: analysis.summary
        };

        // Save debrief
        const debriefPath = join(insightsDir, `${debrief.id}.json`);
        writeFileSync(debriefPath, JSON.stringify(debrief, null, 2));
    } catch {
        // Silent failure - insights are not critical
    }
}

/**
 * Analyze transcript to extract patterns and insights
 */
function analyzeTranscript(transcript: any[]): {
    totalInteractions: number;
    userPrompts: number;
    toolUses: number;
    edits: number;
    errors: number;
    strengths: string[];
    improvements: string[];
    toolUsage: Record<string, number>;
    commonErrors: string[];
    summary: string;
} {
    const result = {
        totalInteractions: 0,
        userPrompts: 0,
        toolUses: 0,
        edits: 0,
        errors: 0,
        strengths: [] as string[],
        improvements: [] as string[],
        toolUsage: {} as Record<string, number>,
        commonErrors: [] as string[],
        summary: ''
    };

    const errorMessages: string[] = [];
    const promptLengths: number[] = [];
    let shortPromptsInRow = 0;
    let maxShortPromptsInRow = 0;
    let contextualPrompts = 0;
    let vaguePrompts = 0;

    // Iterate through transcript
    for (const entry of transcript) {
        result.totalInteractions++;

        // User messages
        if (entry.role === 'user' || entry.type === 'human') {
            result.userPrompts++;
            const content = typeof entry.content === 'string'
                ? entry.content
                : JSON.stringify(entry.content);

            promptLengths.push(content.length);

            // Detect short/vague prompts
            if (content.length < 20) {
                shortPromptsInRow++;
                maxShortPromptsInRow = Math.max(maxShortPromptsInRow, shortPromptsInRow);
            } else {
                shortPromptsInRow = 0;
            }

            // Detect vague prompts
            const vaguePatterns = [
                /^(fix|arregla|hazlo|do it|help|ayuda)\s*$/i,
                /^(no funciona|doesn't work|broken|error)\s*$/i,
                /^(again|otra vez|retry)\s*$/i
            ];
            if (vaguePatterns.some(p => p.test(content.trim()))) {
                vaguePrompts++;
            }

            // Detect contextual prompts (good)
            if (content.includes('```') || content.includes('error:') || content.length > 100) {
                contextualPrompts++;
            }
        }

        // Tool uses
        if (entry.type === 'tool_use' || entry.tool_name) {
            result.toolUses++;
            const toolName = entry.tool_name || entry.name || 'unknown';
            result.toolUsage[toolName] = (result.toolUsage[toolName] || 0) + 1;

            if (toolName === 'Edit' || toolName === 'Write') {
                result.edits++;
            }
        }

        // Errors
        if (entry.type === 'tool_result' && entry.is_error) {
            result.errors++;
            const errorContent = typeof entry.content === 'string'
                ? entry.content.slice(0, 100)
                : 'Unknown error';
            errorMessages.push(errorContent);
        }
    }

    // Generate strengths
    if (contextualPrompts > result.userPrompts * 0.5) {
        result.strengths.push('Provides good context in prompts');
    }
    if (result.edits > 0 && result.errors < result.edits * 0.2) {
        result.strengths.push('Low error rate on edits');
    }
    if (promptLengths.length > 0) {
        const avgLength = promptLengths.reduce((a, b) => a + b, 0) / promptLengths.length;
        if (avgLength > 50) {
            result.strengths.push('Detailed prompts with good explanations');
        }
    }

    // Generate improvements
    if (vaguePrompts > 2) {
        result.improvements.push(`${vaguePrompts} vague prompts detected - try being more specific`);
    }
    if (maxShortPromptsInRow >= 3) {
        result.improvements.push('Multiple short prompts in a row - consider combining requests');
    }
    if (result.errors > result.toolUses * 0.3) {
        result.improvements.push('High error rate - review error messages before retrying');
    }

    // Common errors (dedupe and limit)
    result.commonErrors = [...new Set(errorMessages)].slice(0, 3);

    // Generate summary
    result.summary = `Session: ${result.userPrompts} prompts, ${result.toolUses} tool uses, ${result.edits} edits, ${result.errors} errors`;

    return result;
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
                await SessionStart();
                break;
            case 'PreCompact':
                await PreCompact({
                    trigger: input.trigger || 'auto',
                    transcript_path: input.transcript_path
                });
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
