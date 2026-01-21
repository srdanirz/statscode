---
description: Force an immediate sync to the cloud (normally automatic)
---

# Force Sync Command

> ⚠️ **Note:** Stats sync automatically every 5 minutes and when your session ends. This command is only needed for troubleshooting or forcing an immediate upload.

## Usage

Type `/statscode:force-sync` to immediately sync your stats.

## Requirements

You must be logged in first. Run `/statscode:login` if you haven't.

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

## When to Use This

- Auto-sync isn't working
- You want to see updated stats immediately on the website
- Debugging sync issues
