# StatsCode - Implementation Plan & Architecture
> Complete context document for implementing real-time features, auto-sync, and notifications

**Last Updated:** 2026-01-20
**Status:** Phase 1 Ready to Start

---

## 📁 REPOSITORY STRUCTURE

```
Desktop/
├── statscode/                    # Main monorepo (PUBLIC)
│   ├── packages/
│   │   ├── core/                # Tracking engine (SQLite)
│   │   ├── badges/              # 50+ badge definitions
│   │   ├── api-client/          # SDK for backend API
│   │   └── plugin-claude-code/  # Claude Code integration
│   └── ~/.statscode/            # User data
│       ├── stats.sqlite         # Local stats database
│       └── config.json          # User config (token, settings)
│
└── statscode-cloud/             # Backend + Frontend (PRIVATE)
    ├── api/                     # Express + Firestore backend
    │   └── src/
    │       ├── routes/          # Auth, stats, leaderboard, tips
    │       ├── services/        # AI, Firestore, knowledge base
    │       └── middleware/      # Auth, error handling
    └── web/                     # Next.js 16 + React 19
        ├── app/                 # Pages (profile, leaderboard, badges)
        ├── components/          # UI components
        └── lib/                 # Utilities, types
```

---

## 🏗️ CURRENT ARCHITECTURE

### Data Flow

```
User codes with Claude Code
    ↓
Hooks track interactions → LOCAL: ~/.statscode/stats.sqlite
    ↓
SessionEnd hook (manual /statscode:force-sync)
    ↓
POST /api/stats/sync (with JWT token)
    ↓
Backend updates Firestore (users, stats, syncs collections)
    ↓
statscode.dev fetches from Firestore
    ↓
Public profile visible at statscode.dev/@username
```

### Authentication Flow

```
1. User runs: /statscode:login
2. Opens browser → api.statscode.dev/api/auth/github
3. GitHub OAuth → callback with code
4. Backend exchanges code for GitHub access_token
5. Backend creates/updates user in Firestore
6. Backend generates JWT (30 days expiration)
7. Redirects to: statscode.dev/auth/success?token=JWT
8. Token saved to:
   - Frontend: localStorage
   - Plugin: ~/.statscode/config.json
9. All future API calls use: Authorization: Bearer <JWT>
```

---

## ✅ WHAT EXISTS (IMPLEMENTED)

### Backend (`statscode-cloud/api/`)

| Feature | Endpoint | Status | File |
|---------|----------|--------|------|
| GitHub OAuth | `GET /api/auth/github` | ✅ | `routes/auth.ts` |
| OAuth Callback | `GET /api/auth/callback` | ✅ | `routes/auth.ts` |
| Token Validation | `POST /api/auth/token` | ✅ | `routes/auth.ts` |
| Sync Stats | `POST /api/stats/sync` | ✅ | `routes/stats.ts` |
| Get My Stats | `GET /api/stats/me` | ✅ | `routes/stats.ts` |
| Leaderboard | `GET /api/leaderboard` | ✅ | `routes/leaderboard.ts` |
| Public Profile | `GET /api/users/:username` | ✅ | `routes/users.ts` |
| Dynamic Badge | `GET /badge/:username.svg` | ✅ | `routes/badge.ts` |
| AI Tips | `GET /api/tips?tool=X` | ✅ | `routes/tips.ts` |

**Database:** Firestore
- `users/{userId}` - GitHub profile, lastLogin
- `stats/{userId}` - Hours, sessions, badges, score
- `syncs/{syncId}` - Audit log of sync events

**AI Tips:**
- Rule-based (fast): 25+ anti-patterns
- AI-based (LLM): Azure OpenAI GPT-4o-mini
- Knowledge base: Tool-specific best practices

### Frontend (`statscode-cloud/web/`)

| Page | Route | Status | File |
|------|-------|--------|------|
| Homepage | `/` | ✅ | `app/page.tsx` |
| Leaderboard | `/leaderboard` | ✅ | `app/leaderboard/page.tsx` |
| Profile | `/profile/[username]` | ⚠️ MOCK DATA | `app/profile/[username]/page.tsx` |
| Badges | `/badges` | ✅ | `app/badges/page.tsx` |
| Auth Success | `/auth/success` | ✅ | `app/auth/success/page.tsx` |

**Components:**
- Navbar with GitHub login
- Badge showcase (13 badges)
- Stats cards
- Tool breakdown
- Activity heatmap (placeholder)

### Plugin (`statscode/packages/plugin-claude-code/`)

| Command | Status | File |
|---------|--------|------|
| `/statscode:login` | ✅ | `commands/login.md` |
| `/statscode:stats` | ✅ | `commands/stats.md` + `scripts/stats.mjs` |
| `/statscode:force-sync` | ✅ | `commands/sync.md` |
| `/statscode:badge` | ✅ | `commands/badge.md` |
| `/statscode:export` | ✅ | `commands/export.md` |

**Hooks:**
- `PreToolUse`, `PostToolUse` - Track tool usage
- `UserPromptSubmit` - Track prompts
- `SessionStart`, `SessionEnd` - Session lifecycle

**Local Tracking:**
- Database: `~/.statscode/stats.sqlite`
- Config: `~/.statscode/config.json`
- Activity-based hours calculation (5min threshold)

---

## ❌ WHAT'S MISSING (TO IMPLEMENT)

### Critical (Phase 1)

1. **Profile Page Real Data**
   - Current: Uses MOCK_DATA hardcoded
   - Needed: Fetch from `/api/users/:username`
   - Complexity: LOW (1 hour)
   - Impact: HIGH

2. **Auto-Sync Post-Session**
   - Current: Manual `/statscode:force-sync` required
   - Needed: Auto-sync in `SessionEnd` hook
   - Complexity: MEDIUM (3 hours)
   - Impact: HIGH

3. **Refresh Token / Auto-Renew**
   - Current: 30-day JWT expires, manual re-auth
   - Needed: Background token refresh
   - Complexity: MEDIUM (4 hours)
   - Impact: MEDIUM

### Important (Phase 2)

4. **Tips in Real-Time**
   - Current: Tips only in `/stats` command
   - Needed: Toast notification post-session
   - Complexity: MEDIUM (3 hours)
   - Impact: HIGH

5. **Badge Notifications**
   - Current: No notification when earning badge
   - Needed: Toast + sync when badge unlocked
   - Complexity: HIGH (8 hours)
   - Impact: HIGH

6. **Real-time Updates**
   - Current: Static data, manual refresh
   - Needed: WebSocket/SSE for live updates
   - Complexity: HIGH (12 hours)
   - Impact: MEDIUM

---

## 🎯 IMPLEMENTATION PLAN

### Phase 1: Zero Friction Basics (8 hours)

#### 1.1 Profile Page Real Data (1 hour)

**File:** `statscode-cloud/web/app/profile/[username]/page.tsx`

**Changes:**
```typescript
// BEFORE (lines 15-60)
const MOCK_DATA = { ... }

// AFTER
const response = await fetch(`${API_URL}/api/users/${username}`);
const userData = await response.json();
```

**Testing:**
- Visit `/profile/srdanirz` → should show real data from Firestore
- Verify stats, badges, activity are accurate

---

#### 1.2 Auto-Sync Post-Session (3 hours)

**Files:**
- `statscode/packages/plugin-claude-code/hooks/index.ts`
- `statscode/packages/core/src/tracker.ts`

**Changes:**

**Step 1:** Add auto-sync to `SessionEnd` hook

```typescript
// hooks/index.ts - Stop() function
export async function Stop(): Promise<void> {
    if (!statsCode) return;

    const tracker = statsCode.getTracker();
    tracker.endSession();

    // NEW: Auto-sync if configured
    const config = await loadConfig();
    if (config.token && config.autoSync !== false) {
        try {
            await syncToCloud(config.token);
            console.log('✅ Stats synced automatically');
        } catch (error) {
            console.log('⚠️  Sync failed (will retry next session)');
        }
    }

    statsCode.close();
    statsCode = null;
}
```

**Step 2:** Create `syncToCloud()` helper

```typescript
// hooks/auto-sync.ts - NEW FILE
import { StatsCodeClient } from '@statscode/api-client';
import { getStatsCode } from './index.js';

export async function syncToCloud(token: string): Promise<void> {
    const sc = await getStatsCode();
    const stats = sc.getStats();
    const badges = sc.getBadges();

    const apiClient = new StatsCodeClient(token);
    await apiClient.sync({
        totalHours: stats.totalHours,
        totalSessions: stats.totalSessions,
        totalInteractions: stats.totalInteractions,
        byTool: stats.byTool,
        badges: badges.map(b => b.id),
        score: stats.score
    });
}
```

**Step 3:** Update config default

```typescript
// core/src/tracker.ts
DEFAULT_CONFIG = {
    autoSync: true  // Changed from false
}
```

**Testing:**
- Use Claude Code for 5 min
- Close/stop session
- Check console for "✅ Stats synced"
- Visit statscode.dev/@username → verify updated

---

#### 1.3 Refresh Token / Auto-Renew (4 hours)

**Files:**
- `statscode-cloud/api/src/routes/auth.ts`
- `statscode/packages/plugin-claude-code/hooks/index.ts`

**Changes:**

**Step 1:** Add refresh token endpoint

```typescript
// api/src/routes/auth.ts
router.post('/refresh', async (req: Request, res: Response) => {
    const { token } = req.body;

    try {
        const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
        const userRef = db.collection('users').doc(decoded.userId);
        const user = await userRef.get();

        if (!user.exists) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Generate new token
        const newToken = jwt.sign(
            { userId: decoded.userId, username: decoded.username },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({ token: newToken });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});
```

**Step 2:** Add token validation in hooks

```typescript
// hooks/index.ts - SessionStart()
async function SessionStart() {
    const config = await loadConfig();

    if (config.token) {
        // Check if token is valid
        const isValid = await validateToken(config.token);

        if (!isValid) {
            // Try to refresh
            const newToken = await refreshToken(config.token);
            if (newToken) {
                await saveConfig({ ...config, token: newToken });
                console.log('🔄 Token refreshed automatically');
            } else {
                console.log('🔐 Session expired. Please re-login: /statscode:login');
            }
        }
    }
}
```

**Testing:**
- Wait for token near expiration (or manually expire)
- Start new session
- Verify auto-refresh works
- Check `~/.statscode/config.json` has new token

---

### Phase 2: Real-Time Experience (11 hours)

#### 2.1 Tips in Real-Time (3 hours)

**Files:**
- `statscode/packages/plugin-claude-code/hooks/index.ts`
- `statscode/packages/plugin-claude-code/hooks/prompt-analyzer.ts` (NEW)

**Implementation:**

```typescript
// hooks/prompt-analyzer.ts - NEW FILE
export function analyzePrompt(prompt: string) {
    return {
        isTooShort: prompt.length < 20,
        isVague: !hasSpecificKeywords(prompt),
        hasContext: prompt.includes('@') || prompt.includes('/'),
        complexity: calculateComplexity(prompt)
    };
}

function hasSpecificKeywords(prompt: string): boolean {
    const specificWords = [
        'typescript', 'react', 'python', 'function', 'class',
        'api', 'database', 'test', 'fix', 'refactor'
    ];
    return specificWords.some(word => prompt.toLowerCase().includes(word));
}

// hooks/index.ts - OnPrompt()
export async function OnPrompt(params: { prompt: string }) {
    const analysis = analyzePrompt(params.prompt);

    if (analysis.isTooShort) {
        console.log('\n💡 Tip: Be more specific for better results!');
        console.log('   Try adding context like file paths or requirements\n');
    }

    if (analysis.isVague) {
        console.log('\n💡 Tip: Vague prompts often need multiple iterations');
        console.log('   Example: "Create a React app with TypeScript" vs "create app"\n');
    }

    // ... existing code
}
```

**Testing:**
- Type vague prompt: "create app"
- See tip appear immediately
- Type specific prompt: "Create a Next.js app with TypeScript and Tailwind"
- No tip should appear

---

#### 2.2 Badge Notifications (8 hours)

**Files:**
- `statscode/packages/plugin-claude-code/hooks/index.ts`
- `statscode/packages/plugin-claude-code/hooks/badge-notifier.ts` (NEW)
- `statscode/packages/core/src/database.ts`

**Implementation:**

**Step 1:** Add notified_badges table

```typescript
// core/src/database.ts
async function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS notified_badges (
            badge_id TEXT PRIMARY KEY,
            notified_at INTEGER NOT NULL
        )
    `);
}
```

**Step 2:** Create badge notifier

```typescript
// hooks/badge-notifier.ts - NEW FILE
import { Badge } from '@statscode/badges';

const notifiedBadges = new Set<string>();

export async function checkForNewBadges(stats: UserStats): Promise<Badge[]> {
    const allBadges = getAllBadges();
    const earnedBadges = [];

    for (const badge of allBadges) {
        const earned = checkBadge(badge, stats);
        if (earned && !notifiedBadges.has(badge.id)) {
            earnedBadges.push(badge);
            notifiedBadges.add(badge.id);
        }
    }

    return earnedBadges;
}

export async function notifyBadge(badge: Badge, username: string) {
    console.log(`\n🏆 NEW BADGE UNLOCKED! ${badge.emoji} ${badge.name}`);
    console.log(`   ${badge.description}`);
    console.log(`   View at: https://statscode.dev/@${username}\n`);
}
```

**Step 3:** Check badges after each interaction

```typescript
// hooks/index.ts - PostToolUse()
export async function PostToolUse(params) {
    // ... existing code ...

    // Check for new badges
    const stats = statsCode.getStats();
    const newBadges = await checkForNewBadges(stats);

    if (newBadges.length > 0) {
        for (const badge of newBadges) {
            await notifyBadge(badge, getUsername());
            await markBadgeAsNotified(badge.id);
        }

        // Auto-sync to cloud
        await syncToCloud(config.token);
    }
}
```

**Testing:**
- Code until you earn a badge (e.g., 10h = Time Lord Bronze)
- See notification immediately
- Visit profile → badge appears
- Close session, reopen → no duplicate notification

---

## 📝 KEY FILES REFERENCE

### Backend (`statscode-cloud/api/src/`)

```
routes/
  auth.ts              # OAuth flow, JWT generation
  stats.ts             # Sync endpoint, get stats
  users.ts             # Public profiles
  leaderboard.ts       # Top 50 users
  tips.ts              # AI coaching
  badge.ts             # Dynamic SVG badges

services/
  firestore.ts         # Firestore connection
  ai.ts                # Azure OpenAI integration
  knowledge.ts         # Tool best practices

middleware/
  auth.ts              # JWT validation
  error.ts             # Error handling
```

### Frontend (`statscode-cloud/web/`)

```
app/
  page.tsx                      # Homepage
  leaderboard/page.tsx          # Leaderboard
  profile/[username]/page.tsx   # Profile (TO FIX)
  badges/page.tsx               # All badges
  auth/success/page.tsx         # OAuth callback

lib/
  badges.ts                     # Badge definitions
```

### Plugin (`statscode/packages/plugin-claude-code/`)

```
hooks/
  index.ts             # Session hooks (TO MODIFY)
  hooks.json           # Hook configuration

commands/
  stats.md             # /stats command
  login.md             # /statscode:login
  sync.md              # /statscode:force-sync
  badge.md             # /statscode:badge

scripts/
  stats.mjs            # Stats display CLI
```

### Core (`statscode/packages/`)

```
core/src/
  tracker.ts           # Session tracking
  database.ts          # SQLite management (TO MODIFY)
  analyzer.ts          # Stats calculation
  types.ts             # TypeScript types

badges/src/
  definitions.ts       # 50+ badge definitions
  checker.ts           # Badge evaluation

api-client/src/
  client.ts            # StatsCodeClient SDK
```

---

## 🔧 ENVIRONMENT VARIABLES

### Backend (`.env`)

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# JWT
JWT_SECRET=your_jwt_secret_key

# URLs
API_URL=https://api.statscode.dev
CORS_ORIGIN=https://statscode.dev

# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
FIRESTORE_EMULATOR_HOST=localhost:8080  # Dev only

# Azure OpenAI (for tips)
AZURE_OPENAI_ENDPOINT=https://...openai.azure.com/
AZURE_OPENAI_KEY=your_key
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
```

### Frontend (`.env.local`)

```bash
NEXT_PUBLIC_API_URL=https://api.statscode.dev
```

---

## 🧪 TESTING CHECKLIST

### Phase 1

- [ ] Profile page shows real data from Firestore
- [ ] Auto-sync works after session ends
- [ ] Token refreshes automatically when near expiration
- [ ] Stats appear on statscode.dev within seconds
- [ ] No manual `/statscode:force-sync` required

### Phase 2

- [ ] Tips appear immediately after vague prompts
- [ ] Badge notification shows when earned
- [ ] Badge appears on profile instantly
- [ ] No duplicate notifications on restart
- [ ] Tips are contextual and helpful

---

## 📊 SUCCESS METRICS

**Before (Current):**
- Manual sync required: `/statscode:force-sync`
- Profile data: Mock/hardcoded
- Tips: Only in `/stats` command
- Badges: No notifications
- Token: Manual re-auth every 30 days

**After (Phase 1+2):**
- ✅ Zero-friction sync (automatic)
- ✅ Real-time profiles (instant updates)
- ✅ Contextual tips (while coding)
- ✅ Badge celebrations (instant notifications)
- ✅ Never re-auth (auto-refresh)

---

## 🚀 NEXT STEPS

1. Start with **Phase 1.1** (Profile real data) - 1 hour
2. Then **Phase 1.2** (Auto-sync) - 3 hours
3. Then **Phase 1.3** (Refresh token) - 4 hours
4. Test thoroughly
5. Deploy to production
6. Monitor for issues
7. Start Phase 2

---

## 💡 NOTES

- All times are estimates for experienced developer
- Test locally first, then staging, then production
- Keep backward compatibility (users on old versions)
- Monitor error rates in production
- Gather user feedback after each phase

---

**Document Version:** 1.0
**Author:** Claude Code
**Date:** 2026-01-20
