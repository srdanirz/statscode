# @statscode/plugin-opencode

StatsCode plugin for [OpenCode](https://opencode.ai/) - Track your AI coding statistics.

## Installation

### Option 1: npm package (Recommended)

Add to your `opencode.json`:

```json
{
  "plugin": ["@statscode/plugin-opencode"]
}
```

### Option 2: Local installation

Copy the built plugin to your OpenCode plugins directory:

```bash
# Project-level
cp -r dist .opencode/plugins/statscode

# Global
cp -r dist ~/.config/opencode/plugins/statscode
```

## Features

- **Session Tracking**: Automatically tracks coding sessions
- **Tool Usage Stats**: Records all tool executions (edits, writes, etc.)
- **Lines of Code**: Tracks lines added/removed per operation
- **Custom Tools**: Exposes `/statscode.stats`, `/statscode.badge`, `/statscode.sync`

## Hooks Used

This plugin implements the following [OpenCode hooks](https://opencode.ai/docs/plugins/#sistema-de-hooks):

| Hook | Description |
|------|-------------|
| `session.created` | Starts tracking when a new session begins |
| `session.compacted` | Syncs stats before context compaction |
| `session.error` | Records session errors |
| `tool.execute.before` | Records tool usage with metadata |
| `tool.execute.after` | Records tool success/failure |
| `message.updated` | Tracks user prompts |
| `permission.asked` | Tracks permission requests |

## Custom Tools

The plugin exposes these tools to OpenCode:

- `statscode.stats` - View your coding statistics
- `statscode.badge` - Generate a badge SVG for your GitHub profile
- `statscode.sync` - Force sync stats to StatsCode cloud

## Data Storage

Stats are stored locally in `~/.statscode/stats.sqlite`.

## References

- [OpenCode Plugins Documentation](https://opencode.ai/docs/plugins/)
- [OpenCode Hooks System](https://opencode.ai/docs/plugins/#sistema-de-hooks)
- [StatsCode Documentation](https://statscode.dev/docs)

## License

MIT
