# StatsCode

Track your AI coding hours, patterns, and achievements.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is StatsCode?

StatsCode tracks how you use AI coding assistants. Think of it as **GitHub stats for AI-assisted coding**.

- **Track hours** spent coding with AI
- **View insights** about your coding patterns
- **Sync to cloud** and appear on the leaderboard
- **Add a badge** to your GitHub profile

## Quick Start (Claude Code)

```bash
# Install via marketplace
claude plugins install statscode

# Or manually
cd ~/.claude/plugins
git clone https://github.com/srdanirz/statscode
```

### Commands

| Command | Description |
|---------|-------------|
| `/statscode:stats` | View your coding statistics |
| `/statscode:insights` | View session patterns |
| `/statscode:login` | Login with GitHub |
| `/statscode:badge` | Get badge for your profile |

## What's Tracked

- **Active Hours** - Time spent coding (activity-based)
- **Sessions** - Number of sessions
- **Prompts** - Total prompts sent
- **Lines Generated** - Code written/edited
- **Languages** - Programming languages used

## Add Badge to GitHub Profile

After logging in with `/statscode:login`:

```markdown
[![StatsCode](https://api.statscode.dev/badge/YOUR_USERNAME.svg)](https://statscode.dev/profile/YOUR_USERNAME)
```

## Packages

| Package | Description |
|---------|-------------|
| `@statscode/core` | Core tracking library |
| `@statscode/api-client` | Cloud sync SDK |
| `@statscode/plugin-claude-code` | Claude Code plugin |

## Privacy

- All data stored **locally** by default (`~/.statscode/`)
- Cloud sync is **opt-in** only
- No code or prompts uploaded
- Only aggregated stats synced

## Development

```bash
git clone https://github.com/srdanirz/statscode
cd statscode
npm install
npm run build
```

## License

MIT
