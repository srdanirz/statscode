#!/usr/bin/env node
/**
 * StatsCode Force Sync - Manually trigger sync to cloud
 */

import { autoSync } from '../hooks/auto-sync.js';

console.log('🔄 Force syncing stats to StatsCode cloud...\n');

try {
    await autoSync();
    console.log('✅ Stats synced successfully!\n');
    console.log('View your stats at: https://statscode.dev');
} catch (error) {
    console.error('❌ Sync failed:', error.message);
    console.error('\nMake sure you are logged in. Run: /statscode:login');
    process.exit(1);
}
