# StatsCode Security Architecture

## Overview

StatsCode implements cryptographic signing and anomaly detection to prevent manipulation of stats.

## Client-Side Security

### Device Key
- Each installation generates a unique 256-bit random key
- Stored in `~/.statscode/device.key` with permissions 0600
- Used to sign all events before sync

### Device ID
- Public identifier derived from device key
- First 16 chars of HMAC-SHA256(key, "device-id")
- Shared with server to identify the device

### Signed Events
Every session synced to the server includes:
```json
{
  "type": "session",
  "data": { "id": "...", "assistant": "claude-code", ... },
  "timestamp": 1234567890,
  "deviceId": "abc123...",
  "nonce": "random-8-bytes",
  "signature": "hmac-sha256-of-payload"
}
```

### Anomaly Detection (Client)
Before sending, events are checked for:
- Future timestamps (> 5 min ahead)
- Very old timestamps (> 30 days)
- Sessions too short (< 5 seconds)
- Sessions too long (> 12 hours)

## Server-Side Validation

### Required Checks (implement in API)

```typescript
// 1. Verify device consistency
// A user's deviceId should be consistent across syncs
// If it changes, flag for review

// 2. Validate event signatures
async function validateSignedEvent(event: SignedEvent, deviceKey: string): boolean {
  const { signature, ...payload } = event;
  const expectedSig = createHmac('sha256', deviceKey)
    .update(JSON.stringify(payload, Object.keys(payload).sort()))
    .digest('hex');
  return signature === expectedSig;
}

// 3. Rate limiting
// - Max 16 hours per day
// - Max 10 sessions per hour
// - Max 60 interactions per minute

// 4. Statistical anomaly detection
// - Sudden jumps in hours (> 100h in a week)
// - Unusual tool distribution
// - Sessions at impossible times

// 5. Cross-reference validation
// - Compare signed events count vs reported totals
// - Check timestamp continuity
```

### Trust Levels

| Level | Description | Restrictions |
|-------|-------------|--------------|
| Verified | Consistent device, valid signatures | Full leaderboard access |
| Suspicious | Anomalies detected | Manual review required |
| Untrusted | Invalid signatures | Excluded from leaderboard |

### Device Registration Flow

1. First sync: Server stores `deviceId` + `userId` mapping
2. Subsequent syncs: Verify same `deviceId` for user
3. If `deviceId` changes: Require re-verification (new install)

## API Endpoints

### POST /api/stats/sync

Request:
```json
{
  "totalHours": 10.5,
  "totalSessions": 25,
  "totalInteractions": 500,
  "deviceId": "abc123...",
  "signedEvents": [...],
  "signature": "payload-signature"
}
```

Response:
```json
{
  "success": true,
  "verified": true,
  "trustLevel": "verified",
  "warnings": []
}
```

Or with issues:
```json
{
  "success": true,
  "verified": false,
  "trustLevel": "suspicious",
  "warnings": ["signature_mismatch", "hours_spike"]
}
```

## Migration Strategy

1. **Phase 1**: Accept both signed and unsigned payloads
2. **Phase 2**: Warn users with unsigned payloads
3. **Phase 3**: Require signatures for leaderboard eligibility
4. **Phase 4**: Full enforcement

## Thresholds

```typescript
const THRESHOLDS = {
  maxHoursPerDay: 16,
  maxSessionsPerHour: 10,
  maxInteractionsPerMinute: 60,
  minSessionDuration: 5000, // 5 seconds
  maxSessionDuration: 12 * 60 * 60 * 1000, // 12 hours
  maxTimeDrift: 5 * 60 * 1000, // 5 minutes
  maxWeeklyHoursJump: 100, // Flag if hours increase > 100 in a week
};
```

## Privacy Notes

- Device key never leaves the client
- Server stores only deviceId (hash), not the key
- No PII in signed events
- Users can reset device by deleting `~/.statscode/device.key`
