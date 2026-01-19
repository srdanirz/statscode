
import { onPrompt, onBeforeToolUse, onAfterToolUse, onSessionEnd } from '@statscode/plugin-antigravity';

async function runTest() {
    console.log('🚀 Starting Prod Antigravity Plugin Test...\n');

    // 1. Simulate Session Start
    console.log('1. User sends a prompt...');
    await onPrompt();

    // 2. Simulate Tool Use
    console.log('2. Agent uses tool "read_file"...');
    await onBeforeToolUse('read_file');
    await onAfterToolUse('read_file', true);

    // 3. User prompts again
    console.log('3. User prompts again...');
    await onPrompt();

    // 4. End Session -> Should print AI Coach tips from API
    console.log('4. Ending session...');
    await onSessionEnd();
}

runTest().catch(console.error);
