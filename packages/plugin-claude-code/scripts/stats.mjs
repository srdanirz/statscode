#!/usr/bin/env node
/**
 * StatsCode CLI - Display stats from local database
 */

import initSqlJs from 'sql.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

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

    // Get total hours (Unix timestamps are in milliseconds)
    const hoursResult = db.exec(`
        SELECT COALESCE(SUM(
            CAST((COALESCE(end_time, (strftime('%s', 'now') * 1000)) - start_time) AS REAL) / 3600000
        ), 0) as hours FROM sessions
        WHERE start_time IS NOT NULL
    `);
    const totalHours = hoursResult[0]?.values[0]?.[0] || 0;

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

    // Get tool usage
    const toolsResult = db.exec(`
        SELECT tool_name, COUNT(*) as count 
        FROM interactions 
        WHERE tool_name IS NOT NULL AND tool_name != ''
        GROUP BY tool_name 
        ORDER BY count DESC 
        LIMIT 5
    `);

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
    console.log(`⏱️  Total Hours:        ${Number(totalHours).toFixed(1)}h`);
    console.log(`📝 Total Sessions:     ${totalSessions}`);
    console.log(`🔧 Total Interactions: ${totalInteractions}`);
    console.log('');

    if (byTypeResult[0]?.values?.length > 0) {
        console.log('📈 By Interaction Type:');
        for (const [type, count] of byTypeResult[0].values) {
            console.log(`   • ${type}: ${count}`);
        }
        console.log('');
    }

    if (toolsResult[0]?.values?.length > 0) {
        console.log('🛠️  Top Tools Used:');
        for (const [tool, count] of toolsResult[0].values) {
            console.log(`   • ${tool}: ${count}`);
        }
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
