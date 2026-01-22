#!/usr/bin/env node
/**
 * StatsCode CLI - Display stats from local database
 */

import initSqlJs from 'sql.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Get installed Claude Code plugins
 */
function getInstalledPlugins() {
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
 * Get configured MCP servers
 */
function getMCPServers() {
    try {
        const settingsPath = join(homedir(), '.claude', 'settings.json');
        if (!existsSync(settingsPath)) return [];

        const data = JSON.parse(readFileSync(settingsPath, 'utf-8'));
        return Object.keys(data.mcp?.servers || {});
    } catch {
        return [];
    }
}

/**
 * Get programming language from file path
 */
function getLanguageFromPath(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap = {
        'ts': 'TypeScript',
        'tsx': 'TypeScript',
        'js': 'JavaScript',
        'jsx': 'JavaScript',
        'mjs': 'JavaScript',
        'cjs': 'JavaScript',
        'py': 'Python',
        'rs': 'Rust',
        'go': 'Go',
        'java': 'Java',
        'kt': 'Kotlin',
        'swift': 'Swift',
        'c': 'C',
        'cpp': 'C++',
        'cc': 'C++',
        'cxx': 'C++',
        'cs': 'C#',
        'rb': 'Ruby',
        'php': 'PHP',
        'html': 'HTML',
        'css': 'CSS',
        'scss': 'SCSS',
        'sass': 'SASS',
        'vue': 'Vue',
        'svelte': 'Svelte',
        'sql': 'SQL',
        'sh': 'Shell',
        'bash': 'Bash',
        'yml': 'YAML',
        'yaml': 'YAML',
        'json': 'JSON',
        'md': 'Markdown',
        'toml': 'TOML',
        'xml': 'XML'
    };
    return langMap[ext] || 'Other';
}

const dbPath = join(homedir(), '.statscode', 'stats.sqlite');

async function getStats() {
    if (!existsSync(dbPath)) {
        console.log('📊 StatsCode Stats');
        console.log('═══════════════════════════════════════');
        console.log('No stats yet! Start coding with Claude Code.');
        console.log('Your sessions will be tracked automatically.');
        return;
    }

    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    // Get total sessions
    const sessionsResult = db.exec('SELECT COUNT(*) as count FROM sessions');
    const totalSessions = sessionsResult[0]?.values[0]?.[0] || 0;

    // Calculate active hours based on interactions, not session duration
    // If more than 5 minutes pass between interactions, it's considered idle time
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
            const gap = timestamps[i] - timestamps[i-1];
            // Only count gaps up to the threshold (5 min)
            const activeTime = Math.min(gap, activityThresholdMs);
            totalActiveMs += activeTime;
        }

        // Add threshold time for the last interaction (assume active for 5 more min)
        totalActiveMs += activityThresholdMs;
    }

    const totalHours = totalActiveMs / 3600000;

    // Get current session activity time
    const currentSessionResult = db.exec(`
        SELECT MIN(timestamp) as first_interaction, MAX(timestamp) as last_interaction
        FROM interactions
        WHERE session_id = (
            SELECT id FROM sessions
            WHERE end_time IS NULL
            ORDER BY start_time DESC LIMIT 1
        )
    `);

    let currentSessionActivityMs = 0;
    let minutesSinceLastActivity = 0;

    if (currentSessionResult[0]?.values?.[0]) {
        const [firstInteraction, lastInteraction] = currentSessionResult[0].values[0];
        if (firstInteraction && lastInteraction) {
            const first = Number(firstInteraction);
            const last = Number(lastInteraction);

            // Get all interactions in current session
            const sessionInteractions = db.exec(`
                SELECT timestamp
                FROM interactions
                WHERE session_id = (
                    SELECT id FROM sessions
                    WHERE end_time IS NULL
                    ORDER BY start_time DESC LIMIT 1
                )
                ORDER BY timestamp ASC
            `);

            if (sessionInteractions[0]?.values?.length > 0) {
                const timestamps = sessionInteractions[0].values.map(row => Number(row[0]));

                for (let i = 1; i < timestamps.length; i++) {
                    const gap = timestamps[i] - timestamps[i-1];
                    currentSessionActivityMs += Math.min(gap, activityThresholdMs);
                }

                // Add threshold time for last interaction
                currentSessionActivityMs += activityThresholdMs;
            }

            minutesSinceLastActivity = (Date.now() - last) / 60000;
        }
    }

    // Get total interactions
    const interactionsResult = db.exec('SELECT COUNT(*) as count FROM interactions');
    const totalInteractions = interactionsResult[0]?.values[0]?.[0] || 0;

    // Get interactions by type
    const byTypeResult = db.exec(`
        SELECT type, COUNT(*) as count 
        FROM interactions 
        GROUP BY type 
        ORDER BY count DESC
    `);

    // Get prompt count (more relevant than total interactions)
    const promptsResult = db.exec(`
        SELECT COUNT(*) as count
        FROM interactions
        WHERE type = 'prompt'
    `);
    const totalPrompts = promptsResult[0]?.values[0]?.[0] || 0;

    // Get language stats and LOC from metadata
    const metadataResult = db.exec(`
        SELECT metadata
        FROM interactions
        WHERE tool_name IN ('Edit', 'Write')
        AND metadata IS NOT NULL
    `);

    const languageCounts = {};
    let totalLOC = 0;

    if (metadataResult[0]?.values?.length > 0) {
        for (const [metadataStr] of metadataResult[0].values) {
            try {
                const metadata = JSON.parse(metadataStr);

                // Count lines generated
                if (metadata.linesGenerated) {
                    totalLOC += metadata.linesGenerated;
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

    // Sort languages by usage
    const topLanguages = Object.entries(languageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Get recent sessions
    const recentResult = db.exec(`
        SELECT assistant, start_time, end_time
        FROM sessions
        WHERE start_time IS NOT NULL
        ORDER BY start_time DESC
        LIMIT 3
    `);

    console.log('');
    console.log('📊 StatsCode Stats');
    console.log('═══════════════════════════════════════');
    console.log(`⏱️  Active Hours:       ${Number(totalHours).toFixed(1)}h`);
    console.log(`📝 Sessions:           ${totalSessions}`);
    console.log(`💬 Prompts:            ${totalPrompts}`);
    if (totalLOC > 0) {
        console.log(`✍️  Lines Generated:   ${totalLOC.toLocaleString()}`);
    }

    if (currentSessionActivityMs > 0) {
        const sessionMinutes = currentSessionActivityMs / 60000;
        const hours = Math.floor(sessionMinutes / 60);
        const mins = Math.round(sessionMinutes % 60);

        if (minutesSinceLastActivity < 5) {
            const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            console.log(`🟢 Current Session:    ${timeStr} (active)`);
        } else if (minutesSinceLastActivity < 60) {
            const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            console.log(`🟡 Current Session:    ${timeStr} (${Math.round(minutesSinceLastActivity)}m idle)`);
        }
    }
    console.log('');

    // Show top programming languages
    if (topLanguages.length > 0) {
        console.log('💻 Top Languages:');
        topLanguages.forEach(([lang, count]) => {
            console.log(`   • ${lang}: ${count} files`);
        });
        console.log('');
    }

    // Show installed plugins
    const plugins = getInstalledPlugins();
    if (plugins.length > 0) {
        console.log('🔌 Active Plugins:');
        plugins.forEach(plugin => {
            // Clean up plugin names for display
            const displayName = plugin.split('@')[0].split('/').pop();
            console.log(`   • ${displayName}`);
        });
        console.log('');
    }

    // Show MCP servers
    const mcpServers = getMCPServers();
    if (mcpServers.length > 0) {
        console.log('🌐 MCP Servers:');
        mcpServers.forEach(server => {
            console.log(`   • ${server}`);
        });
        console.log('');
    }

    if (recentResult[0]?.values?.length > 0) {
        console.log('🕐 Recent Sessions:');
        for (const [assistant, startTime, endTime] of recentResult[0].values) {
            // Parse Unix timestamp (milliseconds)
            let date = 'Unknown';
            let duration = 'active';

            if (startTime) {
                try {
                    date = new Date(Number(startTime)).toLocaleString();
                    if (endTime) {
                        const minutes = Math.round((Number(endTime) - Number(startTime)) / 60000);
                        duration = `${minutes}min`;
                    }
                } catch {
                    date = 'Unknown';
                }
            }

            console.log(`   • ${assistant} - ${date} (${duration})`);
        }
        console.log('');
    }

    console.log('═══════════════════════════════════════');
    console.log('🔗 statscode.dev');

    db.close();
}

getStats().catch(console.error);
