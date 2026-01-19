
import { onPrompt, onBeforeToolUse, onAfterToolUse, onSessionEnd, getStats } from './packages/plugin-antigravity/src/index.js';

async function runTest() {
    console.log('🚀 Starting Antigravity Plugin Integration Test...\n');

    // 1. Simulate Session Start (implicit in first event)
    console.log('1. User sends a prompt...');
    await onPrompt();

    // 2. Simulate Tool Use
    console.log('2. Agent uses tool "read_file"...');
    await onBeforeToolUse('read_file');
    await onAfterToolUse('read_file', true);

    // 3. Simulate Edit/Refinement (Anti-pattern: rapid switching or just normal usage)
    console.log('3. User sends another prompt...');
    await onPrompt();

    // 4. Simulate Session End (should trigger AI Coach)
    console.log('4. Ending session (expecting AI Coach tips)...');
    await onSessionEnd();

    console.log('\n✅ Test Completed.');
}

runTest().catch(console.error);
