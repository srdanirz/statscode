/**
 * StatsCode Security Module
 * Handles cryptographic signing of events to prevent manipulation
 */

import { createHmac, randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.statscode');
const KEY_FILE = join(CONFIG_DIR, 'device.key');

/**
 * Device key - unique per installation, used to sign events
 * This key is generated once and stored locally
 */
let deviceKey: string | null = null;

/**
 * Get or create the device signing key
 * The key is a random 256-bit secret unique to this installation
 */
export function getDeviceKey(): string {
    if (deviceKey) return deviceKey;

    // Ensure config directory exists
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Load existing key or generate new one
    if (existsSync(KEY_FILE)) {
        deviceKey = readFileSync(KEY_FILE, 'utf-8').trim();
    } else {
        // Generate a new random key (32 bytes = 256 bits)
        deviceKey = randomBytes(32).toString('hex');
        writeFileSync(KEY_FILE, deviceKey, { mode: 0o600 }); // Only owner can read
    }

    return deviceKey;
}

/**
 * Get the device ID (public identifier derived from key)
 * This is shared with the server to identify the device
 */
export function getDeviceId(): string {
    const key = getDeviceKey();
    // Device ID is first 16 chars of HMAC of the key
    return createHmac('sha256', key).update('device-id').digest('hex').slice(0, 16);
}

/**
 * Sign an event payload
 * Returns a signature that proves the event came from this device
 */
export function signEvent(payload: EventPayload): string {
    const key = getDeviceKey();
    const data = canonicalize(payload as unknown as Record<string, unknown>);
    return createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Create a signed event ready for sync
 */
export function createSignedEvent(
    type: 'session' | 'interaction',
    data: Record<string, unknown>,
    timestamp: number
): SignedEvent {
    const payload: EventPayload = {
        type,
        data,
        timestamp,
        deviceId: getDeviceId(),
        nonce: randomBytes(8).toString('hex') // Prevent replay attacks
    };

    return {
        ...payload,
        signature: signEvent(payload)
    };
}

/**
 * Verify an event signature (for testing/debugging)
 */
export function verifyEvent(event: SignedEvent): boolean {
    const { signature, ...payload } = event;
    const expectedSig = signEvent(payload as EventPayload);
    return signature === expectedSig;
}

/**
 * Canonicalize an object to ensure consistent signing
 * Sort keys alphabetically and stringify deterministically
 */
function canonicalize(obj: Record<string, unknown>): string {
    return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Event payload before signing
 */
export interface EventPayload {
    type: 'session' | 'interaction';
    data: Record<string, unknown>;
    timestamp: number;
    deviceId: string;
    nonce: string;
}

/**
 * Signed event ready for transmission
 */
export interface SignedEvent extends EventPayload {
    signature: string;
}

/**
 * Anomaly detection thresholds
 * Events outside these ranges will be flagged
 */
export const ANOMALY_THRESHOLDS = {
    // Max hours per day
    maxHoursPerDay: 16,
    // Max sessions per hour
    maxSessionsPerHour: 10,
    // Max interactions per minute
    maxInteractionsPerMinute: 60,
    // Min session duration (ms) - sessions under this are suspicious
    minSessionDuration: 5000, // 5 seconds
    // Max session duration (ms) - sessions over this are suspicious
    maxSessionDuration: 12 * 60 * 60 * 1000, // 12 hours
    // Max time drift (ms) - events from the future are rejected
    maxTimeDrift: 5 * 60 * 1000, // 5 minutes
};

/**
 * Check if an event has anomalies (client-side pre-check)
 * Returns array of anomaly descriptions, empty if valid
 */
export function detectAnomalies(event: SignedEvent): string[] {
    const anomalies: string[] = [];
    const now = Date.now();

    // Check for future timestamps
    if (event.timestamp > now + ANOMALY_THRESHOLDS.maxTimeDrift) {
        anomalies.push('timestamp_future');
    }

    // Check for very old timestamps (> 30 days)
    if (event.timestamp < now - 30 * 24 * 60 * 60 * 1000) {
        anomalies.push('timestamp_too_old');
    }

    // Session-specific checks
    if (event.type === 'session' && event.data.duration_ms) {
        const duration = event.data.duration_ms as number;

        if (duration < ANOMALY_THRESHOLDS.minSessionDuration) {
            anomalies.push('session_too_short');
        }

        if (duration > ANOMALY_THRESHOLDS.maxSessionDuration) {
            anomalies.push('session_too_long');
        }
    }

    return anomalies;
}
