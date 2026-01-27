---
description: View your coding patterns and session insights
allowed-tools: Bash(node:*)
---

# StatsCode Session Insights

Aggregated insights from your Claude Code sessions - strengths, improvements, and trends.

## Your Patterns

!`node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/insights.mjs" 2>&1 || echo "No insights yet - keep coding!"`

## How It Works

Insights are captured when your context compacts (manually via `/compact` or automatically).
Each session is analyzed for:

- **Prompt Quality**: Contextual vs vague prompts
- **Error Patterns**: Frequency and types of errors
- **Tool Usage**: Which tools you use most
- **Workflow Patterns**: Short prompts in a row, retry loops

The more you code, the more accurate your insights become!
