# API Update v0.3.5 - Languages & LOC Tracking

## Overview

StatsCode v0.3.5 adds tracking for programming languages used and lines of code generated. This document describes the changes needed in the backend API and frontend to support these new metrics.

## Changes to API Types

### Updated `SyncPayload` Interface

```typescript
interface SyncPayload {
    totalHours: number;
    totalSessions: number;
    totalInteractions: number;
    totalLinesGenerated?: number;          // NEW
    byTool: Record<string, ToolStats>;
    byLanguage?: Record<string, number>;   // NEW
    badges: string[];
    score: number;
}
```

### Updated `UserStats` Interface

```typescript
interface UserStats {
    totalHours: number;
    totalSessions: number;
    totalInteractions: number;
    totalLinesGenerated?: number;          // NEW
    score: number;
    byTool: Record<string, ToolStats>;
    byLanguage?: Record<string, number>;   // NEW
    badges: string[];
}
```

## New Fields

### `totalLinesGenerated` (optional number)

- **Description**: Total number of lines of code generated through Edit/Write operations
- **Source**: Counted from `new_string` (Edit) or `content` (Write) parameters
- **Example**: `1234` (lines)
- **Format**: Integer
- **Null handling**: Field is omitted if no code generation has occurred yet

### `byLanguage` (optional Record<string, number>)

- **Description**: File edit counts grouped by programming language
- **Source**: Detected from file extensions in Edit/Write operations
- **Example**:
  ```json
  {
    "TypeScript": 45,
    "JavaScript": 23,
    "Python": 12,
    "YAML": 8,
    "Markdown": 5
  }
  ```
- **Supported Languages**: 50+ languages including:
  - TypeScript, JavaScript, Python, Rust, Go, Java, Kotlin, Scala
  - Elixir, Erlang, C, C++, C#, Ruby, PHP, Swift
  - Jupyter, R, Julia (data science)
  - HTML, CSS, Vue, Svelte, Astro (frontend)
  - Terraform, Docker, YAML, JSON (config/infra)
  - And many more...
- **Language Detection**:
  - By extension: `.ts` → TypeScript, `.py` → Python, etc.
  - By filename: `Dockerfile` → Docker, `Makefile` → Make, `.env*` → Env
- **Null handling**: Field is omitted if no file operations have occurred yet

## Backend Changes Required

### 1. Update Firestore Schema

Add new fields to the `stats/{userId}` document:

```typescript
interface FirestoreUserStats {
    // ... existing fields ...
    totalLinesGenerated?: number;
    byLanguage?: Record<string, number>;
}
```

### 2. Update `/api/stats/sync` Endpoint

The sync endpoint should now:
1. Accept the new optional fields in the request body
2. Store `totalLinesGenerated` if present
3. Store `byLanguage` if present
4. Merge language counts (if implementing incremental sync)

Example request body:
```json
{
    "totalHours": 1.49,
    "totalSessions": 226,
    "totalInteractions": 219,
    "totalLinesGenerated": 1234,
    "byTool": {
        "claude-code": {
            "hours": 1.49,
            "sessions": 226
        }
    },
    "byLanguage": {
        "TypeScript": 45,
        "JavaScript": 23,
        "Python": 12
    },
    "badges": [],
    "score": 2.1
}
```

### 3. Update `/api/users/:username` Endpoint

The public profile endpoint should return the new fields:

```json
{
    "user": {
        "username": "srdanirz",
        "name": "Daniel Ramirez",
        "avatar": "https://...",
        "rank": 1
    },
    "stats": {
        "totalHours": 1.49,
        "totalSessions": 226,
        "totalInteractions": 219,
        "totalLinesGenerated": 1234,
        "score": 2.1,
        "byTool": { ... },
        "byLanguage": {
            "TypeScript": 45,
            "JavaScript": 23,
            "Python": 12
        },
        "badges": []
    }
}
```

## Frontend Changes Required

### Profile Page Updates

Add two new sections to the user profile page at `statscode.dev/@username`:

#### 1. Lines Generated Metric

Display prominently near other key metrics:

```tsx
<div className="stat">
    <div className="stat-label">Lines Generated</div>
    <div className="stat-value">{stats.totalLinesGenerated?.toLocaleString() || '0'}</div>
</div>
```

#### 2. Top Languages Section

Display as a list or chart showing the top 5 languages:

```tsx
{stats.byLanguage && (
    <div className="languages-section">
        <h3>💻 Top Languages</h3>
        <ul>
            {Object.entries(stats.byLanguage)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([lang, count]) => (
                    <li key={lang}>
                        <span className="lang-name">{lang}</span>
                        <span className="lang-count">{count} files</span>
                    </li>
                ))}
        </ul>
    </div>
)}
```

### UI/UX Recommendations

1. **Placement**: Add Languages section after "Tools Used" and before "Badges"
2. **Lines Generated**: Display next to "Sessions" in the stats summary
3. **Visual Treatment**: Use language-specific colors if available (e.g., blue for TypeScript, yellow for JavaScript)
4. **Empty State**: Show "Start coding to see your language breakdown" when no data exists

## Migration Notes

- **Backwards Compatible**: All new fields are optional, so existing users without data will continue to work
- **No Data Loss**: Users who haven't upgraded to v0.3.5 will simply not send these fields
- **Incremental Adoption**: Users will see data populate as they use v0.3.5+

## Testing

### Test Scenarios

1. **New User**: User with v0.3.5 plugin should see languages and LOC from first session
2. **Existing User**: User upgrading from v0.3.4 should see fields populate after first v0.3.5 session
3. **Empty State**: User who hasn't coded yet should see graceful empty states
4. **Large Numbers**: Test with users who have 10,000+ lines generated
5. **Many Languages**: Test with users using 20+ different languages

### Test Payload

```bash
curl -X POST https://api.statscode.dev/api/stats/sync \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "totalHours": 1.5,
    "totalSessions": 10,
    "totalInteractions": 50,
    "totalLinesGenerated": 1234,
    "byTool": {
        "claude-code": { "hours": 1.5, "sessions": 10 }
    },
    "byLanguage": {
        "TypeScript": 15,
        "Python": 8,
        "YAML": 2
    },
    "badges": [],
    "score": 1.2
}'
```

## Rollout Plan

1. ✅ **Phase 1**: Update plugin (v0.3.5) - COMPLETED
2. ⏳ **Phase 2**: Update backend API to accept new fields
3. ⏳ **Phase 3**: Update frontend to display new metrics
4. ⏳ **Phase 4**: Announce feature to users

## Questions?

Contact: @srdanirz on GitHub
