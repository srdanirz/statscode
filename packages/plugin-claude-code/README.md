# StatsCode Plugin for Claude Code

Track your AI coding stats, hours, patterns, and achievements directly in Claude Code.

## Installation

Install via Claude Code plugin marketplace or manually:

```bash
claude plugins install statscode
```

## Commands

| Command | Description |
|---------|-------------|
| `/statscode:stats` | View your coding statistics |
| `/statscode:insights` | View session patterns and insights |
| `/statscode:login` | Login with GitHub to sync to cloud |
| `/statscode:badge` | Get a badge for your GitHub profile |
| `/statscode:force-sync` | Force sync stats to cloud |
| `/statscode:export` | Export stats as JSON |

## What's Tracked

- **Active Hours** - Time spent coding (activity-based, not wall clock)
- **Sessions** - Number of Claude Code sessions
- **Prompts** - Total prompts sent
- **Lines Generated** - Lines of code written/edited
- **Languages** - Programming languages used
- **Tool Usage** - Which tools you use most

## How It Works

StatsCode uses Claude Code hooks to track activity:

- `SessionStart` - Creates a new session
- `UserPromptSubmit` - Records each prompt
- `PreToolUse/PostToolUse` - Tracks tool usage and code edits
- `PreCompact` - Generates session insights before context compaction
- `Stop` - Syncs stats to cloud (if logged in)

All data is stored locally in `~/.statscode/stats.sqlite`.

## Cloud Sync

Login with GitHub to sync stats to the cloud leaderboard:

```
/statscode:login
```

Stats sync automatically after each session. View the global leaderboard at [statscode.dev](https://statscode.dev).

## Local Data

- `~/.statscode/stats.sqlite` - Local stats database
- `~/.statscode/config.json` - Auth token and settings
- `~/.statscode/insights/` - Session insights/debriefs
- `~/.statscode/current_session.json` - Current session state

## Development

```bash
# Build
npm run build

# Build outputs to dist/ which is deployed as .claude-plugin/
```

## License

MIT
