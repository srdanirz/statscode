---
description: View your AI coding statistics and achievements
allowed-tools: Bash(node:*)
---

# StatsCode Stats

View your local coding statistics tracked by StatsCode.

## Your Current Stats

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/stats.mjs" 2>&1 || echo "Run more sessions to see stats!"`

## Tips

- Your stats are saved locally in `~/.statscode/stats.sqlite`
- Use `/statscode:sync` to upload to the global leaderboard
- Use `/statscode:badge` to get a badge for your GitHub profile
