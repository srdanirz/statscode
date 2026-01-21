/**
 * Auto-Sync Helper
 * Automatically syncs local stats to StatsCode cloud after each session
 */

import { StatsCodeClient, SyncPayload } from '@statscode/api-client';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import initSqlJs from 'sql.js';

const CONFIG_PATH = join(homedir(), '.statscode', 'config.json');
const DB_PATH = join(homedir(), '.statscode', 'stats.sqlite');

interface Config {
    token?: string;
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

        // Calculate simple score (0-5 scale based on hours and engagement)
        const score = Math.min(
            ((totalHours / 100) * 2) + // Up to 2 points for hours
            ((totalSessions / 50) * 2) + // Up to 2 points for consistency
            (Object.keys(byTool).length * 0.2), // Up to 1 point for multi-tool usage
            5
        );

        db.close();

        return {
            totalHours: Number(totalHours.toFixed(2)),
            totalSessions,
            totalInteractions,
            byTool,
            badges: [], // Badges will be calculated server-side
            score: Number(score.toFixed(1))
        };
    } catch (error) {
        console.error('[auto-sync] Failed to calculate stats:', error);
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

        // Calculate stats
        const stats = await calculateStats();
        if (!stats) {
            return;
        }

        // Create API client
        const client = new StatsCodeClient();
        client.setToken(config.token);

        // Sync to cloud
        await client.syncStats(stats);

        // Silent success - no console output to avoid noise
    } catch (error) {
        // Silent failure - auto-sync should never break the workflow
        // Only log if debug mode is enabled
        if (process.env.STATSCODE_DEBUG === 'true') {
            console.error('[auto-sync] Failed:', error);
        }
    }
}
