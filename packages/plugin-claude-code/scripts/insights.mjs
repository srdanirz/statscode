#!/usr/bin/env node
/**
 * StatsCode Insights CLI - Display aggregated session insights and patterns
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const insightsDir = join(homedir(), '.statscode', 'insights');

/**
 * Load all debriefs from insights directory
 */
function loadDebriefs() {
    if (!existsSync(insightsDir)) {
        return [];
    }

    const files = readdirSync(insightsDir)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse(); // Most recent first

    const debriefs = [];
    for (const file of files) {
        try {
            const data = JSON.parse(readFileSync(join(insightsDir, file), 'utf-8'));
            debriefs.push(data);
        } catch {
            // Skip invalid files
        }
    }

    return debriefs;
}

/**
 * Aggregate patterns from multiple debriefs
 */
function aggregatePatterns(debriefs) {
    const patterns = {
        // Counters
        totalSessions: debriefs.length,
        totalInteractions: 0,
        totalPrompts: 0,
        totalToolUses: 0,
        totalEdits: 0,
        totalErrors: 0,

        // Aggregated strengths/improvements
        strengthsCount: {},
        improvementsCount: {},

        // Tool usage across sessions
        toolUsage: {},

        // Common errors
        errorsCount: {}
    };

    for (const debrief of debriefs) {
        // Sum metrics
        patterns.totalInteractions += debrief.metrics?.totalInteractions || 0;
        patterns.totalPrompts += debrief.metrics?.userPrompts || 0;
        patterns.totalToolUses += debrief.metrics?.toolUses || 0;
        patterns.totalEdits += debrief.metrics?.edits || 0;
        patterns.totalErrors += debrief.metrics?.errors || 0;

        // Count strengths
        for (const strength of (debrief.patterns?.strengths || [])) {
            patterns.strengthsCount[strength] = (patterns.strengthsCount[strength] || 0) + 1;
        }

        // Count improvements
        for (const improvement of (debrief.patterns?.improvements || [])) {
            // Normalize improvement messages (remove numbers)
            const normalized = improvement.replace(/\d+/g, 'N');
            patterns.improvementsCount[normalized] = (patterns.improvementsCount[normalized] || 0) + 1;
        }

        // Aggregate tool usage
        for (const [tool, count] of Object.entries(debrief.patterns?.toolUsage || {})) {
            patterns.toolUsage[tool] = (patterns.toolUsage[tool] || 0) + count;
        }

        // Count errors
        for (const error of (debrief.patterns?.commonErrors || [])) {
            const shortError = error.slice(0, 50);
            patterns.errorsCount[shortError] = (patterns.errorsCount[shortError] || 0) + 1;
        }
    }

    return patterns;
}

/**
 * Calculate growth trends between recent sessions
 */
function calculateTrends(debriefs) {
    if (debriefs.length < 2) return null;

    const recent = debriefs.slice(0, 5); // Last 5 sessions
    const older = debriefs.slice(5, 10); // Previous 5 sessions

    if (older.length === 0) return null;

    const recentAvg = {
        prompts: recent.reduce((sum, d) => sum + (d.metrics?.userPrompts || 0), 0) / recent.length,
        errors: recent.reduce((sum, d) => sum + (d.metrics?.errors || 0), 0) / recent.length,
        edits: recent.reduce((sum, d) => sum + (d.metrics?.edits || 0), 0) / recent.length
    };

    const olderAvg = {
        prompts: older.reduce((sum, d) => sum + (d.metrics?.userPrompts || 0), 0) / older.length,
        errors: older.reduce((sum, d) => sum + (d.metrics?.errors || 0), 0) / older.length,
        edits: older.reduce((sum, d) => sum + (d.metrics?.edits || 0), 0) / older.length
    };

    return {
        promptsChange: olderAvg.prompts > 0 ? ((recentAvg.prompts - olderAvg.prompts) / olderAvg.prompts * 100) : 0,
        errorsChange: olderAvg.errors > 0 ? ((recentAvg.errors - olderAvg.errors) / olderAvg.errors * 100) : 0,
        editsChange: olderAvg.edits > 0 ? ((recentAvg.edits - olderAvg.edits) / olderAvg.edits * 100) : 0
    };
}

/**
 * Display insights
 */
function displayInsights() {
    const debriefs = loadDebriefs();

    console.log('');
    console.log('🧠 StatsCode Session Insights');
    console.log('═══════════════════════════════════════');

    if (debriefs.length === 0) {
        console.log('');
        console.log('No session insights yet!');
        console.log('');
        console.log('Insights are captured when your context compacts.');
        console.log('Keep coding - insights will appear after a few sessions.');
        console.log('');
        console.log('Tip: Run /compact to manually trigger insight capture.');
        console.log('');
        return;
    }

    const patterns = aggregatePatterns(debriefs);

    // Overview
    console.log('');
    console.log(`📊 Sessions Analyzed: ${patterns.totalSessions}`);
    console.log(`💬 Total Prompts: ${patterns.totalPrompts}`);
    console.log(`🔧 Tool Uses: ${patterns.totalToolUses}`);
    console.log(`✏️  Edits Made: ${patterns.totalEdits}`);
    console.log(`⚠️  Errors: ${patterns.totalErrors}`);

    // Error rate
    const errorRate = patterns.totalToolUses > 0
        ? (patterns.totalErrors / patterns.totalToolUses * 100).toFixed(1)
        : 0;
    console.log(`📉 Error Rate: ${errorRate}%`);
    console.log('');

    // Consistent Strengths
    const topStrengths = Object.entries(patterns.strengthsCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    if (topStrengths.length > 0) {
        console.log('💪 Your Strengths:');
        for (const [strength, count] of topStrengths) {
            const frequency = Math.round(count / patterns.totalSessions * 100);
            console.log(`   ✓ ${strength} (${frequency}% of sessions)`);
        }
        console.log('');
    }

    // Areas to Improve
    const topImprovements = Object.entries(patterns.improvementsCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    if (topImprovements.length > 0) {
        console.log('📈 Areas to Improve:');
        for (const [improvement, count] of topImprovements) {
            const frequency = Math.round(count / patterns.totalSessions * 100);
            // Clean up the normalized message
            const cleanMsg = improvement.replace(/N /g, 'multiple ').replace(/N$/g, 'some');
            console.log(`   → ${cleanMsg} (${frequency}% of sessions)`);
        }
        console.log('');
    }

    // Top Tools
    const topTools = Object.entries(patterns.toolUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (topTools.length > 0) {
        console.log('🔧 Most Used Tools:');
        for (const [tool, count] of topTools) {
            console.log(`   • ${tool}: ${count}`);
        }
        console.log('');
    }

    // Trends
    const trends = calculateTrends(debriefs);
    if (trends) {
        console.log('📊 Trends (Recent vs Previous):');

        const formatTrend = (value, name, inverse = false) => {
            const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '→';
            const color = inverse
                ? (value > 0 ? '⚠️' : value < 0 ? '✅' : '➖')
                : (value > 0 ? '✅' : value < 0 ? '⚠️' : '➖');
            return `   ${color} ${name}: ${arrow} ${Math.abs(value).toFixed(0)}%`;
        };

        console.log(formatTrend(trends.editsChange, 'Edits'));
        console.log(formatTrend(trends.promptsChange, 'Prompts'));
        console.log(formatTrend(trends.errorsChange, 'Errors', true)); // Lower is better
        console.log('');
    }

    // Tips based on patterns
    console.log('💡 Tips:');

    if (errorRate > 20) {
        console.log('   • High error rate - try providing more context in prompts');
    }

    const vagueImprovements = Object.keys(patterns.improvementsCount)
        .filter(i => i.includes('vague'));
    if (vagueImprovements.length > 0) {
        console.log('   • Be more specific in prompts - avoid single words like "fix" or "help"');
    }

    const shortPromptImprovements = Object.keys(patterns.improvementsCount)
        .filter(i => i.includes('short prompts'));
    if (shortPromptImprovements.length > 0) {
        console.log('   • Try combining multiple small requests into one detailed prompt');
    }

    if (topStrengths.length === 0 && topImprovements.length === 0) {
        console.log('   • Keep coding! More insights will appear as you use Claude Code');
    }

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🔗 statscode.dev');
}

displayInsights();
