---
description: Login to StatsCode cloud to sync and appear on leaderboard
---

# Login Command

Authenticate with StatsCode to sync your stats to the cloud leaderboard.

## Usage

Run this command to open browser and login with GitHub.

## Flow

1. Opens browser to StatsCode OAuth page
2. Login with GitHub
3. Receive authentication token
4. Token saved to ~/.statscode/config.json

## After Login

- Run `/stats:sync` to upload your local stats
- Your profile will appear on statscode.dev/profile/[username]
- You'll be ranked on the global leaderboard
