---
description: Force an immediate sync to the cloud (normally automatic)
allowed-tools: Bash(node:*)
---

# Force Sync Stats

!`node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/force-sync.mjs" 2>&1`

---

> ⚠️ **Note:** Stats sync automatically every 5 minutes and when your session ends. This command is only needed for troubleshooting or forcing an immediate upload.

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
