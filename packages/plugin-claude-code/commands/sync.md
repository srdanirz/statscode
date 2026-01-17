---
description: Sync your local stats to the global leaderboard
---

# Sync Command

Upload your local statistics to appear on the StatsCode global leaderboard.

## Usage

Type `/stats:sync` to sync your stats.

## Requirements

You must be logged in first. Run `/stats:login` if you haven't.

## What Gets Synced

| Data | Synced |
|------|--------|
| Total hours | Yes |
| Session count | Yes |
| Tool breakdown | Yes |
| Earned badges | Yes |
| Your code | **Never** |
| Your prompts | **Never** |
| File names | **Never** |

## Output

```
Syncing stats to StatsCode...

Uploaded:
- 127.5 hours (+2.3h since last sync)
- 89 sessions
- 5 badges

Your rank: #142 globally

View your profile: statscode.dev/profile/YOUR_USERNAME
```

## Auto-Sync

To enable automatic syncing after each session, add to your config:

```json
// ~/.statscode/config.json
{
  "autoSync": true
}
```
