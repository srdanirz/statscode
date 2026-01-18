/**
 * Test StatsCode plugin - simulates Antigravity usage
 */

import {
    onBeforeToolUse,
    onAfterToolUse,
    onPrompt,
    onSessionEnd,
    getStats
} from '../src/index.js';

async function testPlugin() {
    console.log('🧪 Testing StatsCode Antigravity Plugin...\n');

    // Simulate a coding session
    console.log('📝 Simulating prompts...');
    await onPrompt();
    await onPrompt();
    await onPrompt();

    console.log('🔧 Simulating tool usage...');
    await onBeforeToolUse('view_file');
    await onAfterToolUse('view_file', true);

    await onBeforeToolUse('run_command');
    await onAfterToolUse('run_command', true);

    await onBeforeToolUse('write_to_file');
    await onAfterToolUse('write_to_file', true);

    console.log('📊 Getting stats...\n');
    const stats = await getStats();

    console.log('=== StatsCode Stats ===');
    console.log(`Total Hours: ${stats.totalHours.toFixed(2)}h`);
    console.log(`Total Sessions: ${stats.totalSessions}`);
    console.log(`Total Interactions: ${stats.totalInteractions}`);
    console.log(`Score: ${stats.score.toFixed(1)}/5.0`);

    console.log('\nBy Assistant:');
    if (stats.byAssistant) {
        for (const [assistant, data] of Object.entries(stats.byAssistant)) {
            if (data && (data as any).hours > 0) {
                console.log(`  - ${assistant}: ${(data as any).hours.toFixed(2)}h, ${(data as any).sessions} sessions`);
            }
        }
    } else {
        console.log('  (No assistant data yet)');
    }

    console.log('\nBadges Earned:');
    if (!stats.badges || stats.badges.length === 0) {
        console.log('  (No badges yet - keep coding!)');
    } else {
        for (const badge of stats.badges) {
            console.log(`  - ${badge.name}`);
        }
    }

    // End session
    console.log('\n🏁 Ending session...');
    await onSessionEnd();

    console.log('✅ Test complete!\n');
    console.log('Your stats are saved at: ~/.statscode/stats.sqlite');
    console.log('Run more sessions to earn badges like "Antigravity Pilot"!');
}

testPlugin().catch(console.error);
