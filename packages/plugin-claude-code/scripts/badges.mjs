#!/usr/bin/env node
/**
 * StatsCode Badges CLI - Display earned badges
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import initSqlJs from 'sql.js';

const DB_PATH = join(homedir(), '.statscode', 'stats.sqlite');

// Badge definitions (simplified for CLI)
const BADGES = {
    'claude-whisperer': { name: 'Claude Whisperer', icon: '🤖', desc: 'Master of Claude Code', tiers: { bronze: 10, silver: 50, gold: 200, platinum: 500, diamond: 1000 } },
    'time-lord': { name: 'Time Lord', icon: '⏱️', desc: 'Master of AI coding time', tiers: { bronze: 10, silver: 50, gold: 200, platinum: 500, diamond: 1000 } },
    'night-owl': { name: 'Night Owl', icon: '🌙', desc: 'Codes when the world sleeps', tiers: { bronze: 10, silver: 50, gold: 100 } },
    'speed-runner': { name: 'Speed Runner', icon: '⚡', desc: 'Fast task completion', tiers: null },
    'test-driven': { name: 'Test Driven', icon: '🧪', desc: 'Includes tests in sessions', tiers: null },
    'prompt-engineer': { name: 'Prompt Engineer', icon: '📝', desc: 'Detailed context in prompts', tiers: null },
    'early-adopter': { name: 'Early Adopter', icon: '🌅', desc: 'Among the first StatsCode users', tiers: null },
    'polyglot': { name: 'Polyglot', icon: '🗣️', desc: 'Uses 3+ programming languages', tiers: null },
    'minimalist': { name: 'Minimalist', icon: '🧹', desc: 'Deleted more lines than added', tiers: null },
};

const TIER_COLORS = {
    diamond: '💎',
    platinum: '🏆',
    gold: '🥇',
    silver: '🥈',
    bronze: '🥉'
};

function getTier(value, tiers) {
    if (!tiers) return null;
    if (value >= tiers.diamond) return 'diamond';
    if (value >= tiers.platinum) return 'platinum';
    if (value >= tiers.gold) return 'gold';
    if (value >= tiers.silver) return 'silver';
    if (value >= tiers.bronze) return 'bronze';
    return null;
}

async function main() {
    if (!existsSync(DB_PATH)) {
        console.log('No stats yet. Start using Claude Code to earn badges!');
        return;
    }

    const SQL = await initSqlJs();
    const buffer = readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);

    // Get stats
    const sessionsResult = db.exec('SELECT COUNT(*) FROM sessions WHERE assistant = "claude-code"');
    const sessions = sessionsResult[0]?.values[0]?.[0] || 0;

    const interactionsResult = db.exec('SELECT COUNT(*) FROM interactions');
    const interactions = interactionsResult[0]?.values[0]?.[0] || 0;

    // Calculate hours
    const timestampsResult = db.exec('SELECT timestamp FROM interactions ORDER BY timestamp ASC');
    let totalHours = 0;
    if (timestampsResult[0]?.values?.length > 0) {
        const timestamps = timestampsResult[0].values.map(r => Number(r[0]));
        let activeMs = 0;
        for (let i = 1; i < timestamps.length; i++) {
            const gap = timestamps[i] - timestamps[i - 1];
            activeMs += Math.min(gap, 5 * 60 * 1000);
        }
        activeMs += 5 * 60 * 1000; // Add for last interaction
        totalHours = activeMs / 3600000;
    }

    // Check for night owl (sessions between midnight and 5am)
    const nightSessionsResult = db.exec(`
        SELECT COUNT(*) FROM interactions
        WHERE CAST(strftime('%H', timestamp/1000, 'unixepoch', 'localtime') AS INTEGER) < 5
    `);
    const nightSessions = nightSessionsResult[0]?.values[0]?.[0] || 0;

    // Check languages used
    const languagesResult = db.exec(`
        SELECT DISTINCT json_extract(metadata, '$.filePath') as path
        FROM interactions
        WHERE metadata IS NOT NULL AND json_extract(metadata, '$.filePath') IS NOT NULL
    `);
    const extensions = new Set();
    if (languagesResult[0]?.values) {
        for (const [path] of languagesResult[0].values) {
            if (path) {
                const ext = path.split('.').pop()?.toLowerCase();
                if (ext) extensions.add(ext);
            }
        }
    }

    db.close();

    // Calculate earned badges
    const earned = [];
    const inProgress = [];

    // Claude Whisperer (based on sessions)
    const claudeTier = getTier(sessions, BADGES['claude-whisperer'].tiers);
    if (claudeTier) {
        earned.push({ ...BADGES['claude-whisperer'], tier: claudeTier });
    } else if (sessions > 0) {
        const next = BADGES['claude-whisperer'].tiers.bronze;
        inProgress.push({ ...BADGES['claude-whisperer'], progress: sessions, next });
    }

    // Time Lord (based on hours)
    const timeTier = getTier(totalHours, BADGES['time-lord'].tiers);
    if (timeTier) {
        earned.push({ ...BADGES['time-lord'], tier: timeTier });
    } else if (totalHours > 0) {
        const next = BADGES['time-lord'].tiers.bronze;
        inProgress.push({ ...BADGES['time-lord'], progress: Math.round(totalHours), next });
    }

    // Night Owl
    const nightTier = getTier(nightSessions, BADGES['night-owl'].tiers);
    if (nightTier) {
        earned.push({ ...BADGES['night-owl'], tier: nightTier });
    } else if (nightSessions > 0) {
        inProgress.push({ ...BADGES['night-owl'], progress: nightSessions, next: BADGES['night-owl'].tiers.bronze });
    }

    // Polyglot (3+ languages)
    if (extensions.size >= 3) {
        earned.push({ ...BADGES['polyglot'], tier: null });
    } else if (extensions.size > 0) {
        inProgress.push({ ...BADGES['polyglot'], progress: extensions.size, next: 3 });
    }

    // Early Adopter (always give it for now - first users)
    earned.push({ ...BADGES['early-adopter'], tier: null });

    // Output
    console.log('🏆 Your StatsCode Badges');
    console.log('═══════════════════════════════════════\n');

    if (earned.length > 0) {
        console.log('✅ Earned Badges:\n');
        for (const badge of earned) {
            const tierIcon = badge.tier ? ` ${TIER_COLORS[badge.tier]}` : '';
            console.log(`   ${badge.icon} ${badge.name}${tierIcon}`);
            console.log(`      ${badge.desc}\n`);
        }
    }

    if (inProgress.length > 0) {
        console.log('🔄 In Progress:\n');
        for (const badge of inProgress) {
            const pct = Math.round((badge.progress / badge.next) * 100);
            const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
            console.log(`   ${badge.icon} ${badge.name} [${bar}] ${badge.progress}/${badge.next}`);
        }
        console.log('');
    }

    console.log('═══════════════════════════════════════');
    console.log('🔗 statscode.dev/badges');
}

main().catch(() => console.log('Error loading badges'));
