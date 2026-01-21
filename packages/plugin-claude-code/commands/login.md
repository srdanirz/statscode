---
description: Login to StatsCode with GitHub to sync your stats
handler: scripts/login.mjs
---

# Login Command

Authenticate with StatsCode using your GitHub account to sync stats and appear on the leaderboard.

## Usage

Type `/statscode:login` to start the authentication flow.

## What Happens

1. A browser window opens to `statscode.dev/auth`
2. You authenticate with GitHub (read-only access)
3. A token is saved locally to `~/.statscode/config.json`
4. You're now connected!

## After Login

Once logged in, you can:

- **Sync stats**: `/statscode:sync` to upload to leaderboard
- **View profile**: Visit `statscode.dev/profile/YOUR_USERNAME`
- **Get badge**: `/statscode:badge` for your README

## Privacy

- We only request read-only access to your GitHub profile
- Your code and prompts are **never** uploaded
- Only aggregated stats (hours, sessions, badges) are synced
- You can delete your data anytime at statscode.dev/settings

## Logout

To logout, delete the config file:
```bash
rm ~/.statscode/config.json
```
