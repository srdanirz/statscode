# StatsCode Plugin Release Checklist

This document outlines the steps required to release a new version of the StatsCode plugin.

## Version Files to Update

When releasing a new version, update ALL of these files:

1. **`packages/plugin-claude-code/package.json`** - Main package version
2. **`packages/plugin-claude-code/.claude-plugin/plugin.json`** - Plugin manifest version
3. **`.claude-plugin/marketplace.json`** - Marketplace listing version

All three must have the **same version number**.

## plugin.json Structure

The `plugin.json` file MUST include hooks configuration for tracking to work:

```json
{
    "name": "statscode",
    "version": "X.Y.Z",
    "description": "...",
    "author": { "name": "..." },
    "homepage": "https://statscode.dev",
    "commands": "./commands",
    "hooks": {
        "PreToolUse": [
            {
                "command": "node ./dist/hooks/index.js PreToolUse",
                "timeout": 5000
            }
        ],
        "PostToolUse": [
            {
                "command": "node ./dist/hooks/index.js PostToolUse",
                "timeout": 5000
            }
        ],
        "SessionStart": [
            {
                "command": "node ./dist/hooks/index.js SessionStart",
                "timeout": 5000
            }
        ],
        "SessionEnd": [
            {
                "command": "node ./dist/hooks/index.js SessionEnd",
                "timeout": 10000
            }
        ]
    }
}
```

**IMPORTANT**: Without the `hooks` section, Claude Code will NOT execute the tracking hooks and no data will be recorded!

## Release Steps

### 1. Update Version Numbers

```bash
# Update all version files
# packages/plugin-claude-code/package.json
# packages/plugin-claude-code/.claude-plugin/plugin.json
# .claude-plugin/marketplace.json
```

### 2. Build the Plugin

```bash
cd packages/plugin-claude-code
npm run build
```

### 3. Verify Build Output

Ensure these files exist:
- `dist/hooks/index.js` - Main hooks bundle
- `dist/hooks/sql-wasm.wasm` - SQLite WASM binary

### 4. Commit and Push

```bash
git add -A
git commit -m "chore: bump version to X.Y.Z"
git push
```

### 5. Update Local Marketplace (for testing)

After pushing, update your local marketplace cache:

```bash
cd ~/.claude/plugins/marketplaces/statscode
git pull origin main
```

### 6. Reinstall Plugin

```bash
/plugin uninstall statscode@statscode
/plugin install statscode@statscode
```

### 7. Restart Claude Code

Hooks only activate after restarting Claude Code.

## Troubleshooting

### Plugin shows old version in marketplace

The marketplace reads from `.claude-plugin/marketplace.json`. Update this file and pull in the local marketplace folder:

```bash
cd ~/.claude/plugins/marketplaces/statscode
git pull origin main
```

### Hooks not running (no data being tracked)

1. Check `plugin.json` has the `hooks` section
2. Verify `dist/hooks/index.js` exists
3. Restart Claude Code after reinstalling
4. Check the database has recent data:

```bash
sqlite3 ~/.statscode/stats.sqlite "SELECT COUNT(*) FROM interactions WHERE timestamp > strftime('%s', 'now', '-1 hour') * 1000"
```

### Lines Generated showing 0

The `linesGenerated` tracking was added in v0.3.9. Historical data won't have this field. New Edit/Write operations will be tracked.

## Key Paths

| Path | Description |
|------|-------------|
| `~/.statscode/stats.sqlite` | Local stats database |
| `~/.statscode/config.json` | User config (token, settings) |
| `~/.claude/plugins/installed_plugins.json` | Installed plugins list |
| `~/.claude/plugins/marketplaces/statscode/` | Local marketplace cache |

## Database Schema

The `interactions` table stores:
- `tool_name` - Tool used (Edit, Write, Read, etc.)
- `metadata` - JSON with `filePath`, `linesGenerated`, etc.
- `timestamp` - Unix timestamp in milliseconds

Check recent tracking:
```bash
sqlite3 ~/.statscode/stats.sqlite "SELECT tool_name, metadata FROM interactions ORDER BY timestamp DESC LIMIT 5"
```
