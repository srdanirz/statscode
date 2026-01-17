# StatsCode

Open source library to track, analyze, and certify your AI coding assistant usage.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@statscode/core.svg)](https://www.npmjs.com/package/@statscode/core)

## What is StatsCode?

StatsCode tracks how you use AI coding assistants like Claude Code, Cursor, Codex, and more. Think of it as **GitHub stats for AI-assisted coding**.

- **Track hours** spent coding with AI
- **Earn badges** based on your coding style
- **Appear on the leaderboard** at statscode.dev
- **Add a badge to your GitHub profile**

## Quick Start

### For Claude Code

```bash
# Install the plugin
cd ~/.claude/plugins
git clone https://github.com/srdanirz/statscode

# Use the commands:
# /stats        - View your local statistics
# /stats:login  - Connect to leaderboard (optional)
# /stats:sync   - Upload stats to cloud
# /stats:badge  - Get badge for your README
```

### For Other Tools

```bash
npm install @statscode/core @statscode/plugin-cursor
# or
npm install @statscode/core @statscode/plugin-codex
```

```typescript
import { StatsCode } from '@statscode/core';
import { createCursorPlugin } from '@statscode/plugin-cursor';

const stats = new StatsCode();
await stats.ready();

// Start tracking
stats.startSession('cursor');
// ... your coding session ...
stats.endSession();

// View stats
console.log(stats.getStats());
```

## Add Badge to Your GitHub Profile

```markdown
[![StatsCode](https://api.statscode.dev/badge/YOUR_USERNAME.svg)](https://statscode.dev/profile/YOUR_USERNAME)
```

## Packages

| Package | Description |
|---------|-------------|
| `@statscode/core` | Core tracking library |
| `@statscode/badges` | Badge definitions and checker |
| `@statscode/api-client` | SDK for cloud sync |
| `@statscode/plugin-claude-code` | Claude Code integration |
| `@statscode/plugin-cursor` | Cursor IDE integration |
| `@statscode/plugin-codex` | OpenAI Codex CLI integration |
| `@statscode/plugin-antigravity` | Antigravity integration |
| `@statscode/plugin-opencode` | OpenCode integration |

## Badges

Earn badges based on your coding patterns:

| Badge | Description |
|-------|-------------|
| Claude Whisperer | 10+ hours with Claude Code |
| Cursor Master | 10+ hours with Cursor |
| Night Owl | Codes late at night |
| Speed Runner | Fast task completion |
| Time Lord | 1000+ total hours |
| Early Adopter | Among first 1000 users |

## Privacy

- All data is stored **locally** by default
- Cloud sync is **opt-in** only
- No code or prompts are ever uploaded
- Only aggregated stats are synced

## Development

```bash
git clone https://github.com/srdanirz/statscode
cd statscode
npm install
npm run build
npm test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
