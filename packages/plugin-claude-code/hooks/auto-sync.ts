/**
 * Auto-Sync Helper
 * Automatically syncs local stats to StatsCode cloud after each session
 * Includes cryptographic signing to prevent manipulation
 */

import { StatsCodeClient } from '@statscode/api-client';
import { getDeviceId, createSignedEvent, detectAnomalies } from '@statscode/core';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { createHmac } from 'crypto';
import initSqlJs from 'sql.js';

// Define SyncPayload inline to avoid import issues with bundler
interface SignedEvent {
    type: 'session' | 'interaction';
    data: Record<string, unknown>;
    timestamp: number;
    deviceId: string;
    nonce: string;
    signature: string;
}

interface SyncPayload {
    totalHours: number;
    totalSessions: number;
    totalInteractions: number;
    totalLinesGenerated?: number;
    totalLinesAdded?: number;
    totalLinesRemoved?: number;
    byTool: Record<string, { hours: number; sessions: number }>;
    byLanguage?: Record<string, number>;
    plugins?: string[];
    badges: string[];
    score: number;
    // Security fields
    deviceId?: string;
    signedEvents?: SignedEvent[];
    signature?: string;
}

const CONFIG_PATH = join(homedir(), '.statscode', 'config.json');
const DB_PATH = join(homedir(), '.statscode', 'stats.sqlite');

interface Config {
    token?: string;
    username?: string;
    autoSync?: boolean;
}

/**
 * Read config from disk
 */
function readConfig(): Config {
    try {
        if (!existsSync(CONFIG_PATH)) {
            return {};
        }
        const content = readFileSync(CONFIG_PATH, 'utf-8');
        return JSON.parse(content);
    } catch {
        return {};
    }
}

/**
 * Save config to disk
 */
function saveConfig(config: Config): void {
    const configDir = join(homedir(), '.statscode');
    if (!existsSync(configDir)) {
        const { mkdirSync } = require('fs');
        mkdirSync(configDir, { recursive: true });
    }
    const { writeFileSync } = require('fs');
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Get installed Claude Code plugins
 */
function getInstalledPlugins(): string[] {
    try {
        const pluginsPath = join(homedir(), '.claude', 'plugins', 'installed_plugins.json');
        if (!existsSync(pluginsPath)) return [];

        const data = JSON.parse(readFileSync(pluginsPath, 'utf-8'));
        return Object.keys(data.plugins || {});
    } catch {
        return [];
    }
}

/**
 * Get programming language from file path
 */
function getLanguageFromPath(filePath: string): string {
    // Check by filename first
    const fileName = filePath.split('/').pop()?.toLowerCase();
    if (fileName === 'dockerfile') return 'Docker';
    if (fileName === 'makefile') return 'Make';
    if (fileName?.startsWith('.env')) return 'Env';

    // Extract extension
    const ext = filePath.split('.').pop()?.toLowerCase();

    const langMap: Record<string, string> = {
        // JavaScript/TypeScript
        'ts': 'TypeScript', 'tsx': 'TypeScript', 'mts': 'TypeScript', 'cts': 'TypeScript',
        'js': 'JavaScript', 'jsx': 'JavaScript', 'mjs': 'JavaScript', 'cjs': 'JavaScript',
        // Backend/Systems
        'py': 'Python', 'rs': 'Rust', 'go': 'Go', 'java': 'Java', 'kt': 'Kotlin',
        'scala': 'Scala', 'clj': 'Clojure', 'ex': 'Elixir', 'exs': 'Elixir',
        'erl': 'Erlang', 'nim': 'Nim', 'zig': 'Zig', 'swift': 'Swift',
        'c': 'C', 'cpp': 'C++', 'cc': 'C++', 'cxx': 'C++', 'cs': 'C#',
        'rb': 'Ruby', 'php': 'PHP',
        // Data/Science
        'ipynb': 'Jupyter', 'r': 'R', 'jl': 'Julia',
        // Frontend/Web
        'html': 'HTML', 'css': 'CSS', 'scss': 'SCSS', 'sass': 'SASS',
        'vue': 'Vue', 'svelte': 'Svelte', 'astro': 'Astro',
        'hbs': 'Handlebars', 'ejs': 'EJS', 'pug': 'Pug', 'wasm': 'WebAssembly',
        // Database
        'sql': 'SQL',
        // Shell/Scripts
        'sh': 'Shell', 'bash': 'Bash',
        // Config/Infra
        'yml': 'YAML', 'yaml': 'YAML', 'json': 'JSON', 'toml': 'TOML',
        'xml': 'XML', 'ini': 'INI', 'conf': 'Config', 'env': 'Env',
        'tf': 'Terraform', 'tfvars': 'Terraform', 'dockerfile': 'Docker',
        'makefile': 'Make',
        // Build/Package
        'gradle': 'Gradle', 'groovy': 'Groovy', 'properties': 'Properties',
        'lock': 'Lockfile',
        // Protocol
        'proto': 'Protobuf',
        // Docs
        'md': 'Markdown'
    };

    return langMap[ext || ''] || 'Other';
}

/**
 * Decode JWT payload to check expiration
 */
function decodeToken(token: string): { exp?: number; username?: string } | null {
    try {
        const payload = token.split('.')[1];
        const decoded = Buffer.from(payload, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

/**
 * Check if token needs refresh (expires within 7 days)
 */
function tokenNeedsRefresh(token: string): boolean {
    const payload = decodeToken(token);
    if (!payload?.exp) return false;

    const expiresAt = payload.exp * 1000;
    const sevenDaysFromNow = Date.now() + (7 * 24 * 60 * 60 * 1000);

    return expiresAt < sevenDaysFromNow;
}

/**
 * Refresh token if needed
 */
async function refreshTokenIfNeeded(config: Config): Promise<string | null> {
    if (!config.token) return null;

    if (!tokenNeedsRefresh(config.token)) {
        return config.token;
    }

    try {
        const client = new StatsCodeClient();
        const result = await client.refreshToken(config.token);

        if (result?.token) {
            // Save new token
            saveConfig({ ...config, token: result.token });
            return result.token;
        }
    } catch {
        // Silent failure - continue with existing token
    }

    return config.token;
}

/**
 * Calculate stats from local database using activity-based hours
 * (Same logic as stats.mjs to prevent inflated hours)
 */
async function calculateStats(): Promise<SyncPayload | null> {
    if (!existsSync(DB_PATH)) {
        return null;
    }

    try {
        const SQL = await initSqlJs();
        const buffer = readFileSync(DB_PATH);
        const db = new SQL.Database(buffer);

        // Get total sessions
        const sessionsResult = db.exec('SELECT COUNT(*) as count FROM sessions');
        const totalSessions = sessionsResult[0]?.values[0]?.[0] as number || 0;

        // Get total interactions
        const interactionsResult = db.exec('SELECT COUNT(*) as count FROM interactions');
        const totalInteractions = interactionsResult[0]?.values[0]?.[0] as number || 0;

        // Calculate activity-based hours (5-minute threshold between interactions)
        const activityThresholdMs = 5 * 60 * 1000; // 5 minutes
        const interactionTimestamps = db.exec(`
            SELECT timestamp
            FROM interactions
            ORDER BY timestamp ASC
        `);

        let totalActiveMs = 0;
        if (interactionTimestamps[0]?.values?.length > 0) {
            const timestamps = interactionTimestamps[0].values.map(row => Number(row[0]));

            for (let i = 1; i < timestamps.length; i++) {
                const gap = timestamps[i] - timestamps[i - 1];
                // Only count gaps up to the threshold (5 min)
                const activeTime = Math.min(gap, activityThresholdMs);
                totalActiveMs += activeTime;
            }

            // Add threshold time for the last interaction (assume active for 5 more min)
            totalActiveMs += activityThresholdMs;
        }

        const totalHours = totalActiveMs / 3600000;

        // Get stats by tool (assistant)
        const byToolResult = db.exec(`
            SELECT
                s.assistant as tool,
                COUNT(DISTINCT s.id) as sessions
            FROM sessions s
            GROUP BY s.assistant
        `);

        const byTool: Record<string, { hours: number; sessions: number }> = {};

        if (byToolResult[0]?.values?.length > 0) {
            for (const [tool, sessions] of byToolResult[0].values) {
                // Get interactions for this tool to calculate hours
                const toolInteractions = db.exec(`
                    SELECT i.timestamp
                    FROM interactions i
                    JOIN sessions s ON i.session_id = s.id
                    WHERE s.assistant = ?
                    ORDER BY i.timestamp ASC
                `, [tool]);

                let toolActiveMs = 0;
                if (toolInteractions[0]?.values?.length > 0) {
                    const timestamps = toolInteractions[0].values.map(row => Number(row[0]));

                    for (let i = 1; i < timestamps.length; i++) {
                        const gap = timestamps[i] - timestamps[i - 1];
                        const activeTime = Math.min(gap, activityThresholdMs);
                        toolActiveMs += activeTime;
                    }

                    toolActiveMs += activityThresholdMs;
                }

                byTool[tool as string] = {
                    hours: toolActiveMs / 3600000,
                    sessions: Number(sessions)
                };
            }
        }

        // Get language stats and LOC from metadata
        const metadataResult = db.exec(`
            SELECT metadata
            FROM interactions
            WHERE tool_name IN ('Edit', 'Write')
            AND metadata IS NOT NULL
        `);

        const languageCounts: Record<string, number> = {};
        let totalLinesAdded = 0;
        let totalLinesRemoved = 0;

        if (metadataResult[0]?.values?.length > 0) {
            for (const [metadataStr] of metadataResult[0].values) {
                try {
                    const metadata = JSON.parse(metadataStr as string);

                    // Count lines added/removed (new format)
                    if (metadata.linesAdded) {
                        totalLinesAdded += metadata.linesAdded;
                    }
                    if (metadata.linesRemoved) {
                        totalLinesRemoved += metadata.linesRemoved;
                    }
                    // Fallback to old format
                    if (!metadata.linesAdded && metadata.linesGenerated) {
                        totalLinesAdded += metadata.linesGenerated;
                    }

                    // Count language usage
                    if (metadata.filePath) {
                        const lang = getLanguageFromPath(metadata.filePath);
                        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
                    }
                } catch {
                    // Skip invalid JSON
                }
            }
        }

        // Calculate simple score (0-5 scale based on hours and engagement)
        const score = Math.min(
            ((totalHours / 100) * 2) + // Up to 2 points for hours
            ((totalSessions / 50) * 2) + // Up to 2 points for consistency
            (Object.keys(byTool).length * 0.2), // Up to 1 point for multi-tool usage
            5
        );

        // Get installed plugins
        const plugins = getInstalledPlugins();

        // Get recent sessions for signing (last 100)
        const recentSessions = db.exec(`
            SELECT id, assistant, start_time, end_time, project_path
            FROM sessions
            ORDER BY start_time DESC
            LIMIT 100
        `);

        // Create signed events for verification
        const signedEvents: SignedEvent[] = [];
        const deviceId = getDeviceId();

        if (recentSessions[0]?.values) {
            for (const row of recentSessions[0].values) {
                const [id, assistant, startTime, endTime] = row;
                const sessionData = {
                    id: id as string,
                    assistant: assistant as string,
                    start_time: startTime as number,
                    end_time: endTime as number | null,
                    duration_ms: endTime ? (endTime as number) - (startTime as number) : null
                };

                const signedEvent = createSignedEvent('session', sessionData, startTime as number);

                // Skip events with anomalies
                const anomalies = detectAnomalies(signedEvent);
                if (anomalies.length === 0) {
                    signedEvents.push(signedEvent);
                }
            }
        }

        // Close database after all queries are done
        db.close();

        // Create payload signature (hash of all data)
        const payloadData = {
            totalHours: Number(totalHours.toFixed(2)),
            totalSessions,
            totalInteractions,
            deviceId,
            timestamp: Date.now()
        };
        const payloadSignature = createHmac('sha256', deviceId)
            .update(JSON.stringify(payloadData))
            .digest('hex');

        return {
            totalHours: Number(totalHours.toFixed(2)),
            totalSessions,
            totalInteractions,
            totalLinesGenerated: totalLinesAdded > 0 ? totalLinesAdded : undefined,
            totalLinesAdded: totalLinesAdded > 0 ? totalLinesAdded : undefined,
            totalLinesRemoved: totalLinesRemoved > 0 ? totalLinesRemoved : undefined,
            byTool,
            byLanguage: Object.keys(languageCounts).length > 0 ? languageCounts : undefined,
            plugins: plugins.length > 0 ? plugins : undefined,
            badges: [], // Badges will be calculated server-side
            score: Number(score.toFixed(1)),
            // Security: include device ID and signed events
            deviceId,
            signedEvents: signedEvents.length > 0 ? signedEvents : undefined,
            signature: payloadSignature
        };
    } catch {
        return null;
    }
}

/**
 * Auto-sync stats to cloud
 * Silently fails if not authenticated or if sync is disabled
 */
export async function autoSync(): Promise<void> {
    try {
        // Read config
        const config = readConfig();

        // Check if auto-sync is enabled (default: true)
        if (config.autoSync === false) {
            return;
        }

        // Check if user is authenticated
        if (!config.token) {
            // Silent return - user hasn't logged in yet
            return;
        }

        // Refresh token if needed (expires within 7 days)
        const token = await refreshTokenIfNeeded(config);
        if (!token) {
            return;
        }

        // Calculate stats
        const stats = await calculateStats();
        if (!stats) {
            return;
        }

        // Create API client
        const client = new StatsCodeClient();
        client.setToken(token);

        // Sync to cloud
        await client.syncStats(stats);

    } catch {
        // Silent failure - auto-sync should never break the workflow
    }
}
